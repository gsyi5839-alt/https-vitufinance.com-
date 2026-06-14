const state = {
  currentRpcIndex: 0,
  platformWallet: '',
  lastCheckedBlock: 0,
  historyPrunedErrors: 0,
  consecutiveErrors: 0
};

function getCurrentRpcIndex() {
  return state.currentRpcIndex;
}

function setCurrentRpcIndex(index) {
  state.currentRpcIndex = index;
}

function getPlatformWallet() {
  return state.platformWallet;
}

function setPlatformWallet(wallet) {
  state.platformWallet = wallet;
}

function getLastCheckedBlock() {
  return state.lastCheckedBlock;
}

function setLastCheckedBlock(blockNumber) {
  state.lastCheckedBlock = blockNumber;
}

function incrementHistoryPrunedErrors() {
  state.historyPrunedErrors += 1;
  return state.historyPrunedErrors;
}

function resetHistoryPrunedErrors() {
  state.historyPrunedErrors = 0;
}

function getHistoryPrunedErrors() {
  return state.historyPrunedErrors;
}

function incrementConsecutiveErrors() {
  state.consecutiveErrors += 1;
  return state.consecutiveErrors;
}

function resetConsecutiveErrors() {
  state.consecutiveErrors = 0;
}

function getConsecutiveErrors() {
  return state.consecutiveErrors;
}

export {
  getCurrentRpcIndex,
  setCurrentRpcIndex,
  getPlatformWallet,
  setPlatformWallet,
  getLastCheckedBlock,
  setLastCheckedBlock,
  incrementHistoryPrunedErrors,
  resetHistoryPrunedErrors,
  getHistoryPrunedErrors,
  incrementConsecutiveErrors,
  resetConsecutiveErrors,
  getConsecutiveErrors
};
