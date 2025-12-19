/**
 * 国际化格式化工具
 * 
 * 提供日期、货币、数字的国际化格式化功能
 * 根据用户当前语言自动调整显示格式
 */

import { getLocale } from '@/locales'

/**
 * 语言代码到 Intl 语言代码的映射
 * 用于处理不同的语言代码格式
 */
const localeMap = {
  'en': 'en-US',
  'ar': 'ar-SA',
  'de': 'de-DE',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'id': 'id-ID',
  'ms': 'ms-MY',
  'pt': 'pt-PT',
  'tr': 'tr-TR',
  'uk': 'uk-UA',
  'vi': 'vi-VN',
  'zh-tw': 'zh-TW',
  'zu': 'zu-ZA'
}

/**
 * 货币符号映射
 */
const currencySymbols = {
  'USD': '$',
  'EUR': '€',
  'CNY': '¥',
  'TWD': 'NT$',
  'JPY': '¥',
  'KRW': '₩',
  'GBP': '£',
  'BRL': 'R$',
  'RUB': '₽',
  'INR': '₹',
  'TRY': '₺',
  'VND': '₫',
  'IDR': 'Rp',
  'MYR': 'RM',
  'AED': 'د.إ',
  'SAR': '﷼'
}

/**
 * 获取当前 Intl 语言代码
 * @returns {string} Intl 语言代码
 */
function getIntlLocale() {
  const currentLocale = getLocale()
  return localeMap[currentLocale] || 'en-US'
}

/**
 * 格式化数字
 * 根据当前语言自动格式化数字（添加千分位分隔符等）
 * 
 * @param {number} value - 要格式化的数字
 * @param {Object} options - 格式化选项
 * @param {number} options.minimumFractionDigits - 最小小数位数
 * @param {number} options.maximumFractionDigits - 最大小数位数
 * @returns {string} 格式化后的数字字符串
 * 
 * @example
 * formatNumber(1234567.89) // en: "1,234,567.89" | de: "1.234.567,89"
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  
  const locale = getIntlLocale()
  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }
  
  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(value)
  } catch (error) {
    console.warn('[i18n-format] formatNumber error:', error)
    return value.toString()
  }
}

/**
 * 格式化货币
 * 根据当前语言和指定货币自动格式化金额
 * 
 * @param {number} value - 金额
 * @param {string} currency - 货币代码，默认 'USD'
 * @param {Object} options - 格式化选项
 * @param {boolean} options.showSymbol - 是否显示货币符号，默认 true
 * @param {number} options.minimumFractionDigits - 最小小数位数，默认 2
 * @param {number} options.maximumFractionDigits - 最大小数位数，默认 2
 * @returns {string} 格式化后的货币字符串
 * 
 * @example
 * formatCurrency(100000, 'USD') // en: "$100,000.00" | de: "100.000,00 $"
 * formatCurrency(100000, 'CNY') // "¥100,000.00"
 * formatCurrency(100000, 'EUR') // fr: "100 000,00 €"
 */
