export function formatDuration(hours) {
  if (!hours) return '-'

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (hours < 24) {
    return `${hours}小时`
  }

  if (remainingHours === 0) {
    return `${days}天`
  }

  return `${days}天${remainingHours}小时`
}

export function formatAmount(amount, decimals = 2) {
  if (amount === null || amount === undefined) return '-'

  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function formatRate(rate) {
  if (rate === null || rate === undefined) return '-'
  return `${Number(rate).toFixed(2)}%`
}

export function formatPriceRange(minPrice, maxPrice) {
  return `${formatAmount(minPrice, 0)}-${formatAmount(maxPrice, 0)}`
}
