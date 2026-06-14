/**
 * ETH deposit monitor public API.
 *
 * Keeps the previous cron import path stable while the implementation is split
 * into config, state, RPC, block progress, processing, and scanner modules.
 */

import {
  scanNewDeposits,
  triggerScan,
  startEthDepositMonitor,
  getMonitorStatus
} from './ethDepositMonitorScanner.js';

export {
  scanNewDeposits,
  triggerScan,
  startEthDepositMonitor,
  getMonitorStatus
};
