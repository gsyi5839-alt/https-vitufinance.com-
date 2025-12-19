/**
 * 简单的事件总线
 * 用于组件间通信（如新充值通知触发列表刷新）
 */
import { ref } from 'vue'

// 事件监听器存储
const listeners = {}

// 新充值标记（用于触发刷新）
export const newDepositFlag = ref(0)
export const newWithdrawFlag = ref(0)

/**
 * 监听事件
 * @param {string} event 事件名
 * @param {Function} callback 回调函数
 */
export const on = (event, callback) => {
  if (!listeners[event]) {
    listeners[event] = []
  }
  listeners[event].push(callback)
}

/**
 * 触发事件
 * @param {string} event 事件名
 * @param {any} data 数据
 */
export const emit = (event, data) => {
  if (listeners[event]) {
    listeners[event].forEach(callback => callback(data))
  }
}

/**
 * 移除监听
 * @param {string} event 事件名
 * @param {Function} callback 回调函数
 */
export const off = (event, callback) => {
  if (listeners[event]) {
    if (callback) {
      listeners[event] = listeners[event].filter(cb => cb !== callback)
    } else {
      delete listeners[event]
    }
  }
}

// 预定义事件名
export const EVENTS = {
  NEW_DEPOSIT: 'new_deposit',
  NEW_WITHDRAW: 'new_withdraw',
  REFRESH_DEPOSITS: 'refresh_deposits',
  REFRESH_WITHDRAWALS: 'refresh_withdrawals',
  // 语音播报相关事件
  SPEECH_ENABLED_CHANGED: 'speech_enabled_changed',
  SPEECH_SETTINGS_CHANGED: 'speech_settings_changed'
}

export default {
  on,
  emit,
  off,
  EVENTS,
  newDepositFlag,
  newWithdrawFlag
}