export function formatCurrency(value, currency = 'USD', options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return currencySymbols[currency] || '$' + '0.00'
  }
  
  const locale = getIntlLocale()
  const { showSymbol = true, ...numberOptions } = options
  
  const defaultOptions = {
    style: showSymbol ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...numberOptions
  }
  
  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(value)
  } catch (error) {
    console.warn('[i18n-format] formatCurrency error:', error)
    // 降级处理
    const symbol = currencySymbols[currency] || '$'
    return `${symbol}${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

/**
 * 格式化 USDT 金额
 * 专门用于 USDT 的格式化，保留4位小数
 * 
 * @param {number} value - USDT 金额
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的 USDT 字符串
 * 
 * @example
 * formatUSDT(1234.5678) // "1,234.5678 USDT"
 */
export function formatUSDT(value, options = {}) {
  const { showUnit = true, ...numberOptions } = options
  const formatted = formatNumber(value, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    ...numberOptions
  })
  return showUnit ? `${formatted} USDT` : formatted
}

/**
 * 格式化 WLD 金额
 * 专门用于 WLD 的格式化
 * 
 * @param {number} value - WLD 金额
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的 WLD 字符串
 * 
 * @example
 * formatWLD(100.5) // "100.5 WLD"
 */
export function formatWLD(value, options = {}) {
  const { showUnit = true, ...numberOptions } = options
  const formatted = formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
    ...numberOptions
  })
  return showUnit ? `${formatted} WLD` : formatted
}

/**
 * 格式化日期
 * 根据当前语言自动格式化日期
 * 
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @param {Object} options - 格式化选项
 * @param {string} options.dateStyle - 日期样式：'full' | 'long' | 'medium' | 'short'
 * @param {string} options.timeStyle - 时间样式：'full' | 'long' | 'medium' | 'short'
 * @returns {string} 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date()) // en: "12/12/2024" | de: "12.12.2024"
 * formatDate(new Date(), { dateStyle: 'full' }) // en: "Thursday, December 12, 2024"
 */
export function formatDate(date, options = {}) {
  if (!date) {
    return ''
  }
  
  const locale = getIntlLocale()
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    console.warn('[i18n-format] Invalid date:', date)
    return ''
  }
  
  const defaultOptions = {
    dateStyle: 'short',
    ...options
  }
  
  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
  } catch (error) {
    console.warn('[i18n-format] formatDate error:', error)
    return dateObj.toLocaleDateString()
  }
}

/**
 * 格式化日期时间
 * 根据当前语言格式化日期和时间
 * 
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期时间字符串
 * 
 * @example
 * formatDateTime(new Date()) // en: "12/12/2024, 10:30 AM"
 */
export function formatDateTime(date, options = {}) {
  return formatDate(date, {
    dateStyle: 'short',
    timeStyle: 'short',
    ...options
  })
}

/**
 * 格式化相对时间
 * 显示相对于当前时间的描述
 * 
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @returns {string} 相对时间描述
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 60000)) // "1 minute ago"
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeTime(date) {
  if (!date) {
    return ''
  }
  
  const locale = getIntlLocale()
  const dateObj = date instanceof Date ? date : new Date(date)
  
  if (isNaN(dateObj.getTime())) {
    console.warn('[i18n-format] Invalid date:', date)
    return ''
  }
  
  const now = new Date()
  const diffMs = dateObj.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffSeconds / 60)
  const diffHours = Math.round(diffMinutes / 60)
  const diffDays = Math.round(diffHours / 24)
  const diffWeeks = Math.round(diffDays / 7)
  const diffMonths = Math.round(diffDays / 30)
  const diffYears = Math.round(diffDays / 365)
  
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    
    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second')
    } else if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute')
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour')
    } else if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day')
    } else if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, 'week')
    } else if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month')
    } else {
      return rtf.format(diffYears, 'year')
    }
  } catch (error) {
    console.warn('[i18n-format] formatRelativeTime error:', error)
    return formatDate(date)
  }
}

/**
 * 格式化百分比
 * 
 * @param {number} value - 百分比值（如 0.15 表示 15%）
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的百分比字符串
 * 
 * @example
 * formatPercent(0.15) // "15%"
 * formatPercent(0.156789, { maximumFractionDigits: 2 }) // "15.68%"
 */
export function formatPercent(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%'
  }
  
  const locale = getIntlLocale()
  const defaultOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }
  
  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(value)
  } catch (error) {
    console.warn('[i18n-format] formatPercent error:', error)
    return `${(value * 100).toFixed(2)}%`
  }
}

/**
 * 格式化简短数字
 * 将大数字简化显示（如 1.2M, 3.5K）
 * 
 * @param {number} value - 数字
 * @param {Object} options - 格式化选项
 * @returns {string} 简化后的数字字符串
 * 
 * @example
 * formatCompactNumber(1234567) // en: "1.2M" | de: "1,2 Mio."
 */
export function formatCompactNumber(value, options = {}) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0'
  }
  
  const locale = getIntlLocale()
  const defaultOptions = {
    notation: 'compact',
    compactDisplay: 'short',
    ...options
  }
  
  try {
    return new Intl.NumberFormat(locale, defaultOptions).format(value)
  } catch (error) {
    console.warn('[i18n-format] formatCompactNumber error:', error)
    // 降级处理
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }
}

// 导出所有格式化函数
export default {
  formatNumber,
  formatCurrency,
  formatUSDT,
  formatWLD,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatPercent,
  formatCompactNumber
}

