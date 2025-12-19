<template>
  <div class="invite-page">
    <!-- 公告栏 -->
    <div class="announcement-banner" @click="goToAnnouncement">
      <svg class="icon-speaker" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1L3 5H1V11H3L8 15V1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M11 5.5C11.5 6 12 7 12 8C12 9 11.5 10 11 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M13 3.5C14 4.5 15 6 15 8C15 10 14 11.5 13 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <div class="announcement-text-container">
        <span class="announcement-text">{{ t('invitePage.announcement') }}</span>
      </div>
      <span class="icon-arrow">›</span>
    </div>

    <!-- 主卡片 -->
    <div class="main-card">
      <!-- 右侧手指图片 -->
      <img src="/static/YAOQI/1.png" alt="Hand" class="hand-image" loading="lazy" />
      
      <!-- 标题区域 -->
      <div class="title-section">
        <h1 class="card-title">{{ t('invitePage.worldAlbot') }}</h1>
        <p class="card-subtitle">{{ t('invitePage.aiRobot') }}</p>
      </div>
      
      <!-- 圆形图标 -->
      <div class="icon-container">
        <img src="/static/YAOQI/2.png" alt="Icon" class="center-icon" loading="lazy" />
      </div>
      
      <!-- 等级标题 -->
      <h2 class="level-title">{{ t('invitePage.formalEmployee') }}</h2>
      
      <!-- 进度区域 -->
      <!-- 进度条 1 - 直推人数 -->
      <div class="progress-section">
        <div class="progress-info">
          <span class="progress-label">{{ t('invitePage.directMembersProgress') || '直推人数' }}</span>
          <span class="progress-value">{{ inviteStats.inviteProgress }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: inviteStats.progressPercent + '%' }"></div>
        </div>
      </div>
      
      <!-- 进度条 2 - 团队业绩（充值金额） -->
      <div class="progress-section">
        <div class="progress-info">
          <span class="progress-label">{{ t('invitePage.performanceProgress') || '团队业绩' }}</span>
          <span class="progress-value">{{ formatPerformance(inviteStats.totalPerformance) }} / {{ formatPerformance(inviteStats.performanceTarget) }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: inviteStats.performancePercent + '%' }"></div>
        </div>
      </div>
      
      <!-- 按钮 -->
      <button class="level-btn" @click="goToLevelIntroduction">{{ t('invitePage.levelIntroduction') }}</button>
    </div>

    <!-- 第二个容器 - 432 x 465 -->
    <div class="second-card">
      <!-- 礼物盒图标和标题 -->
      <div class="invite-header">
        <!-- 抽奖图标容器（带跳动动画和提示文字） -->
        <div class="gift-icon-wrapper">
          <span class="gift-hint-text">{{ t('invitePage.clickToLottery') || '点击我抽奖' }}</span>
        <img 
          src="/static/YAOQI/3.png" 
          alt="Gift" 
            class="gift-icon clickable bounce-animation" 
          loading="lazy"
          @click="openLuckyWheel"
          title="点击进入幸运转盘"
        />
        </div>
        <div class="invite-header-text">
          <h3 class="invite-title">{{ t('invitePage.inviteFriendTitle') }}</h3>
          <p class="invite-subtitle">{{ t('invitePage.inviteFriendSubtitle') }}</p>
        </div>
      </div>

      <!-- CEX-Robots 推荐奖励 -->
      <div class="rewards-section">
        <h2 class="rewards-title">{{ t('invitePage.cexReferralTitle') }}</h2>
        <p class="rewards-desc">{{ t('invitePage.cexReferralDesc') }}</p>
        <p class="rewards-levels">{{ t('invitePage.cexReferralLevels') }}</p>
        <p class="rewards-example">{{ t('invitePage.cexReferralExample') }}</p>
      </div>

      <!-- DEX-Robots 推荐奖励 -->
      <div class="rewards-section">
        <h2 class="rewards-title">{{ t('invitePage.dexReferralTitle') }}</h2>
        <p class="rewards-desc">{{ t('invitePage.dexReferralDesc') }}</p>
        <p class="rewards-item">{{ t('invitePage.dexLevel1') }}</p>
        <p class="rewards-item">{{ t('invitePage.dexLevel2') }}</p>
        <p class="rewards-item">{{ t('invitePage.dexLevel3') }}</p>
      </div>
    </div>

    <!-- 第三个容器 - 邀请链接复制区域 -->
    <div class="third-card">
      <!-- 左侧文字区域 - 321 x 69 -->
      <div class="wenzi">
        <span class="invite-link-text">{{ displayInviteLink }}</span>
      </div>
      
      <!-- 右侧复制按钮区域 - 75 x 75 -->
      <div class="anniu" @click="copyInviteLink">
        <img src="/static/YAOQI/6.png" alt="Copy" class="animg" loading="lazy" />
      </div>
      
      <!-- 复制成功提示 -->
      <transition name="fade">
        <div v-if="showCopySuccess" class="copy-success-toast">
          ✓ {{ t('invitePage.copySuccess') }}
        </div>
      </transition>
    </div>

    <!-- 第四个容器 - 团队等级收入和成员 -->
    <div class="fourth-card">
      <!-- 左侧卡片 - 247.94 x 102 -->
      <div class="item1111 item-left">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.teamDailyIncome }}</p>
          <p class="item-label">{{ t('invitePage.dailyTotalIncome') }}</p>
        </div>
      </div>
      
      <!-- 右侧卡片 - 178.34 x 102 -->
      <div class="item1111 item-right">
        <div class="item-content">
          <p class="item-value">{{ inviteStats.teamMembers }}</p>
          <p class="item-label">{{ t('invitePage.teamMember') }}</p>
        </div>
      </div>
    </div>

    <!-- 第五个容器 - 社区充值和直推会员 -->
    <div class="fifth-card">
      <!-- 左侧卡片 - 196.97 x 94 -->
      <div class="item1111 item-equal">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.totalRecharge }}</p>
          <p class="item-label">{{ t('invitePage.totalRecharge') }}</p>
        </div>
      </div>
      
      <!-- 右侧卡片 - 196.97 x 94 -->
      <div class="item1111 item-equal">
        <div class="item-content">
          <p class="item-value">{{ inviteStats.directMembers }}</p>
          <p class="item-label">{{ t('invitePage.directMembers') }}</p>
        </div>
      </div>
    </div>

    <!-- 第六个容器 - 社区提款和业绩 -->
    <div class="sixth-card">
      <!-- 左侧卡片 - 196.97 x 94 -->
      <div class="item1111 item-equal">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.totalWithdrawals }}</p>
          <p class="item-label">{{ t('invitePage.totalWithdrawals') }}</p>
        </div>
      </div>
      
      <!-- 右侧卡片 - 196.97 x 94 -->
      <div class="item1111 item-equal">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.totalPerformance }}</p>
          <p class="item-label">{{ t('invitePage.totalPerformance') }}</p>
        </div>
      </div>
    </div>

    <!-- 第七个容器 - 推荐和团队奖励 -->
    <div class="seventh-card">
      <!-- 左侧卡片 - 196.97 x 94 - 点击查看明细 -->
      <div class="item1111 item-equal clickable-card" @click="openReferralRewardsPopup">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.totalReferralReward }}</p>
          <p class="item-label">{{ t('invitePage.totalReferralReward') }}</p>
          <span class="view-details-hint">{{ t('invitePage.clickToViewDetails') || 'Click to view details' }} ›</span>
        </div>
      </div>
      
      <!-- 右侧卡片 - 196.97 x 94 -->
      <div class="item1111 item-equal">
        <div class="item-content">
          <p class="item-value">${{ inviteStats.totalTeamReward }}</p>
          <p class="item-label">{{ t('invitePage.totalTeamReward') }}</p>
        </div>
      </div>
    </div>

    <!-- 推荐奖励明细弹窗 -->
    <div v-if="showReferralRewardsPopup" class="referral-rewards-overlay" @click.self="closeReferralRewardsPopup">
      <div class="referral-rewards-popup">
        <div class="popup-header">
          <h3 class="popup-title">{{ t('invitePage.referralRewardsDetail') || 'Referral Rewards Detail' }}</h3>
          <button class="popup-close" @click="closeReferralRewardsPopup">×</button>
        </div>
        <div class="popup-content">
          <!-- 加载中 -->
          <div v-if="loadingReferralRecords" class="loading-state">
            <span class="loading-spinner"></span>
            <p>{{ t('common.loading') || 'Loading...' }}</p>
          </div>
          <!-- 无记录 -->
          <div v-else-if="referralRecords.length === 0" class="empty-state">
            <p>{{ t('invitePage.noReferralRecords') || 'No referral rewards yet' }}</p>
          </div>
          <!-- 记录列表 -->
          <div v-else class="records-list">
            <div v-for="record in referralRecords" :key="record.id" class="reward-record-card">
              <div class="record-header">
                <span class="record-type">
                  {{ record.source_type === 'quantify' 
                    ? (t('invitePage.quantifyReward') || 'Quantify Reward') 
                    : (t('invitePage.maturityReward') || 'Maturity Reward') 
                  }}
                </span>
                <span class="record-level">Level {{ record.level }}</span>
              </div>
              <div class="record-body">
                <div class="record-info">
                  <span class="record-from">{{ t('invitePage.fromUser') || 'From' }}: {{ formatWalletAddress(record.from_wallet) }}</span>
                  <span class="record-robot" v-if="record.robot_name">{{ record.robot_name }}</span>
                  <span class="record-time">{{ formatDateTime(record.created_at) }}</span>
                </div>
                <div class="record-amount">+{{ record.reward_amount }} USDT</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 第八个容器 - 社区成员详情按钮 -->
    <div class="eighth-card" @click="goToCommunityMembers">
      <img src="/static/two/浏览器标签页图标.png" alt="Community" class="community-icon" />
      <span class="community-text">{{ t('invitePage.communityMemberDetails') }}</span>
    </div>

    <BottomNav />
    
    <!-- 抽奖转盘弹窗 -->
    <LuckyWheelPopup 
      :visible="showLuckyWheel" 
      @close="closeLuckyWheel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import LuckyWheelPopup from '@/components/LuckyWheelPopup.vue'
