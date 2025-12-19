/**
 * 语音播报服务
 * 使用 Web Speech API 实现 TTS 文字转语音
 * 功能：充值/提款订单语音提示
 */

import { ref } from 'vue'

// ==================== 语音设置状态 ====================

// 语音功能是否启用
export const speechEnabled = ref(false)

// 语音音量 (0-1)
export const speechVolume = ref(0.8)

// 语音语速 (0.1-2)，默认0.85适中语速
export const speechRate = ref(0.85)

// 当前是否正在播放
export const isSpeaking = ref(false)

// ==================== 语音合成对象 ====================

let synth = null
let voices = []
let chineseVoice = null

/**
 * 初始化语音服务
 */
export const initSpeechService = () => {
  // 检查浏览器是否支持语音合成
  if (!('speechSynthesis' in window)) {
    console.warn('[SpeechService] 浏览器不支持语音合成功能')
    return false
  }
  
  synth = window.speechSynthesis
  
  // 加载可用的语音列表
  loadVoices()
  
  // 部分浏览器需要监听 voiceschanged 事件
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices
  }
  
  // 从本地存储加载设置
  loadSettings()
  
  console.log('[SpeechService] 语音服务初始化完成')
  return true
}

/**
 * 加载可用的语音列表
 */
const loadVoices = () => {
  voices = synth.getVoices()
  
  // 优先选择中文语音
  chineseVoice = voices.find(voice => 
    voice.lang.includes('zh') || 
    voice.lang.includes('CN') || 
    voice.name.includes('Chinese') ||
    voice.name.includes('中文')
  )
  
  // 如果没有中文语音，选择默认语音
  if (!chineseVoice && voices.length > 0) {
    chineseVoice = voices[0]
  }
  
  console.log('[SpeechService] 可用语音数量:', voices.length)
  if (chineseVoice) {
    console.log('[SpeechService] 选择的语音:', chineseVoice.name, chineseVoice.lang)
  }
}

/**
 * 从本地存储加载设置
 */
const loadSettings = () => {
  try {
    const enabled = localStorage.getItem('admin_speech_enabled')
    const volume = localStorage.getItem('admin_speech_volume')
    const rate = localStorage.getItem('admin_speech_rate')
    
    if (enabled !== null) {
      speechEnabled.value = enabled === 'true'
    }
    if (volume !== null) {
      speechVolume.value = parseFloat(volume) || 0.8
    }
    if (rate !== null) {
      speechRate.value = parseFloat(rate) || 1.0
    }
  } catch (error) {
    console.error('[SpeechService] 加载设置失败:', error)
  }
}

/**
 * 保存设置到本地存储
 */
export const saveSettings = () => {
  try {
    localStorage.setItem('admin_speech_enabled', String(speechEnabled.value))
    localStorage.setItem('admin_speech_volume', String(speechVolume.value))
    localStorage.setItem('admin_speech_rate', String(speechRate.value))
  } catch (error) {
    console.error('[SpeechService] 保存设置失败:', error)
  }
}

// 语音是否已激活（需要用户交互才能激活）
let speechActivated = false

/**
 * 激活语音合成（需要在用户点击时调用）
 * 浏览器安全策略要求语音合成必须由用户交互触发
 * @returns {Promise} 激活完成的Promise
 */
export const activateSpeech = () => {
  return new Promise((resolve, reject) => {
    if (!synth) {
      reject(new Error('语音合成不可用'))
      return
    }
    
    // 如果已经激活，直接返回
    if (speechActivated) {
      resolve()
      return
    }
    
    // 通过播放一段短语音来激活语音合成上下文
    const utterance = new SpeechSynthesisUtterance('')
    utterance.volume = 0 // 静音
    utterance.rate = 2   // 最快速度
    
    utterance.onend = () => {
      speechActivated = true
      console.log('[SpeechService] 语音合成已激活')
      resolve()
    }
    
    utterance.onerror = (event) => {
      // 即使出错也标记为已尝试激活
      speechActivated = true
      console.log('[SpeechService] 语音激活尝试:', event.error)
      resolve() // 不reject，允许继续
    }
    
    synth.speak(utterance)
  })
}

/**
 * 启用语音功能（需要用户交互时调用）
 * @returns {Promise}
 */
export const enableSpeech = async () => {
  speechEnabled.value = true
  saveSettings()
  // 尝试激活语音合成
  try {
    await activateSpeech()
  } catch (e) {
    console.log('[SpeechService] 激活语音失败:', e)
  }
}

/**
 * 禁用语音功能
 */
export const disableSpeech = () => {
  speechEnabled.value = false
  saveSettings()
}

/**
 * 播放语音
 * @param {string} text 要播放的文本
 * @param {Object} options 选项
 * @returns {Promise} 播放完成的Promise
 */
