/**
 * Follow 页面机器人数学工具集
 */
import {
  DEFAULT_GRID_CONFIG,
  DEFAULT_HIGH_CONFIG
} from './followConfig'
import {
  formatDuration,
  formatAmount,
  formatRate,
  formatPriceRange
} from './followFormatters'
import {
  validateHighAmount,
  validateBalance
} from './followValidators'
import {
  calculateRemainingTime,
  calculateNextQuantifyTime
} from './followTime'
import {
  transformRobotConfig,
  transformRobotConfigs
} from './followTransform'

export {
  DEFAULT_GRID_CONFIG,
  DEFAULT_HIGH_CONFIG,
  formatDuration,
  formatAmount,
  formatRate,
  formatPriceRange,
  validateHighAmount,
  validateBalance,
  calculateRemainingTime,
  calculateNextQuantifyTime,
  transformRobotConfig,
  transformRobotConfigs
}

export function calculateGridReturn(price, dailyProfitRate, durationHours) {
  const durationDays = durationHours / 24
  const dailyRate = dailyProfitRate / 100
  const dailyEarnings = price * dailyRate
  const totalProfit = dailyEarnings * durationDays
  const totalReturn = price + totalProfit
  const totalReturnRate = dailyProfitRate * durationDays

  return {
    price,
    dailyProfitRate,
    durationDays,
    durationHours,
    dailyEarnings: round(dailyEarnings, 4),
    totalProfit: round(totalProfit, 2),
    totalReturn: round(totalReturn, 2),
    totalReturnRate: round(totalReturnRate, 2),
    quantifyTimes: durationDays,
    formula: `${price} × ${dailyProfitRate}% × ${durationDays}天 = ${round(totalProfit, 2)} USDT`
  }
}

export function calculateHighReturn(price, dailyProfitRate, durationHours) {
  const durationDays = durationHours / 24
  const totalReturnRate = dailyProfitRate * durationDays
  const totalProfit = price * (totalReturnRate / 100)
  const totalReturn = price + totalProfit

  return {
    price,
    dailyProfitRate,
    durationDays,
    durationHours,
    totalReturnRate: round(totalReturnRate, 2),
    totalProfit: round(totalProfit, 4),
    totalReturn: round(totalReturn, 4),
    quantifyTimes: 1,
    formula: `${price} × (1 + ${totalReturnRate}%) = ${round(totalReturn, 4)} USDT`
  }
}

export function calculateQuantifyEarnings(price, dailyProfitRate, quantifyIntervalHours = 24) {
  if (quantifyIntervalHours === null) {
    return 0
  }

  const dailyRate = dailyProfitRate / 100
  const intervalDays = quantifyIntervalHours / 24
  return round(price * dailyRate * intervalDays, 4)
}

export function simulateReturns(robotConfig, amounts) {
  const { daily_profit, duration_hours, robot_type, min_price, max_price } = robotConfig

  return amounts.map(amount => {
    if (robot_type === 'high') {
      if (amount < min_price || amount > max_price) {
        return {
          amount,
          valid: false,
          error: `金额必须在 ${min_price} - ${max_price} 范围内`
        }
      }
      return {
        amount,
        valid: true,
        ...calculateHighReturn(amount, daily_profit, duration_hours)
      }
    }

    return {
      amount,
      valid: true,
      ...calculateGridReturn(amount, daily_profit, duration_hours)
    }
  })
}

export function calculateOptimalPortfolio(robots, budget) {
  const robotsWithROI = robots.map(robot => {
    const calc = robot.robot_type === 'high'
      ? calculateHighReturn(robot.price || robot.min_price, robot.daily_profit, robot.duration_hours)
      : calculateGridReturn(robot.price, robot.daily_profit, robot.duration_hours)

    const dailyROI = calc.totalProfit / (robot.price || robot.min_price) / calc.durationDays * 100

    return {
      ...robot,
      calc,
      dailyROI: round(dailyROI, 4),
      efficiency: round(dailyROI / robot.daily_profit, 4)
    }
  })

  robotsWithROI.sort((a, b) => b.dailyROI - a.dailyROI)

  const selected = []
  let remainingBudget = budget
  let totalExpectedReturn = 0

  for (const robot of robotsWithROI) {
    const cost = robot.price || robot.min_price
    if (cost <= remainingBudget) {
      selected.push({
        name: robot.name,
        cost,
        expectedReturn: robot.calc.totalReturn,
        dailyROI: robot.dailyROI
      })
      remainingBudget -= cost
      totalExpectedReturn += robot.calc.totalReturn
    }
  }

  return {
    budget,
    totalInvested: budget - remainingBudget,
    remainingBudget,
    totalExpectedReturn: round(totalExpectedReturn, 2),
    totalProfit: round(totalExpectedReturn - (budget - remainingBudget), 2),
    selectedRobots: selected,
    suggestion: selected.length > 0
      ? `建议购买 ${selected.length} 个机器人，预期总收益 ${round(totalExpectedReturn - (budget - remainingBudget), 2)} USDT`
      : '预算不足，无法购买任何机器人'
  }
}

function round(num, decimals) {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

export default {
  DEFAULT_GRID_CONFIG,
  DEFAULT_HIGH_CONFIG,
  calculateGridReturn,
  calculateHighReturn,
  calculateQuantifyEarnings,
  simulateReturns,
  calculateOptimalPortfolio,
  formatDuration,
  formatAmount,
  formatRate,
  formatPriceRange,
  validateHighAmount,
  validateBalance,
  calculateRemainingTime,
  calculateNextQuantifyTime,
  transformRobotConfig,
  transformRobotConfigs
}