import { useWalletStore } from '@/stores/wallet'
import { ensureReferralBound } from '@/utils/wallet'

// 导入团队等级计算工具
import {
    BROKER_LEVELS,
    calculateBrokerLevel,
    calculateUpgradeGap,
    calculateBrokerRewards,
    projectEarnings,
    getLevelColor,
    getLevelProgress
} from '@/utils/teamCalc'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const walletStore = useWalletStore()

// 定时刷新相关
let refreshInterval = null
const REFRESH_INTERVAL = 30000 // 30秒自动刷新一次

// 抽奖弹窗状态
const showLuckyWheel = ref(false)

// 打开抽奖弹窗
const openLuckyWheel = () => {
  showLuckyWheel.value = true
}

// 关闭抽奖弹窗
const closeLuckyWheel = () => {
  showLuckyWheel.value = false
}

// 邀请数据
const inviteStats = ref({
  teamDailyIncome: '0.0000',
  teamMembers: 0,
  totalRecharge: '0.0000',
  directMembers: 0,        // 直接邀请的人数
  qualifiedMembers: 0,     // 合格的直推成员（购买>=20U机器人）
  totalWithdrawals: '0.0000',
  totalPerformance: '0.0000',   // 团队业绩 = 团队总充值金额
  performanceTarget: 1000,      // 业绩目标（升级到下一级需要的业绩）
  performancePercent: 0,        // 业绩进度百分比
  totalReferralReward: '0.0000',
  totalTeamReward: '0.0000',
  inviteProgress: '0 / 5', // 默认Level 0的目标是5人
  progressPercent: 0,
  brokerLevel: 0,          // 经纪人等级 (0-5)
  inviteTarget: 5          // 邀请目标（升级到下一级需要的人数）
})