export const speak = (text, options = {}) => {
  return new Promise((resolve) => {
    // 检查是否启用
    if (!speechEnabled.value) {
      console.log('[SpeechService] 语音功能未启用')
      resolve()
      return
    }
    
    // 检查语音合成是否可用
    if (!synth) {
      console.warn('[SpeechService] 语音合成不可用')
      resolve() // 不阻塞，静默失败
      return
    }
    
    // 检查是否已激活（需要用户交互）
    if (!speechActivated) {
      console.warn('[SpeechService] 语音未激活，需要用户先点击启用')
      resolve()
      return
    }
    
    // 取消正在播放的语音
    synth.cancel()
    
    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(text)
    
    // 设置语音
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }
    
    // 设置语言（确保使用中文）
    utterance.lang = 'zh-CN'
    
    // 设置音量和语速
    utterance.volume = options.volume !== undefined ? options.volume : speechVolume.value
    utterance.rate = options.rate !== undefined ? options.rate : speechRate.value
    utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0
    
    // 事件处理
    utterance.onstart = () => {
      isSpeaking.value = true
      console.log('[SpeechService] 开始播放:', text)
    }
    
    utterance.onend = () => {
      isSpeaking.value = false
      console.log('[SpeechService] 播放完成')
      resolve()
    }
    
    utterance.onerror = (event) => {
      isSpeaking.value = false
      console.warn('[SpeechService] 播放错误:', event.error)
      resolve() // 不阻塞，静默失败
    }
    
    // 播放语音
    synth.speak(utterance)
  })
}

/**
 * 停止当前播放
 */
export const stopSpeaking = () => {
  if (synth) {
    synth.cancel()
    isSpeaking.value = false
  }
}

/**
 * 暂停播放
 */
export const pauseSpeaking = () => {
  if (synth) {
    synth.pause()
  }
}

/**
 * 恢复播放
 */
export const resumeSpeaking = () => {
  if (synth) {
    synth.resume()
  }
}

// ==================== 业务相关语音播报函数 ====================

/**
 * 播放新充值订单提示音（播报两次）
 * 用于用户点击充值时播放
 * @returns {Promise} 两次播报完成的Promise
 */
export const speakNewDepositOrder = async () => {
  const message = '你有一笔充值订单来啦'
  
  // 第一次播报
  await speak(message)
  
  // 间隔800ms后第二次播报
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // 第二次播报
  await speak(message)
}

/**
 * 播放充值完成提示音
 * 播报内容：用户ID + 充值金额 + 充值完成
 * @param {string|number} userId 用户ID或钱包地址（取后6位）
 * @param {number} amount 充值金额
 * @param {string} token 代币类型
 */
export const speakDepositComplete = (userId, amount, token = 'USDT') => {
  // 处理用户ID，如果是钱包地址则取后6位，并逐字符读出
  let displayId = formatUserIdForSpeech(userId)
  
  // 格式化金额，保留整数或两位小数
  const formattedAmount = formatAmountForSpeech(amount)
  
  // 处理代币名称读音
  const tokenName = formatTokenForSpeech(token)
  
  // 完整播报：用户ID + 金额 + 充值完成
  const text = `用户 ${displayId}，充值了 ${formattedAmount} ${tokenName}，充值完成`
  return speak(text)
}

/**
 * 播放新提款申请提示音
 * 播报内容：用户ID + 提现金额
 * @param {string|number} userId 用户ID或钱包地址
 * @param {number} amount 提款金额
 * @param {string} token 代币类型
 */
export const speakWithdrawRequest = (userId, amount, token = 'USDT') => {
  // 处理用户ID，格式化为可读形式
  const displayId = formatUserIdForSpeech(userId)
  
  // 格式化金额
  const formattedAmount = formatAmountForSpeech(amount)
  
  // 处理代币名称读音
  const tokenName = formatTokenForSpeech(token)
  
  const text = `用户 ${displayId}，申请提现 ${formattedAmount} ${tokenName}`
  return speak(text)
}

/**
 * 播放提款完成提示音
 * 播报内容：用户ID + 提现金额 + 处理完成
 * @param {string|number} userId 用户ID
 * @param {number} amount 提款金额
 * @param {string} token 代币类型
 */
export const speakWithdrawComplete = (userId, amount, token = 'USDT') => {
  // 处理用户ID，格式化为可读形式
  const displayId = formatUserIdForSpeech(userId)
  
  const formattedAmount = formatAmountForSpeech(amount)
  const tokenName = formatTokenForSpeech(token)
  
  const text = `用户 ${displayId}，提现 ${formattedAmount} ${tokenName}，处理完成`
  return speak(text)
}

/**
 * 播放攻击警报提示音（紧急播报两次）
 * @param {number} attackCount 攻击次数
 * @param {string} attackType 攻击类型
 * @param {string} severity 严重程度
 * @returns {Promise} 播报完成的Promise
 */
