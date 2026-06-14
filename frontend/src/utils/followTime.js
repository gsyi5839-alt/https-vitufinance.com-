export function calculateRemainingTime(endTime) {
  const end = new Date(endTime)
  const now = new Date()
  const remaining = end - now

  if (remaining <= 0) {
    return { expired: true, text: '已到期' }
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  let text = ''
  if (days > 0) {
    text = `${days}天${hours}小时`
  } else if (hours > 0) {
    text = `${hours}小时${minutes}分钟`
  } else {
    text = `${minutes}分钟`
  }

  return {
    expired: false,
    days,
    hours,
    minutes,
    totalHours: remaining / (1000 * 60 * 60),
    text
  }
}

export function calculateNextQuantifyTime(lastQuantifyTime, intervalHours = 24) {
  if (!lastQuantifyTime) {
    return { canQuantify: true, text: '可以量化' }
  }

  const last = new Date(lastQuantifyTime)
  const next = new Date(last.getTime() + intervalHours * 60 * 60 * 1000)
  const now = new Date()

  if (now >= next) {
    return { canQuantify: true, text: '可以量化' }
  }

  const remaining = next - now
  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  return {
    canQuantify: false,
    nextTime: next,
    hoursRemaining: remaining / (1000 * 60 * 60),
    text: `${hours}小时${minutes}分钟后可量化`
  }
}
