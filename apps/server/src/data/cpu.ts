import type { CpuInfo, CpuLoad } from '@dashdotplus/common';
import * as si from 'systeminformation';
import { CONFIG } from '../config';
import { getStaticServerInfo } from '../static-info';
import { getSoc, isRaspberryPi } from './board';

const normalizeCpuModel = (cpuModel: string) => {
  return cpuModel
    .replace(/Processor/g, '')
    .replace(/[A-Za-z0-9]*-Core/g, '')
    .trim();
};

export default {
  dynamic: async (): Promise<CpuLoad> => {
    const { cpu } = await getStaticServerInfo();
    const cpuLoad = (await si.currentLoad()).cpus;

    let temps: si.Systeminformation.CpuTemperatureData['cores'] = [];
    let mainTemp = 0;
    if (CONFIG.enable_cpu_temps) {
      const cpuTemp = await si.cpuTemperature();
      const threadsPerCore = (cpu.threads - cpu.ecores) / cpu.pcores;
      temps = cpuTemp.cores.flatMap((temp, i) =>
        i < cpu.pcores ? Array(threadsPerCore).fill(temp) : temp,
      );
      mainTemp = cpuTemp.main; // AVG temp of all cores, in case no per-core data is found
    }

    return cpuLoad.map(({ load }, i) => ({
      load,
      temp: temps[i] ?? mainTemp,
      core: i,
    }));
  },
  static: async (): Promise<CpuInfo> => {
    const cpuInfo = await si.cpu();
    // On a Raspberry Pi systeminfo reports the PCB manufacturer here - Sony
    // fab the boards - because it reads the Pi revision code. The device tree
    // names the SoC, which is what the brand actually stands for.
    const soc = isRaspberryPi() ? getSoc() : undefined;

    return {
      brand: soc?.vendor ?? cpuInfo.manufacturer,
      model: normalizeCpuModel(cpuInfo.brand),
      cores: cpuInfo.physicalCores,
      ecores: cpuInfo.efficiencyCores ?? 0,
      pcores: cpuInfo.performanceCores ?? 0,
      threads: cpuInfo.cores,
      frequency: cpuInfo.speedMax,
    };
  },
};
