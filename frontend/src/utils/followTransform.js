import {
  calculateGridReturn,
  calculateHighReturn
} from './followCalc'
import {
  formatAmount,
  formatDuration,
  formatPriceRange,
  formatRate
} from './followFormatters'

export function transformRobotConfig(config) {
  const isHigh = config.robot_type === 'high'
  const calc = isHigh
    ? calculateHighReturn(config.min_price, config.daily_profit, config.duration_hours)
    : calculateGridReturn(config.price, config.daily_profit, config.duration_hours)

  return {
    ...config,
    displayPrice: isHigh
      ? formatPriceRange(config.min_price, config.max_price)
      : formatAmount(config.price, 0),
    displayDuration: formatDuration(config.duration_hours),
    displayDailyProfit: formatRate(config.daily_profit),
    displayTotalReturn: isHigh
      ? formatRate(calc.totalReturnRate)
      : formatAmount(calc.totalProfit, 0) + ' USDT',
    calc,
    isHigh,
    isGrid: config.robot_type === 'grid'
  }
}

export function transformRobotConfigs(configs) {
  return configs.map(transformRobotConfig)
}
