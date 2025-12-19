/**
 * 设备检测工具 - Safari/iOS 性能优化
 * 用于检测设备类型并应用相应的性能优化策略
 */

/**
 * 检测是否为 Safari 浏览器（包括 iOS Safari）
 * @returns {boolean}
 */
export const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase()
  // Safari 但不是 Chrome（Chrome也包含Safari字符串）
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
}

/**
 * 检测是否为 iOS 设备
 * @returns {boolean}
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * 检测是否为 macOS
 * @returns {boolean}
 */
export const isMacOS = () => {
  return navigator.platform.toLowerCase().includes('mac')
}

/**
 * 检测是否为苹果设备（iOS + macOS）
 * @returns {boolean}
 */
export const isAppleDevice = () => {
  return isIOS() || isMacOS()
}

/**
 * 检测是否为低性能设备
 * 包括：iOS设备、Safari浏览器、低内存设备、低GPU性能设备
 * @returns {boolean}
 */
export const isLowPerformanceDevice = () => {
  // Safari/iOS 对复杂动画支持较差
  if (isSafari() || isIOS()) {
    return true
  }
  
  // 检测设备内存（如果支持）
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    return true
  }
  
  // 检测硬件并发数（CPU核心数）
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return true
  }
  
  // 检测是否请求减少动画
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return true
  }
  
  return false
}

/**
 * 检测是否支持 backdrop-filter
 * Safari 虽然支持但性能很差
 * @returns {boolean}
 */
export const shouldUseBackdropFilter = () => {
  // Safari/iOS 上禁用 backdrop-filter 以提升性能
  if (isSafari() || isIOS()) {
    return false
  }
  
  // 检测是否支持
  return CSS.supports?.('backdrop-filter', 'blur(10px)') ?? false
}

/**
 * 检测是否应该使用复杂动画
 * @returns {boolean}
 */
export const shouldUseComplexAnimations = () => {
  // 低性能设备禁用复杂动画
  if (isLowPerformanceDevice()) {
    return false
  }
  
  // 检测是否请求减少动画
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false
  }
  
  return true
}

/**
 * 检测是否应该使用 3D 效果
 * @returns {boolean}
 */
export const shouldUse3DEffects = () => {
  // Safari/iOS 对 Three.js 性能支持较差
  if (isSafari() || isIOS()) {
    return false
  }
  
  return shouldUseComplexAnimations()
}

/**
 * 获取推荐的动画持续时间
 * Safari 上使用更短的动画以减少卡顿感
 * @param {number} defaultDuration - 默认持续时间（毫秒）
 * @returns {number}
 */
export const getOptimalAnimationDuration = (defaultDuration = 300) => {
  if (isLowPerformanceDevice()) {
    return Math.min(defaultDuration * 0.5, 150) // 减半但不超过150ms
  }
  return defaultDuration
}

/**
 * 获取推荐的粒子数量
 * @param {number} defaultCount - 默认数量
 * @returns {number}
 */
export const getOptimalParticleCount = (defaultCount) => {
  if (isLowPerformanceDevice()) {
    return Math.floor(defaultCount * 0.3) // 减少到30%
  }
  return defaultCount
}

/**
 * 获取推荐的设备像素比
 * 高DPI设备上限制像素比以提升性能
 * @returns {number}
 */
export const getOptimalPixelRatio = () => {
  const dpr = window.devicePixelRatio || 1
  
  // Safari/iOS 限制最大像素比为 1.5
  if (isSafari() || isIOS()) {
    return Math.min(dpr, 1.5)
  }
  
  // 其他设备限制最大像素比为 2
  return Math.min(dpr, 2)
}

/**
 * 应用设备优化CSS类到根元素
 */
export const applyDeviceOptimizations = () => {
  const html = document.documentElement
  
  // 移除旧的类
  html.classList.remove('is-safari', 'is-ios', 'is-apple', 'is-low-perf', 'reduce-motion')
  
  // 添加新的类
  if (isSafari()) {
    html.classList.add('is-safari')
  }
  
  if (isIOS()) {
    html.classList.add('is-ios')
  }
  
  if (isAppleDevice()) {
    html.classList.add('is-apple')
  }
  
  if (isLowPerformanceDevice()) {
    html.classList.add('is-low-perf')
  }
  
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    html.classList.add('reduce-motion')
  }
  
  console.log('[DeviceDetect] 设备信息:', {
    isSafari: isSafari(),
    isIOS: isIOS(),
    isMacOS: isMacOS(),
    isLowPerformance: isLowPerformanceDevice(),
    shouldUse3D: shouldUse3DEffects(),
    pixelRatio: getOptimalPixelRatio()
  })
}

/**
 * 获取设备性能配置
 * @returns {Object}
 */
export const getDevicePerformanceConfig = () => {
  return {
    // 是否使用3D效果
    use3DEffects: shouldUse3DEffects(),
    // 是否使用复杂动画
    useComplexAnimations: shouldUseComplexAnimations(),
    // 是否使用毛玻璃效果
    useBackdropFilter: shouldUseBackdropFilter(),
    // 推荐的像素比
    pixelRatio: getOptimalPixelRatio(),
    // 动画持续时间倍率
    animationDurationMultiplier: isLowPerformanceDevice() ? 0.5 : 1,
    // 粒子数量倍率
    particleCountMultiplier: isLowPerformanceDevice() ? 0.3 : 1,
    // 是否启用阴影
    useShadows: !isLowPerformanceDevice(),
    // 帧率目标
    targetFPS: isLowPerformanceDevice() ? 30 : 60
  }
}

export default {
  isSafari,
  isIOS,
  isMacOS,
  isAppleDevice,
  isLowPerformanceDevice,
  shouldUseBackdropFilter,
  shouldUseComplexAnimations,
  shouldUse3DEffects,
  getOptimalAnimationDuration,
  getOptimalParticleCount,
  getOptimalPixelRatio,
  applyDeviceOptimizations,
  getDevicePerformanceConfig
}