/**
 * 获取经纪人等级显示文本
 */
const brokerLevelText = computed(() => {
  const level = inviteStats.value.brokerLevel
  if (level === 0) return t('invitePage.regularUser') || 'Regular User'
  return `${t('invitePage.brokerLevel') || 'Level'} ${level}`
})

/**
 * 获取当前等级配置（使用团队数学工具）
 */
const currentLevelConfig = computed(() => {
  return BROKER_LEVELS[inviteStats.value.brokerLevel] || BROKER_LEVELS[0]
})

/**
 * 计算升级差距（使用团队数学工具）
 */
const upgradeGapInfo = computed(() => {
  const userData = {
    directReferrals: inviteStats.value.qualifiedMembers || 0,
    teamPerformance: parseFloat(inviteStats.value.totalPerformance) || 0,
    subBrokerCounts: [0, 0, 0, 0, 0, 0] // TODO: 从后端获取各级经纪人数量
  }
  return calculateUpgradeGap(userData)
})

/**
 * 计算当前等级30天收益预测
 */
const earningsProjection = computed(() => {
  return projectEarnings(inviteStats.value.brokerLevel, 30)
})

/**
 * 获取当前等级颜色
 */
const levelColor = computed(() => {
  return getLevelColor(inviteStats.value.brokerLevel)
})

/**
 * 格式化业绩显示（简化大数字）
 * @param {string|number} value - 业绩数值
 * @returns {string} 格式化后的业绩显示
 */
const formatPerformance = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toFixed(0)
}

// 复制成功提示
const showCopySuccess = ref(false)

// 推荐奖励明细弹窗
const showReferralRewardsPopup = ref(false)
const referralRecords = ref([])
const loadingReferralRecords = ref(false)

/**
 * 生成邀请码（基于钱包地址的前8位）
 */
const inviteCode = computed(() => {
  if (walletStore.isConnected && walletStore.walletAddress) {
    // 取钱包地址的后8位作为邀请码
    return walletStore.walletAddress.slice(-8).toLowerCase()
  }
  return ''
})

/**
 * 生成完整的邀请链接
 */
const inviteLink = computed(() => {
  if (inviteCode.value) {
    return `${window.location.origin}/?ref=${inviteCode.value}`
  }
  return 'Connect wallet to get invite link'
})

/**
 * 显示的邀请链接文本（截断显示）
 */
const displayInviteLink = computed(() => {
  if (!walletStore.isConnected) {
    return t('invitePage.connectWalletHint')
  }
  const link = inviteLink.value
  if (link.length > 40) {
    return link.substring(0, 35) + '...'
  }
  return link
})

