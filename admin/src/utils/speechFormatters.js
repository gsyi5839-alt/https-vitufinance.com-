export const formatUserIdForSpeech = (userId) => {
  if (!userId) return '未知用户'

  let displayId = String(userId)

  if (displayId.length > 10) {
    displayId = displayId.slice(-6)
  }

  return displayId.toUpperCase().split('').join(' ')
}

export const formatAmountForSpeech = (amount) => {
  const num = parseFloat(amount) || 0

  if (Number.isInteger(num)) {
    return num.toString()
  }

  const fixed = num.toFixed(2)
  if (fixed.endsWith('.00')) {
    return Math.floor(num).toString()
  }

  return fixed.replace(/\.?0+$/, '')
}

export const formatTokenForSpeech = (token) => {
  const tokenMap = {
    USDT: 'U S D T',
    USDC: 'U S D C',
    BTC: '比特币',
    ETH: '以太坊',
    BNB: 'B N B'
  }

  return tokenMap[token?.toUpperCase()] || token || 'U S D T'
}

export const formatAttackTypeForSpeech = (attackType) => {
  const typeMap = {
    sql_injection: 'SQL注入',
    xss: 'XSS攻击',
    brute_force: '暴力破解',
    rate_limit: '流量攻击',
    bot_detection: '机器人攻击',
    ddos: 'DDOS攻击',
    other: '恶意攻击'
  }

  return typeMap[attackType] || '恶意攻击'
}

export const formatSeverityForSpeech = (severity) => {
  const severityMap = {
    low: '低级',
    medium: '中级',
    high: '高级',
    critical: '严重'
  }

  return severityMap[severity] || '中级'
}

export const buildAttackAlertMessage = (attackCount, attackType, severity) => {
  const typeName = formatAttackTypeForSpeech(attackType)
  const severityName = formatSeverityForSpeech(severity)

  if (attackCount > 5) {
    return `警告，检测到大量攻击，${attackCount}次${typeName}，请立即处理`
  }

  return `警告，检测到${severityName}${typeName}，共${attackCount}次`
}
