/**
 * BSC deposit monitor public API.
 *
 * Keeps the previous cron import path stable while the implementation is split
 * into config, state, RPC, block progress, processing, and scanner modules.
 */

import {
  scanNewDeposits,
  triggerScan,
  startDepositMonitor,
  getMonitorStatus
} from './depositMonitorScanner.js';

export {
  scanNewDeposits,
  triggerScan,
  startDepositMonitor,
  getMonitorStatus
};
