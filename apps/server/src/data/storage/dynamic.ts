import { type StorageInfo, type StorageLoad, sumUp } from '@dashdotplus/common';
import * as si from 'systeminformation';
import { CONFIG } from '../../config';
import { getStaticServerInfo } from '../../static-info';
import { fromHost, PLATFORM_IS_WINDOWS } from '../../utils';

type Block = si.Systeminformation.BlockDevicesData;
type Size = si.Systeminformation.FsSizeData;

// One filesystem can be mounted more than once: a btrfs subvolume exposes `/`
// and `/home` separately, a container bind-mounts `/etc/hostname` on its own,
// and docker's rootfs presents the same partition all over again. Every one of
// those mounts reports the size and used of the *whole* filesystem, so summing
// them counts a single disk repeatedly - enough to claim 93 GiB used on a
// 64 GiB disk, which the dashboard then clamps to a full bar. Size and used
// belong to the filesystem, not to the path it is seen through, so keep the
// first mount of each and let the rest add nothing.
const keepFirstMountPerFilesystem = (sizes: Size[]): Size[] => {
  const seen = new Set<string>();
  return sizes.filter(({ fs }) => {
    if (seen.has(fs)) return false;
    seen.add(fs);
    return true;
  });
};

export class DynamicStorageMapper {
  private validSizes: Size[];

  constructor(
    private hostWin32: boolean,
    private layout: StorageInfo,
    private blocks: Block[],
    private sizes: Size[],
  ) {
    this.validSizes = this.getValidSizes();
  }

  // Setup local values
  private getValidSizes() {
    return this.sizes.filter(
      ({ mount, type }) =>
        (this.hostWin32 || mount.startsWith(fromHost('/'))) &&
        !CONFIG.fs_type_filter.includes(type),
    );
  }

  // Helpers
  private getBlocksForDisks(disks: StorageInfo[number]['disks']) {
    return this.blocks.filter(({ name, device }) =>
      disks.some((d) =>
        this.hostWin32 ? d.device === device : name.startsWith(d.device),
      ),
    );
  }
  private getBlocksForRaid(raidLabel?: string, raidName?: string) {
    return this.blocks.filter(
      ({ label, name }) =>
        (raidLabel && label.startsWith(raidLabel)) ||
        (raidName && name.startsWith(raidName)),
    );
  }
  private getBlocksForXfs(parts: Block[]) {
    return this.blocks.filter(
      ({ uuid, type, fsType }) =>
        type === 'md' &&
        fsType === 'xfs' &&
        parts.some((part) => part.uuid === uuid),
    );
  }

  private isRootMount(mount: string) {
    return (
      !this.hostWin32 &&
      (mount === fromHost('/') || mount.startsWith(fromHost('/boot')))
    );
  }

  // Get size of the mounts of the partitions/disks of device
  private getSizeForBlocks(
    deviceBlocks: Block[],
    diskSize: number,
    isHost: boolean,
  ) {
    const sizes = keepFirstMountPerFilesystem(
      this.validSizes.filter((size) =>
        deviceBlocks.some((block) => {
          const matchedByMount =
            size.mount &&
            (block.mount === size.mount ||
              size.mount.endsWith(`dev-disk-by-uuid-${block.uuid}`));
          const matchedByDevice =
            block.device && size.fs.startsWith(block.device);
          const matchedByHost = isHost && this.isRootMount(size.mount);

          return matchedByMount || matchedByDevice || matchedByHost;
        }),
      ),
    );

    if (sizes.length === 0) {
      return -1;
    }

    const calculatedSize = sumUp(sizes, 'used');
    const isLvm = deviceBlocks.some(({ fsType }) => fsType === 'LVM2_member');

    if (isLvm) {
      return calculatedSize;
    }

    const totalAvailable = sumUp(sizes, 'size');
    const preAllocated = Math.max(0, diskSize - totalAvailable);

    return calculatedSize + preAllocated;
  }

  public getMappedLayout() {
    return this.layout.map(({ size, disks, virtual, raidLabel, raidName }) => {
      if (virtual) {
        const size = this.sizes.find((s) => s.fs === disks[0]?.device);
        return size?.used ?? 0;
      }

      const deviceParts = this.getBlocksForDisks(disks);
      const deviceBlocks = deviceParts
        .concat(this.getBlocksForRaid(raidLabel, raidName))
        .concat(this.getBlocksForXfs(deviceParts));

      const isHost = deviceBlocks.some(({ mount }) => this.isRootMount(mount));

      return this.getSizeForBlocks(deviceBlocks, size, isHost);
    });
  }
}

export default async (): Promise<StorageLoad> => {
  const svInfo = getStaticServerInfo();
  const [sizes, blocks] = await Promise.all([si.fsSize(), si.blockDevices()]);

  return new DynamicStorageMapper(
    PLATFORM_IS_WINDOWS,
    svInfo.storage,
    blocks,
    sizes,
  ).getMappedLayout();
};
