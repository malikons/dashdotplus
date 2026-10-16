import fs from 'node:fs';

/**
 * Board and SoC identity.
 *
 * On single board computers the usual identity sources mislead. DMI on a
 * Raspberry Pi names the *PCB* manufacturer (Sony fab the Pi boards) rather
 * than the SoC, and LPDDR soldered flat onto the board has no SPD at all, so
 * memory and disk vendors come back empty.
 *
 * Device trees are authoritative for all of it, and every ARM board ships one.
 * x86 hosts have no device tree, so everything here falls through untouched
 * and whatever systeminfo reported is kept.
 */

// the host filesystem is mounted at /mnt/host inside the container; a
// bare-metal run reads the real paths instead
const candidates = (path: string) => [`/mnt/host${path}`, path];

const readDeviceTree = (path: string, firstOnly: boolean): string[] => {
  for (const candidate of candidates(path)) {
    try {
      // device tree strings are NUL separated, and a file may hold several
      const entries = fs
        .readFileSync(candidate, 'utf8')
        .split('\0')
        .map((entry) => entry.trim())
        .filter(Boolean);

      const usable = firstOnly ? entries.slice(0, 1) : entries;
      if (usable.length > 0) return usable;
    } catch {
      // absent here - try the next candidate, then give up
    }
  }
  return [];
};

const compatible = (): string[] =>
  readDeviceTree('/sys/firmware/devicetree/base/compatible', false);

export const isRaspberryPi = (): boolean =>
  compatible().some((entry) => entry.startsWith('raspberrypi,'));

/** e.g. "Raspberry Pi 5 Model B Rev 1.0" */
export const getBoardModel = (): string | undefined =>
  readDeviceTree('/sys/firmware/devicetree/base/model', true)[0];

/**
 * The board without its revision / form factor suffix, e.g. "Raspberry Pi 5"
 * out of "Raspberry Pi 5 Model B Rev 1.0".
 */
export const getBoardName = (): string | undefined => {
  const model = getBoardModel();
  if (model == null) return undefined;

  return model.split(/\s+Model\s/i)[0]?.trim() || undefined;
};

// `compatible` lists the board before the SoC it is built around, most
// specific first - e.g. ["raspberrypi,5-model-b", "brcm,bcm2712"]. The SoC is
// the entry whose vendor prefix is recognised.
const SOC_VENDORS: Record<string, string> = {
  allwinner: 'Allwinner',
  amlogic: 'Amlogic',
  brcm: 'Broadcom',
  hisilicon: 'HiSilicon',
  marvell: 'Marvell',
  mediatek: 'MediaTek',
  nvidia: 'NVIDIA',
  qcom: 'Qualcomm',
  rockchip: 'Rockchip',
  samsung: 'Samsung',
};

/** e.g. { vendor: "Broadcom", model: "BCM2712" } out of `brcm,bcm2712` */
export const getSoc = (): { vendor: string; model: string } | undefined => {
  for (const entry of compatible()) {
    const [vendor, model] = entry.split(',');
    const known = vendor ? SOC_VENDORS[vendor.toLowerCase()] : undefined;
    if (known && model) {
      return { vendor: known, model: model.toUpperCase() };
    }
  }
  return undefined;
};

/** The drive model exactly as the kernel reports it. */
export const readBlockDeviceModel = (device: string): string | undefined =>
  readDeviceTree(`/sys/block/${device}/device/model`, true)[0] || undefined;

// lsblk only reports a VENDOR for SATA/SAS drives - NVMe exposes the marketing
// model instead (e.g. "SKHynix_HFS256GEJ4X112N"), so the brand has to be
// worked out from that.
const DISK_VENDORS: Array<[RegExp, string]> = [
  [/^SKHYNIX/i, 'SK hynix'],
  [/^SAMSUNG/i, 'Samsung'],
  [/^INTEL/i, 'Intel'],
  [/^(WDC|WESTERN)/i, 'Western Digital'],
  [/^KINGSTON/i, 'Kingston'],
  [/^CRUCIAL/i, 'Crucial'],
  [/^(MICRON|MTF)/i, 'Micron'],
  [/^(KIOXIA|TOSHIBA)/i, 'Kioxia'],
  [/^SANDISK/i, 'SanDisk'],
  [/^(SEAGATE|ST\d)/i, 'Seagate'],
  [/^(HGST|HITACHI)/i, 'Hitachi'],
  [/^ADATA/i, 'ADATA'],
  [/^SABRENT/i, 'Sabrent'],
  [/^APPLE/i, 'Apple'],
];

/** Best effort brand for a drive that reports no VENDOR. */
export const vendorFromModel = (model?: string): string | undefined => {
  // NVMe models separate the brand from the part number with "_" or a space
  const candidate = model?.trim().split(/[_\s-]/)[0];
  if (!candidate) return undefined;

  for (const [pattern, vendor] of DISK_VENDORS) {
    if (pattern.test(candidate)) return vendor;
  }
  return undefined;
};