export const speakAttackAlert = async (attackCount, attackType, severity) => {
  // 格式化攻击类型
  const typeMap = {
    'sql_injection': 'SQL注入',
    'xss': 'XSS攻击',
    'brute_force': '暴力破解',
    'rate_limit': '流量攻击',
    'bot_detection': '机器人攻击',
    'ddos': 'DDOS攻击',
    'other': '恶意攻击'
  }
  const typeName = typeMap[attackType] || '恶意攻击'
  
  // 格式化严重程度
  const severityMap = {
    'low': '低级',
    'medium': '中级',
    'high': '高级',
    'critical': '严重'
  }
  const severityName = severityMap[severity] || '中级'
  
  // 构建警报消息
  let message
  if (attackCount > 5) {
    message = `警告，检测到大量攻击，${attackCount}次${typeName}，请立即处理`
  } else {
    message = `警告，检测到${severityName}${typeName}，共${attackCount}次`
  }
  
  // 第一次播报
  await speak(message, { rate: 1.0, volume: 1.0 })
  
  // 如果是严重攻击，播报两次
  if (severity === 'critical' || severity === 'high' || attackCount > 5) {
    await new Promise(resolve => setTimeout(resolve, 500))
    await speak(message, { rate: 1.0, volume: 1.0 })
  }
}

/**
 * 播放IP封禁提示音
 * @param {string} ip 被封禁的IP
 * @returns {Promise}
 */
export const speakIPBlocked = (ip) => {
  // 取IP的最后一段便于识别
  const ipParts = ip.split('.')
  const lastPart = ipParts[ipParts.length - 1] || ip.slice(-6)
  const text = `IP地址 ${lastPart} 已被自动封禁`
  return speak(text)
}

// ==================== 工具函数 ====================

/**
 * 格式化用户ID用于语音播报
 * 如果是钱包地址，取后6位并逐字符读出
 * @param {string|number} userId 用户ID或钱包地址
 * @returns {string} 格式化后的用户ID字符串
 */
const formatUserIdForSpeech = (userId) => {
  if (!userId) return '未知用户'
  
  let displayId = String(userId)
  
  // 如果是钱包地址（长度超过10），取后6位
  if (displayId.length > 10) {
    displayId = displayId.slice(-6)
  }
  
  // 将字母和数字逐个分开读，便于语音清晰播报
  // 例如：ABC123 -> A B C 1 2 3
  const chars = displayId.toUpperCase().split('')
  const readableChars = chars.map(char => {
    // 数字直接返回
    if (/[0-9]/.test(char)) {
      return char
    }
    // 字母返回，加空格分隔
    return char
  })
  
  return readableChars.join(' ')
}

/**
 * 格式化金额用于语音播报
 * @param {number} amount 金额
 * @returns {string} 格式化后的金额字符串
 */
const formatAmountForSpeech = (amount) => {
  const num = parseFloat(amount) || 0
  
  // 如果是整数，直接返回
  if (Number.isInteger(num)) {
    return num.toString()
  }
  
  // 保留两位小数
  const fixed = num.toFixed(2)
  
  // 如果小数部分是0，返回整数
  if (fixed.endsWith('.00')) {
    return Math.floor(num).toString()
  }
  
  // 去掉末尾的0
  return fixed.replace(/\.?0+$/, '')
}

/**
 * 格式化代币名称用于语音播报
 * @param {string} token 代币符号
 * @returns {string} 可读的代币名称
 */
const formatTokenForSpeech = (token) => {
  const tokenMap = {
    'USDT': 'U S D T',
    'USDC': 'U S D C',
    'BTC': '比特币',
    'ETH': '以太坊',
    'BNB': 'B N B'
  }
  
  return tokenMap[token?.toUpperCase()] || token || 'U S D T'
}

/**
 * 获取可用的语音列表
 * @returns {Array} 语音列表
 */
export const getAvailableVoices = () => {
  return voices
}

/**
 * 设置语音
 * @param {string} voiceName 语音名称
 */
export const setVoice = (voiceName) => {
  const voice = voices.find(v => v.name === voiceName)
  if (voice) {
    chineseVoice = voice
  }
}

/**
 * 测试语音播放（需要在用户点击时调用）
 * @returns {Promise}
 */
export const testSpeech = async () => {
  // 先激活语音
  await activateSpeech()
  
  // 临时启用语音进行测试
  const wasEnabled = speechEnabled.value
  speechEnabled.value = true
  
  try {
    await speak('语音播报测试成功')
  } finally {
    // 恢复原来的状态
    speechEnabled.value = wasEnabled
  }
}

/**
 * 激活并启用语音（需要在用户点击时调用）
 * 这个函数会播放一段欢迎语来激活语音合成
 * @returns {Promise}
 */
export const activateAndEnableSpeech = async () => {
  // 启用语音
  speechEnabled.value = true
  saveSettings()
  
  // 激活语音合成
  await activateSpeech()
  
  // 播放一段欢迎语确认激活成功
  await speak('语音通知已开启')
}

// 导出默认对象
export default {
  initSpeechService,
  speak,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  speakNewDepositOrder,
  speakDepositComplete,
  speakWithdrawRequest,
  speakWithdrawComplete,
  speakAttackAlert,
  speakIPBlocked,
  testSpeech,
  enableSpeech,
  disableSpeech,
  activateSpeech,
  activateAndEnableSpeech,
  saveSettings,
  getAvailableVoices,
  setVoice,
  speechEnabled,
  speechVolume,
  speechRate,
  isSpeaking
}

