import { formatAmount } from './followFormatters'

export function validateHighAmount(amount, minPrice, maxPrice) {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: '请输入有效金额' }
  }

  if (amount < minPrice) {
    return { valid: false, error: `最低投入金额为 ${minPrice} USDT` }
  }

  if (amount > maxPrice) {
    return { valid: false, error: `最高投入金额为 ${maxPrice} USDT` }
  }

  return { valid: true }
}

export function validateBalance(balance, price) {
  if (balance < price) {
    return {
      valid: false,
      error: `余额不足，当前余额 ${formatAmount(balance, 4)} USDT，需要 ${formatAmount(price, 4)} USDT`,
      shortage: price - balance
    }
  }
  return { valid: true }
}