// 跳转到公告页
const goToAnnouncement = () => {
  router.push('/announcement')
}

// 跳转到 Level Introduction 页面
const goToLevelIntroduction = () => {
  router.push('/invite/level-introduction')
}

// 跳转到社区成员详情页面
const goToCommunityMembers = () => {
  router.push('/invite/community-members')
}

/**
 * 打开推荐奖励明细弹窗
 */
const openReferralRewardsPopup = async () => {
  if (!walletStore.isConnected) {
    alert(t('invitePage.connectWalletFirst'))
    return
  }
  showReferralRewardsPopup.value = true
  await fetchReferralRecords()
}

/**
 * 关闭推荐奖励明细弹窗
 */
const closeReferralRewardsPopup = () => {
  showReferralRewardsPopup.value = false
}

/**
 * 获取推荐奖励明细记录
 */
const fetchReferralRecords = async () => {
  if (!walletStore.walletAddress) return
  
  loadingReferralRecords.value = true
  try {
    const response = await fetch(`/api/referral-rewards/history?wallet_address=${walletStore.walletAddress}&limit=50`)
    const data = await response.json()
    
    if (data.success) {
      referralRecords.value = data.data || []
    } else {
      referralRecords.value = []
    }
  } catch (error) {
    console.error('[Invite] Failed to fetch referral records:', error)
    referralRecords.value = []
  } finally {
    loadingReferralRecords.value = false
  }
}

/**
 * 格式化钱包地址
 */
const formatWalletAddress = (address) => {
  if (!address || address.length < 15) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

/**
 * 复制邀请链接
 */
const copyInviteLink = async () => {
  if (!walletStore.isConnected) {
    alert(t('invitePage.connectWalletFirst'))
    return
  }
  
  const link = inviteLink.value
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link)
    } else {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    
    // 显示复制成功提示
    showCopySuccess.value = true
    setTimeout(() => {
      showCopySuccess.value = false
    }, 2000)
    
    console.log('[Invite] Link copied:', link)
  } catch (err) {
    console.error('[Invite] Copy failed:', err)
    alert(t('invitePage.copyFailed'))
  }
}

/**
 * 获取邀请统计数据
 * 从后端获取真实的邀请人数和统计数据
 */
