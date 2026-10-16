import type { RamInfo, RamLoad } from '@dashdot/common';
import * as si from 'systeminformation';
import { getBoardName } from './board';

export default {
  dynamic: async (): Promise<RamLoad> => {
    const memInfo = (await si.mem()).active;

    return memInfo;
  },
  static: async (): Promise<RamInfo> => {
    const [memInfo, memLayout] = await Promise.all([si.mem(), si.memLayout()]);
    // Memory soldered flat onto a board has no SPD, so there is no
    // manufacturer to read - name the board it is part of instead.
    const boardName = getBoardName();

    return {
      size: memInfo.total,
      layout: memLayout
        .filter(({ size }) => size !== 0)
        .map(({ manufacturer, type, clockSpeed }) => ({
          brand:
            manufacturer ?? (boardName ? `${boardName} (onboard)` : undefined),
          type: type,
          frequency: clockSpeed ?? undefined,
        })),
    };
  },
};
