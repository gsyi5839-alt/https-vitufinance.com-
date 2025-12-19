/**
 * 用户行为追踪工具
 * 记录用户在前端的页面访问和按钮点击等行为
 */

// 获取存储的推荐码
const getReferralCode = () => {
  return localStorage.getItem('vitu_referral_code') || null
}

// 获取当前钱包地址
const getWalletAddress = () => {
  return localStorage.getItem('walletAddress') || null
}

/**
 * 记录用户行为
 * @param {string} actionType - 行为类型
 * @param {object} actionDetail - 行为详情
 * @param {string} pageUrl - 页面URL（可选，默认当前URL）
 */
export const trackBehavior = async (actionType, actionDetail = {}, pageUrl = null) => {
  try {
    const data = {
      wallet_address: getWalletAddress(),
      action_type: actionType,
      action_detail: actionDetail,
      page_url: pageUrl || window.location.pathname,
      referral_code: getReferralCode()
    }
    
    // 使用 fetch 发送请求（sendBeacon 的 Content-Type 问题导致后端无法解析）
      fetch('/api/track-behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      keepalive: true  // 页面卸载时也能发送
      }).catch(() => {})
  } catch (e) {
    // 静默失败，不影响用户体验
    console.debug('[Tracker] Error:', e.message)
  }
}

/**
 * 记录页面访问
 * @param {string} pageName - 页面名称
 */
export const trackPageView = (pageName) => {
  trackBehavior('page_view', { page: pageName })
}

/**
 * 记录按钮点击
 * @param {string} buttonName - 按钮名称
 * @param {object} extra - 额外信息
 */
export const trackClick = (buttonName, extra = {}) => {
  trackBehavior('click', { button: buttonName, ...extra })
}

/**
 * 记录钱包连接
 * @param {string} walletAddress - 钱包地址
 */
export const trackWalletConnect = (walletAddress) => {
  trackBehavior('wallet_connect', { wallet: walletAddress })
}

/**
 * 记录充值
 * @param {number} amount - 充值金额
 */
export const trackDeposit = (amount) => {
  trackBehavior('deposit', { amount })
}

/**
 * 记录机器人购买
 * @param {string} robotName - 机器人名称
 * @param {number} price - 价格
 */
export const trackRobotPurchase = (robotName, price) => {
  trackBehavior('robot_purchase', { robot: robotName, price })
}

/**
 * 记录量化操作
 * @param {string} robotName - 机器人名称
 */
export const trackQuantify = (robotName) => {
  trackBehavior('quantify', { robot: robotName })
}

/**
 * 记录提款申请
 * @param {number} amount - 提款金额
 */
export const trackWithdraw = (amount) => {
  trackBehavior('withdraw', { amount })
}

/**
 * 记录推荐链接访问
 * @param {string} referralCode - 推荐码
 */
export const trackReferralVisit = (referralCode) => {
  trackBehavior('referral_visit', { code: referralCode })
}

export default {
  trackBehavior,
  trackPageView,
  trackClick,
  trackWalletConnect,
  trackDeposit,
  trackRobotPurchase,
  trackQuantify,
  trackWithdraw,
  trackReferralVisit
}