const fetchInviteStats = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress) {
    return
  }
  
  try {
    const response = await fetch(`/api/invite/stats?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      // 获取真实数据
      const directMembers = parseInt(data.data.direct_members) || 0           // 所有直接邀请的人数
      const qualifiedMembers = parseInt(data.data.qualified_direct_members) || 0  // 合格的直推（购买>=20U机器人）
      const brokerLevel = parseInt(data.data.broker_level) || 0
      const inviteTarget = parseInt(data.data.invite_target) || 5
      const totalPerformance = parseFloat(data.data.total_performance || 0)   // 团队业绩 = 团队总充值
      
      // 业绩目标根据当前等级确定下一级需要的业绩
      // Level 0 -> Level 1: 1000, Level 1 -> Level 2: 5000, etc.
      const performanceTargets = [1000, 5000, 20000, 80000, 200000, 500000]
      const performanceTarget = performanceTargets[Math.min(brokerLevel, 5)]
      
      // 计算进度百分比（基于直接邀请人数，用于进度条显示）
      const progressPercent = inviteTarget > 0 
        ? Math.min((directMembers / inviteTarget) * 100, 100) 
        : 0
      
      // 计算业绩进度百分比
      const performancePercent = performanceTarget > 0
        ? Math.min((totalPerformance / performanceTarget) * 100, 100)
        : 0
      
      console.log('[Invite] Stats loaded:', {
        directMembers,
        qualifiedMembers,
        brokerLevel,
        inviteTarget,
        progressPercent,
        totalPerformance,
        performanceTarget,
        performancePercent
      })
      
      inviteStats.value = {
        teamDailyIncome: parseFloat(data.data.team_daily_income || 0).toFixed(4),
        teamMembers: parseInt(data.data.team_members) || 0,
        totalRecharge: parseFloat(data.data.total_recharge || 0).toFixed(4),
        directMembers: directMembers,           // 显示所有直接邀请人数
        qualifiedMembers: qualifiedMembers,     // 合格的直推成员
        totalWithdrawals: parseFloat(data.data.total_withdrawals || 0).toFixed(4),
        totalPerformance: totalPerformance.toFixed(4),   // 团队业绩 = 团队总充值
        performanceTarget: performanceTarget,             // 业绩目标
        performancePercent: performancePercent,           // 业绩进度百分比
        totalReferralReward: parseFloat(data.data.total_referral_reward || 0).toFixed(4),
        totalTeamReward: parseFloat(data.data.total_team_reward || 0).toFixed(4),
        inviteProgress: `${directMembers} / ${inviteTarget}`,  // 显示直接邀请人数/目标
        progressPercent: progressPercent,
        brokerLevel: brokerLevel,
        inviteTarget: inviteTarget
      }
    }
  } catch (error) {
    console.error('[Invite] Failed to fetch stats:', error)
  }
}

// 注意：推荐关系绑定逻辑已统一移至 @/utils/wallet.js 中的 ensureReferralBound 函数
// 这里直接调用统一的函数，避免重复绑定

// 监听钱包连接状态
watch(() => walletStore.isConnected, (connected) => {
  if (connected) {
    fetchInviteStats()
    ensureReferralBound()
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

/**
 * 启动自动刷新定时器
 * 每30秒自动刷新一次邀请统计数据
 */
const startAutoRefresh = () => {
  stopAutoRefresh() // 先清除旧的定时器
  refreshInterval = setInterval(() => {
    if (walletStore.isConnected && walletStore.walletAddress) {
      console.log('[Invite] 自动刷新邀请统计数据...')
      fetchInviteStats()
    }
  }, REFRESH_INTERVAL)
}

/**
 * 停止自动刷新定时器
 */
const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

/**
 * 页面可见性变化处理
 * 当用户从其他页面/标签页返回时，立即刷新数据
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && walletStore.isConnected) {
    console.log('[Invite] 页面变为可见，刷新数据...')
    fetchInviteStats()
  }
}

onMounted(() => {
  if (walletStore.isConnected) {
    fetchInviteStats()
    ensureReferralBound()
    startAutoRefresh()
  }
  
  // 监听页面可见性变化，当用户从其他页面返回时刷新数据
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  // 清理定时器和事件监听
  stopAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a1e 0%, #0f0f12 100%);
  padding: 120px 0 100px 0;
}

/* 公告栏样式 */
.announcement-banner {
  background: rgb(29, 33, 41);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  padding: 12px 16px;
  margin: 0 auto 16px;
  max-width: 358px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;
}

.announcement-banner:hover {
  background: rgb(35, 40, 50);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.icon-speaker {
  color: rgb(255, 255, 255);
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.announcement-text-container {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.announcement-text {
  color: rgb(255, 255, 255);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-arrow {
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  flex-shrink: 0;
  font-weight: 300;
}

/* 主卡片样式 - 432 x 301 */
.main-card {
  width: 432px;
  height: 301px;
  background: rgba(0, 0, 0, 0);
  background-image: linear-gradient(135deg, #2a2d35 0%, #1f2229 100%);
  border-radius: 12px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 右侧手指图片 - 调整位置对准地球图标 */
.hand-image {
  position: absolute;
  top: 85px;
  right: -10px;
  width: 240px;
  height: 185px;
  object-fit: contain;
  z-index: 3;
  pointer-events: none;
}

/* 标题区域 */
.title-section {
  width: 392px;
  text-align: center;
  position: relative;
  z-index: 2;
}

/* World AIbot */
.card-title {
  width: 394px;
  height: 34px;
  font-size: 20px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0;
  line-height: 34px;
}

/* AI Trend Quantitative Robot */
.card-subtitle {
  width: 392px;
  height: 12px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin: 5px 0 0 0;
  line-height: 12px;
}

/* 圆形图标容器 */
.icon-container {
  width: 100px;
  height: 100px;
  margin: 12px 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-icon {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

/* Formal Employee */
.level-title {
  width: 392px;
  height: 18px;
  font-size: 16px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  text-align: center;
  margin: 0 0 10px 0;
  line-height: 18px;
}

/* 进度区域 */
.progress-section {
  width: 392px;
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

/* Invite a friend */
.progress-label {
  font-size: 13px;
  line-height: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 0/0 */
.progress-value {
  font-size: 13px;
  line-height: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 进度条 */
.progress-bar {
  width: 392px;
  height: 10px;
  background: #ebeef5;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(245, 182, 56), #ffc107);
  border-radius: 4.5px;
  transition: width 0.3s ease;
}

/* Level Introduction 按钮 */
.level-btn {
  width: 200px;
  height: 28px;
  background: linear-gradient(90deg, rgb(245, 182, 56), #ffc107);
  border: none;
  border-radius: 2px;
  color: #1a1a1e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  line-height: 28px;
  padding: 0;
}

.level-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
}

.level-btn:active {
  transform: scale(0.98);
}

/* 第二个容器样式 - 432 x 465 */
.second-card {
  width: 432px;
  height: auto;
  min-height: 465px;
  background: rgba(0, 0, 0, 0);
  background-image: linear-gradient(135deg, #2a2d35 0%, #1f2229 100%);
  border-radius: 12px;
  margin: 20px auto 0;
  padding: 24px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 邀请头部区域 */
.invite-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

/* 抽奖图标容器（包含图标和提示文字） */
.gift-icon-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* 提示文字样式 */
.gift-hint-text {
  font-size: 11px;
  font-weight: 600;
  color: #ff6b35;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  animation: pulse-text 2s ease-in-out infinite;
}

/* 文字脉动动画 */
@keyframes pulse-text {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.gift-icon {
  width: 75px;
  height: 75px;
  object-fit: contain;
  flex-shrink: 0;
}

.gift-icon.clickable {
  cursor: pointer;
  transition: transform 0.3s ease, filter 0.3s ease;
}

/* 跳动动画 */
.gift-icon.bounce-animation {
  animation: gentle-bounce 3s ease-in-out infinite;
}

/* 温和的跳动动画 - 每3秒跳一次 */
@keyframes gentle-bounce {
  0%, 90%, 100% {
    transform: translateY(0);
  }
  92% {
    transform: translateY(-8px);
  }
  96% {
    transform: translateY(-4px);
  }
}

.gift-icon.clickable:hover {
  transform: scale(1.1);
  filter: brightness(1.2);
  animation: none; /* 悬停时暂停跳动动画 */
}

.gift-icon.clickable:active {
  transform: scale(0.95);
  animation: none;
}

.invite-header-text {
  flex: 1;
}

.invite-title {
  font-size: 18px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.invite-subtitle {
  font-size: 13px;
  font-weight: 500;
  color: rgb(76, 175, 80);
  margin: 0;
  line-height: 1.4;
}

/* 奖励区域 */
.rewards-section {
  margin-bottom: 20px;
}

.rewards-section:last-child {
  margin-bottom: 0;
}

.rewards-title {
  font-size: 16px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0 0 10px 0;
  line-height: 1.4;
}

.rewards-desc {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.rewards-levels {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 8px 0;
  line-height: 1.6;
  display: block;
}

.level-item {
  display: inline;
}

.level-item::after {
  content: " ";
}

.rewards-example {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  line-height: 1.6;
}

.rewards-item {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 6px 0;
  line-height: 1.6;
}

.rewards-item:last-child {
  margin-bottom: 0;
}

/* 第三个容器样式 - 邀请链接复制区域 */
.third-card {
  width: 432px;
  height: auto;
  margin: 20px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* 左侧文字区域 - 321 x 69 */
.wenzi {
  width: 321px;
  height: 69px;
  background: rgba(0, 0, 0, 0);
  background-image: linear-gradient(135deg, #2a2d35 0%, #1f2229 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.invite-link-text {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  word-break: break-all;
  line-height: 1.4;
}

/* 右侧复制按钮区域 - 75 x 75 */
.anniu {
  width: 75px;
  height: 75px;
  background: linear-gradient(90deg, rgb(245, 182, 56), #ffc107);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.anniu:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
}

.anniu:active {
  transform: scale(0.95);
}

/* 复制图标 - 28 x 27 */
.animg {
  width: 28px;
  height: 27px;
  object-fit: contain;
}

/* 复制成功提示 */
.copy-success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: #4CAF50;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  z-index: 10000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 第四个容器 - 团队等级收入和成员 */
.fourth-card {
  width: 432px;
  height: auto;
  margin: 12px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

/* 通用卡片样式 item1111 */
.item1111 {
  height: 102px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

/* 左侧卡片 - 247.94 x 102 */
.item-left {
  width: 247.94px;
  background-image: url('/static/YAOQI/5.png');
}

/* 右侧卡片 - 178.34 x 102 */
.item-right {
  width: 178.34px;
  background-image: url('/static/YAOQI/5.png');
}

/* 卡片内容 */
.item-content {
  width: 100%;
  text-align: center;
  z-index: 1;
}

/* 数值 */
.item-value {
  font-size: 20px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0 0 8px 0;
  line-height: 1.2;
}

/* 标签 */
.item-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.4;
}

/* 等宽卡片 - 196.97 x 94 */
.item-equal {
  width: 196.97px;
  height: 94px;
  background-image: url('/static/YAOQI/5.png');
}

/* 第五个容器 - 社区充值和直推会员 */
.fifth-card {
  width: 432px;
  height: auto;
  margin: 12px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

/* 第六个容器 - 社区提款和业绩 */
.sixth-card {
  width: 432px;
  height: auto;
  margin: 12px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

/* 第七个容器 - 推荐和团队奖励 */
.seventh-card {
  width: 432px;
  height: auto;
  margin: 12px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

/* 第八个容器样式 - 社区成员详情按钮 (291 x 110) */
.eighth-card {
  width: 291px;
  height: 110px;
  margin: 20px auto 0;
  background: linear-gradient(90deg, rgb(245, 182, 56), #ffc107);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(245, 182, 56, 0.3);
  position: relative;
}

.eighth-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 182, 56, 0.4);
}

.eighth-card:active {
  transform: scale(0.98);
}

/* 社区图标 (20 x 20) */
.community-icon {
  width: 20px;
  height: 20px;
  margin-bottom: 8px;
  object-fit: contain;
}

/* 社区文字 */
.community-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1e;
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.5px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .invite-page {
    padding: 110px 0 100px 0;
  }

  .announcement-banner {
    max-width: calc(100% - 32px);
    margin: 0 16px 16px;
    padding: 10px 14px;
    min-height: 40px;
  }
  
  .icon-speaker {
    width: 16px;
    height: 16px;
  }
  
  .announcement-text {
    font-size: 12px;
  }
  
  .icon-arrow {
    font-size: 18px;
  }

  .main-card {
    width: calc(100% - 32px);
    max-width: 432px;
    height: auto;
    min-height: 260px;
    margin: 0 auto;
    padding: 16px;
  }

  .title-section {
    width: 100%;
  }

  .card-title {
    width: 100%;
    font-size: 18px;
  }

  .card-subtitle {
    width: 100%;
    font-size: 10px;
  }

  .icon-container {
    width: 85px;
    height: 85px;
    margin: 10px 0 8px 0;
  }

  .center-icon {
    width: 85px;
    height: 85px;
  }

  .level-title {
    width: 100%;
    font-size: 14px;
  }

  .progress-section {
    width: 100%;
  }

  .progress-bar {
    width: 100%;
  }

  .level-btn {
    width: 180px;
    height: 26px;
    font-size: 12px;
    line-height: 26px;
  }

  .hand-image {
    width: 170px;
    height: 130px;
    right: -15px;
    top: 55px;
  }

  .second-card {
    width: calc(100% - 32px);
    max-width: 432px;
    height: auto;
    min-height: 400px;
    margin: 16px auto 0;
    padding: 20px;
  }

  .gift-icon {
    width: 65px;
    height: 65px;
  }

  .gift-hint-text {
    font-size: 10px;
  }

  .invite-title {
    font-size: 16px;
  }

  .invite-subtitle {
    font-size: 12px;
  }

  .rewards-title {
    font-size: 15px;
  }

  .rewards-desc,
  .rewards-example,
  .rewards-item {
    font-size: 11px;
  }

  .rewards-levels {
    font-size: 10px;
  }

  .third-card {
    width: calc(100% - 32px);
    max-width: 432px;
    margin: 16px auto 0;
    gap: 12px;
  }

  .wenzi {
    flex: 1;
    min-width: 0;
    height: 60px;
  }

  .invite-link-text {
    font-size: 12px;
  }

  .anniu {
    width: 65px;
    height: 65px;
  }

  .animg {
    width: 26px;
    height: 25px;
  }

  .fourth-card,
  .fifth-card,
  .sixth-card,
  .seventh-card {
    width: calc(100% - 32px);
    max-width: 432px;
    margin: 10px auto 0;
    gap: 8px;
  }

  .item1111 {
    height: 90px;
    padding: 10px;
  }

  .item-left {
    flex: 1.39;
    min-width: 0;
  }

  .item-right {
    flex: 1;
    min-width: 0;
  }

  .item-equal {
    flex: 1;
    min-width: 0;
    height: 85px;
  }

  .item-value {
    font-size: 18px;
    margin-bottom: 6px;
  }

  .item-label {
    font-size: 10px;
  }

  .eighth-card {
    width: calc(100% - 32px);
    max-width: 291px;
    height: 100px;
    margin: 16px auto 0;
  }

  .community-icon {
    width: 18px;
    height: 18px;
    margin-bottom: 6px;
  }

  .community-text {
    font-size: 15px;
  }
}

/* 小屏幕适配 */
@media (max-width: 400px) {
  .main-card {
    width: calc(100% - 24px);
    padding: 14px;
    min-height: 240px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-subtitle {
    font-size: 9px;
  }

  .icon-container {
    width: 75px;
    height: 75px;
    margin: 8px 0 6px 0;
  }

  .center-icon {
    width: 75px;
    height: 75px;
  }

  .level-title {
    font-size: 13px;
  }

  .progress-label,
  .progress-value {
    font-size: 11px;
  }

  .progress-bar {
    height: 8px;
  }

  .level-btn {
    width: 160px;
    height: 24px;
    font-size: 11px;
    line-height: 24px;
  }

  .hand-image {
    width: 140px;
    height: 108px;
    right: -12px;
    top: 48px;
  }

  .second-card {
    width: calc(100% - 24px);
    min-height: 360px;
    padding: 18px;
  }

  .gift-icon {
    width: 55px;
    height: 55px;
  }

  .gift-hint-text {
    font-size: 9px;
  }

  .invite-title {
    font-size: 15px;
  }

  .invite-subtitle {
    font-size: 11px;
  }

  .rewards-title {
    font-size: 14px;
  }

  .rewards-desc,
  .rewards-example,
  .rewards-item {
    font-size: 10px;
  }

  .rewards-levels {
    font-size: 9px;
  }

  .third-card {
    width: calc(100% - 24px);
    gap: 10px;
  }

  .wenzi {
    height: 55px;
  }

  .invite-link-text {
    font-size: 11px;
  }

  .anniu {
    width: 60px;
    height: 60px;
  }

  .animg {
    width: 24px;
    height: 23px;
  }

  .fourth-card,
  .fifth-card,
  .sixth-card,
  .seventh-card {
    width: calc(100% - 24px);
    gap: 6px;
    margin: 8px auto 0;
  }

  .item1111 {
    height: 85px;
    padding: 8px;
  }

  .item-equal {
    height: 80px;
  }

  .item-value {
    font-size: 16px;
    margin-bottom: 5px;
  }

  .item-label {
    font-size: 9px;
  }

  .eighth-card {
    width: calc(100% - 24px);
    height: 95px;
    margin: 12px auto 0;
  }

  .community-icon {
    width: 16px;
    height: 16px;
    margin-bottom: 5px;
  }

  .community-text {
    font-size: 14px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 340px) {
  .announcement-banner {
    margin: 0 10px 10px;
    padding: 8px 10px;
  }
  
  .announcement-text {
    font-size: 10px;
  }

  .main-card {
    width: calc(100% - 20px);
    padding: 12px;
    min-height: 220px;
  }

  .card-title {
    font-size: 15px;
  }

  .icon-container {
    width: 65px;
    height: 65px;
  }

  .center-icon {
    width: 65px;
    height: 65px;
  }

  .level-title {
    font-size: 12px;
  }

  .level-btn {
    width: 140px;
    height: 22px;
    font-size: 10px;
    line-height: 22px;
  }

  .hand-image {
    width: 115px;
    height: 88px;
    right: -8px;
    top: 42px;
  }

  .second-card {
    width: calc(100% - 20px);
    min-height: 340px;
    padding: 16px;
    margin: 12px auto 0;
  }

  .gift-icon {
    width: 50px;
    height: 50px;
  }

  .gift-hint-text {
    font-size: 8px;
  }

  .invite-title {
    font-size: 14px;
  }

  .invite-subtitle {
    font-size: 10px;
  }

  .rewards-title {
    font-size: 13px;
  }

  .rewards-desc,
  .rewards-example,
  .rewards-item {
    font-size: 9px;
  }

  .rewards-levels {
    font-size: 8px;
  }

  .third-card {
    width: calc(100% - 20px);
    gap: 8px;
  }

  .wenzi {
    height: 50px;
  }

  .invite-link-text {
    font-size: 10px;
  }

  .anniu {
    width: 55px;
    height: 55px;
  }

  .animg {
    width: 22px;
    height: 21px;
  }

  .fourth-card,
  .fifth-card,
  .sixth-card,
  .seventh-card {
    width: calc(100% - 20px);
    gap: 5px;
    margin: 8px auto 0;
  }

  .item1111 {
    height: 80px;
    padding: 8px;
    border-radius: 6px;
  }

  .item-equal {
    height: 75px;
  }

  .item-value {
    font-size: 15px;
    margin-bottom: 4px;
  }

  .item-label {
    font-size: 8px;
  }

  .eighth-card {
    width: calc(100% - 20px);
    height: 90px;
    margin: 10px auto 0;
  }

  .community-icon {
    width: 15px;
    height: 15px;
    margin-bottom: 4px;
  }

  .community-text {
    font-size: 13px;
  }
}

/* 可点击卡片样式 */
.clickable-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 182, 56, 0.3);
}

.clickable-card:active {
  transform: translateY(0);
}

.view-details-hint {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
  transition: color 0.2s ease;
}

.clickable-card:hover .view-details-hint {
  color: rgb(245, 182, 56);
}

/* 推荐奖励明细弹窗 */
.referral-rewards-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.referral-rewards-popup {
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  background: linear-gradient(135deg, #2a2a2e 0%, #1f1f23 100%);
  border: 1px solid rgba(245, 182, 56, 0.3);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: rgb(245, 182, 56);
  margin: 0;
}

.popup-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.popup-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.popup-content {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid rgba(245, 182, 56, 0.3);
  border-top-color: rgb(245, 182, 56);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reward-record-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  transition: all 0.2s ease;
}

.reward-record-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(245, 182, 56, 0.3);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-type {
  font-size: 13px;
  font-weight: 600;
  color: rgb(245, 182, 56);
}

.record-level {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  border-radius: 10px;
}

.record-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-from {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.record-robot {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.record-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.record-amount {
  font-size: 16px;
  font-weight: 700;
  color: #4ade80;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .referral-rewards-popup {
    width: 95%;
    max-height: 85vh;
  }

  .popup-header {
    padding: 14px 16px;
  }

  .popup-title {
    font-size: 16px;
  }

  .popup-content {
    padding: 12px;
  }

  .reward-record-card {
    padding: 10px 12px;
  }

  .record-type {
    font-size: 12px;
  }

  .record-amount {
    font-size: 14px;
  }

  .view-details-hint {
    font-size: 9px;
  }
}
</style>

