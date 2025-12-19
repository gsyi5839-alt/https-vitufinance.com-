/**
 * i18n 国际化配置
 * 
 * 功能：
 * - 支持多语言切换
 * - 自动检测用户浏览器语言
 * - URL 参数语言优先级最高
 * - 语言设置持久化到 localStorage
 */

import { createI18n } from 'vue-i18n'
import en from './en.json'
import ar from './ar.json'
import id from './id.json'
import vi from './vi.json'
import fr from './fr.json'
import tr from './tr.json'
import zu from './zu.json'
import es from './es.json'
import pt from './pt.json'
import de from './de.json'
import ms from './ms.json'
import uk from './uk.json'
import zhTw from './zh-tw.json'

// 所有支持的语言
const messages = {
  en,
  ar,
  id,
  vi,
  fr,
  tr,
  zu,
  es,
  pt,
  de,
  ms,
  uk,
  'zh-tw': zhTw
}

// 支持的语言代码列表
const supportedLocales = Object.keys(messages)

/**
 * 检测用户首选语言
 * 优先级：URL参数 > localStorage > 浏览器语言 > 默认语言(en)
 */
function detectUserLanguage() {
  // 1. 检查 URL 参数
  const urlParams = new URLSearchParams(window.location.search)
  const langParam = urlParams.get('lang')
  if (langParam && supportedLocales.includes(langParam)) {
    // 保存到 localStorage
    localStorage.setItem('language', langParam)
    return langParam
  }

  // 2. 检查 localStorage 保存的语言
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && supportedLocales.includes(savedLanguage)) {
    return savedLanguage
  }

  // 3. 检测浏览器语言
  const browserLanguages = navigator.languages || [navigator.language]
  
  for (const lang of browserLanguages) {
    // 处理语言代码，如 'zh-TW' -> 'zh-tw', 'en-US' -> 'en'
    const normalizedLang = lang.toLowerCase()
    
    // 精确匹配
    if (supportedLocales.includes(normalizedLang)) {
      return normalizedLang
    }
    
    // 匹配主语言代码（如 'zh-TW' 匹配 'zh-tw'）
    const primaryLang = normalizedLang.split('-')[0]
    const matchedLocale = supportedLocales.find(locale => 
      locale === primaryLang || locale.startsWith(primaryLang + '-')
    )
    
    if (matchedLocale) {
      return matchedLocale
    }
  }

  // 4. 默认语言
  return 'en'
}

// 检测并获取初始语言
const initialLocale = detectUserLanguage()

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages,
  // 缺失翻译时的处理
  missing: (locale, key) => {
    console.warn(`[i18n] Missing translation for key: ${key} in locale: ${locale}`)
  },
  // 允许在模板中使用 HTML 标签
  warnHtmlInMessage: 'off'
})

/**
 * 切换语言
 * @param {string} locale - 语言代码
 */
export function setLocale(locale) {
  if (supportedLocales.includes(locale)) {
    i18n.global.locale.value = locale
    localStorage.setItem('language', locale)
    // 更新 HTML lang 属性
    document.documentElement.lang = locale
    return true
  }
  return false
}

/**
 * 获取当前语言
 * @returns {string} 当前语言代码
 */
export function getLocale() {
  return i18n.global.locale.value
}

/**
 * 获取支持的语言列表
 * @returns {string[]} 支持的语言代码数组
 */
export function getSupportedLocales() {
  return supportedLocales
}

export default i18n
