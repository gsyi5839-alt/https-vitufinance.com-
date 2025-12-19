<template>
  <div class="follow-page">
    <!-- 公告横幅 -->
    <AnnouncementBanner />

    <!-- 总量卡片 -->
    <section class="total-card">
      <div class="card-header">
        <h2 class="card-title">{{ t('followPage.totalValueLabel') }}</h2>
        <span class="badge" @click="goToCaption">{{ t('followPage.captionLabel') }}</span>
      </div>
      <div class="total-amount">$ {{ animatedAmount }}</div>
      <h3 class="card-subtitle">{{ t('followPage.aiRobotTitle') }}</h3>
      <p class="card-description">
        {{ t('followPage.description') }}
      </p>
    </section>

    <!-- 标签页导航 -->
    <section class="robot-tabs">
      <button 
        v-for="tab in robotTabs" 
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </section>

    <!-- 内容区域 -->
    <section class="content-container">
      <transition name="fade" mode="out-in">
        <!-- Grid-Robots 内容 - 动态渲染 -->
        <div v-if="activeTab === 'grid'" key="grid" class="robot-list">
          <div v-if="loadingGridRobots" class="loading-state">
            <p class="loading-text">{{ t('common.loading') }}</p>
          </div>
          <div 
            v-else
            v-for="robot in gridRobots" 
            :key="robot.robot_id"
            class="robot-card"
          >
            <div class="robot-header">
              <img src="/static/CEX-Robots/图标.png" alt="Binance" class="robot-logo" />
              <h3 class="robot-name">{{ robot.name }}</h3>
            </div>
            
            <div class="robot-info">
              <div class="info-row">
                <span class="info-label">{{ t('followPage.arbitrageOrders') }}</span>
                <span class="info-value">{{ robot.arbitrage_orders }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.dailyProfit') }}</span>
                <span class="info-value">{{ robot.displayDailyProfit }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.totalReturnMaturity') }}</span>
                <span class="info-value">{{ robot.displayTotalReturn }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.operationCycle') }}</span>
                <span class="info-value">{{ robot.displayDuration }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.limitedUnits') }}</span>
                <span class="info-value">{{ robot.limit }}</span>
              </div>
            </div>

            <div class="robot-footer">
              <div class="robot-price">
                <span class="price-amount">{{ formatRobotPrice(robot.price) }}</span>
                <span class="price-currency">USDT</span>
              </div>
              <button 
                class="enable-button" 
                :class="{ 'purchased': isPurchasedToday(robot.name) }"
                :disabled="isPurchasedToday(robot.name)"
                @click="handleOpenClick(robot.price, robot.name)"
              >
                {{ isPurchasedToday(robot.name) ? t('followPage.purchased') : t('followPage.openButton') }}
              </button>
            </div>
          </div>
        </div>

        <!-- High-Robots 内容 - 动态渲染 -->
        <div v-else-if="activeTab === 'high'" key="high" class="robot-list">
          <div v-if="loadingHighRobots" class="loading-state">
            <p class="loading-text">{{ t('common.loading') }}</p>
          </div>
          <div 
            v-else
            v-for="robot in highRobots" 
            :key="robot.robot_id"
            class="robot-card"
          >
            <div class="robot-header">
              <img src="/static/CEX-Robots/图标.png" alt="Binance" class="robot-logo" />
              <h3 class="robot-name">{{ robot.name }}</h3>
            </div>
            
            <div class="robot-info">
              <div class="info-row">
                <span class="info-label">{{ t('followPage.arbitrageOrders') }}</span>
                <span class="info-value">{{ robot.arbitrage_orders }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.dailyProfit') }}</span>
                <span class="info-value">{{ robot.displayDailyProfit }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.totalReturnMaturity') }}</span>
                <span class="info-value">{{ robot.displayTotalReturn }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.operationCycle') }}</span>
                <span class="info-value">{{ robot.displayDuration }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">{{ t('followPage.depositReturnNote') }}</span>
              </div>
            </div>

            <div class="robot-footer">
              <div class="robot-price">
                <span class="price-amount price-underline">{{ robot.displayPrice }}</span>
                <span class="price-currency">USDT</span>
              </div>
              <button 
                class="enable-button" 
                :class="{ 'purchased': isPurchasedToday(robot.name) }"
                :disabled="isPurchasedToday(robot.name)"
                @click="handleHighRobotClick(robot)"
              >
                {{ isPurchasedToday(robot.name) ? t('followPage.purchased') : t('followPage.openButton') }}
              </button>
            </div>
          </div>
        </div>

        <!-- My Robot 内容 -->
        <div v-else-if="activeTab === 'my'" key="my" class="robot-list">
          <!-- 无机器人提示 -->
          <div v-if="myRobots.length === 0" class="empty-state">
            <p class="empty-text">{{ t('followPage.noMyRobots') }}</p>
          </div>
          <!-- 机器人列表 -->
          <FollowMyRobotCard 
            v-for="robot in myRobots"
            :key="robot.id"
            :robot="robot"
            :is-quantifying="quantifyingRobots[robot.id]"
            :quantified-today="quantifiedToday[robot.id]"
            :is-quantified="robot.is_quantified === 1"
            :last-earnings="lastEarnings[robot.id] || 0"
            :next-quantify-time="nextQuantifyTime[robot.id] || ''"
            :hours-remaining="hoursRemaining[robot.id] || 0"
            @quantify="handleQuantify"
            @animation-complete="handleAnimationComplete"
          />
        </div>

        <!-- Expired Robot 内容 -->
        <div v-else-if="activeTab === 'expired'" key="expired" class="robot-list">
          <!-- 无过期机器人提示 -->
          <div v-if="expiredRobots.length === 0" class="empty-state">
            <p class="empty-text">{{ t('followPage.noExpiredRobots') }}</p>
          </div>
          <!-- 过期机器人列表 -->
          <FollowExpiredRobotCard 
            v-for="robot in expiredRobots"
            :key="robot.id"
            :robot="robot"
          />
    </div>
      </transition>
    </section>

    <BottomNav />

    <!-- 钱包未连接提示弹窗 -->
    <div v-if="showWalletPrompt" class="prompt-overlay" @click="closeWalletPrompt">
      <div class="prompt-container" @click.stop>
        <div class="prompt-title">{{ t('followPage.promptTitle') }}</div>
        <div class="prompt-content">{{ t('followPage.walletNotExist') }}</div>
        <div class="prompt-buttons">
          <button class="btn-cancel" @click="closeWalletPrompt">{{ t('followPage.cancelBtn') }}</button>
          <button class="btn-sure" @click="goToWallet">{{ t('followPage.goToWallet') }}</button>
        </div>
      </div>
    </div>

    <!-- USDT余额不足提示弹窗 -->
    <div v-if="showUSDTPrompt" class="prompt-overlay" @click="closeUSDTPrompt">
      <div class="prompt-container" @click.stop>
        <div class="prompt-title">{{ t('followPage.promptTitle') }}</div>
        <div class="prompt-content">{{ t('followPage.insufficientBalance') }}</div>
        <div class="prompt-buttons">
          <button class="btn-cancel" @click="closeUSDTPrompt">{{ t('followPage.cancelBtn') }}</button>
          <button class="btn-sure" @click="goToWallet">{{ t('followPage.depositBtn') }}</button>
        </div>
      </div>
    </div>

    <!-- High-Robot 金额输入弹窗 -->
    <div v-if="showAmountInput" class="prompt-overlay" @click="closeAmountInput">
      <div class="amount-input-container" @click.stop>
        <div class="prompt-title">{{ selectedHighRobot?.name }}</div>
        <div class="robot-info-summary">
          <p>{{ t('followPage.dailyProfitLabel') }}: {{ selectedHighRobot?.displayDailyProfit }}</p>
          <p>{{ t('followPage.durationLabel') }}: {{ selectedHighRobot?.displayDuration }}</p>
          <p>{{ t('followPage.amountRangeLabel') }}: {{ selectedHighRobot?.min_price }} - {{ selectedHighRobot?.max_price }} USDT</p>
          <p class="expected-return">
            {{ t('followPage.expectedReturn') || '预期收益' }}: 
            <span class="highlight">{{ expectedReturnText }}</span>
          </p>
        </div>
        <div class="amount-input-group">
          <input 
            type="number" 
            v-model="inputAmount" 
            :placeholder="t('followPage.enterAmountPlaceholder')"
            class="amount-input"
            @input="updateExpectedReturn"
          />
          <span class="amount-currency">USDT</span>
        </div>
        <p v-if="amountError" class="amount-error">{{ amountError }}</p>
        <div class="prompt-buttons">
          <button class="btn-cancel" @click="closeAmountInput">{{ t('followPage.cancelBtn') }}</button>
          <button class="btn-sure" @click="confirmHighRobotPurchase">{{ t('followPage.confirmBtn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Follow 页面 - Grid/High 机器人
 * 
 * 功能：
 * - 动态加载 Grid-Robots / High-Robots 机器人配置
 * - 使用算法计算每个机器人的收益
 * - 购买机器人（检查钱包连接和余额）
 * - 显示我的机器人和已过期机器人
 * - 量化操作：Grid每天量化返利，High只量化一次到期返还
 */
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import BottomNav from '@/components/BottomNav.vue'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'
import FollowMyRobotCard from '@/components/follow/FollowMyRobotCard.vue'
import FollowExpiredRobotCard from '@/components/follow/FollowExpiredRobotCard.vue'
import { useWalletStore } from '@/stores/wallet'
import { ensureReferralBound } from '@/utils/wallet'
import { post } from '@/api/secureApi'

// 导入机器人数学工具
import {
    calculateGridReturn,
    calculateHighReturn,
    formatDuration,
    formatAmount,
    formatRate,
    formatPriceRange,
    validateHighAmount,
    validateBalance
} from '@/utils/followCalc'

const { t } = useI18n()
const router = useRouter()

// 钱包 store
const walletStore = useWalletStore()

// ==================== 机器人配置数据 ====================
const gridRobots = ref([])      // Grid 机器人列表
const highRobots = ref([])      // High 机器人列表
const loadingGridRobots = ref(false)
const loadingHighRobots = ref(false)

// ==================== 自动刷新相关 ====================
let dataRefreshInterval = null
const DATA_REFRESH_INTERVAL = 30000 // 30秒自动刷新一次

// 当前激活的标签
const activeTab = ref('grid')

// 弹窗状态
const showWalletPrompt = ref(false)
const showUSDTPrompt = ref(false)
const showAmountInput = ref(false)

// High-Robots 金额输入相关
const selectedHighRobot = ref(null)
const inputAmount = ref('')
const amountError = ref('')
const expectedReturn = ref(null)

// 预期收益文本
const expectedReturnText = computed(() => {
    if (!expectedReturn.value) return '-'
    return `${formatAmount(expectedReturn.value.totalProfit, 2)} USDT (${formatRate(expectedReturn.value.totalReturnRate)})`
})

// 我的机器人列表
const myRobots = ref([])
const expiredRobots = ref([])

// 量化状态
const quantifyingRobots = reactive({})
const quantifiedToday = reactive({})
const lastEarnings = reactive({})
// 下次可量化时间
const nextQuantifyTime = reactive({})
// 剩余小时数
const hoursRemaining = reactive({})
// 存储量化结果，等待动画完成后显示
const pendingQuantifyResults = reactive({})

// 今日已购买的机器人列表（用于限购检查）
const purchasedToday = ref([])

// ==================== 机器人配置加载 ====================

/**
 * 加载 Grid 机器人配置
 * 使用算法计算每个机器人的收益显示
 */
const loadGridRobots = async () => {
    loadingGridRobots.value = true
    try {
        const response = await fetch('/api/robot/config?type=grid')
        const data = await response.json()
        
        if (data.success && data.data) {
            // 使用算法处理每个机器人配置
            gridRobots.value = data.data.map(robot => {
                // 调用算法计算收益
                const calc = calculateGridReturn(
                    robot.price,
                    robot.daily_profit,
                    robot.duration_hours
                )
                
                return {
                    ...robot,
                    // 算法计算结果
                    calc,
                    // 格式化显示字段
                    displayPrice: formatAmount(robot.price, 0),
                    displayDuration: formatDuration(robot.duration_hours),
                    displayDailyProfit: formatRate(robot.daily_profit),
                    displayTotalReturn: formatAmount(calc.totalProfit, 0) + ' USDT'
                }
            })
            console.log('[Follow] ✅ Grid robots loaded:', gridRobots.value.length)
        }
    } catch (error) {
        console.error('[Follow] Failed to load grid robots:', error)
    } finally {
        loadingGridRobots.value = false
    }
}

/**
 * 加载 High 机器人配置
 * 使用算法计算每个机器人的收益显示
 */
const loadHighRobots = async () => {
    loadingHighRobots.value = true
    try {
        const response = await fetch('/api/robot/config?type=high')
        const data = await response.json()
        
        if (data.success && data.data) {
            // 使用算法处理每个机器人配置
            highRobots.value = data.data.map(robot => {
                // 调用算法计算收益（使用最低金额作为示例）
                const calc = calculateHighReturn(
                    robot.min_price,
                    robot.daily_profit,
                    robot.duration_hours
                )
                
                return {
                    ...robot,
                    // 算法计算结果
                    calc,
                    // 格式化显示字段
                    displayPrice: formatPriceRange(robot.min_price, robot.max_price),
                    displayDuration: formatDuration(robot.duration_hours),
                    displayDailyProfit: formatRate(robot.daily_profit),
                    displayTotalReturn: formatRate(calc.totalReturnRate)
                }
            })
            console.log('[Follow] ✅ High robots loaded:', highRobots.value.length)
        }
    } catch (error) {
        console.error('[Follow] Failed to load high robots:', error)
    } finally {
        loadingHighRobots.value = false
    }
}

/**
 * 格式化机器人价格显示
 */
const formatRobotPrice = (price) => {
    return formatAmount(price, 0)
}

/**
 * 更新预期收益（High机器人金额输入时）
 */
const updateExpectedReturn = () => {
    if (!selectedHighRobot.value || !inputAmount.value) {
        expectedReturn.value = null
        return
    }
    
    const amount = parseFloat(inputAmount.value)
    if (isNaN(amount) || amount <= 0) {
        expectedReturn.value = null
        return
    }
    
    // 使用算法计算预期收益
    expectedReturn.value = calculateHighReturn(
        amount,
        selectedHighRobot.value.daily_profit,
        selectedHighRobot.value.duration_hours
    )
}

// 标签配置 - 使用翻译键
const robotTabs = computed(() => [
  { id: 'grid', label: t('followPage.tabs.gridRobots') },
  { id: 'high', label: t('followPage.tabs.highRobots') },
  { id: 'my', label: t('followPage.tabs.myRobot') },
  { id: 'expired', label: t('followPage.tabs.expiredRobot') }
])

// 当前显示的金额
const SIMULATED_BASE = 146503014.41 // 模拟基础金额（固定值，永不改变）
const baseAmount = ref(SIMULATED_BASE) // 确保初始化为模拟基础值
const currentAmount = ref(0)

// 格式化金额显示
const animatedAmount = computed(() => {
  return currentAmount.value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
})

// 金额增长动画
let animationInterval = null

/**
 * 加载量化总金额
 * 总金额 = 模拟基础金额（固定）+ 真实用户购买金额（从数据库统计）
 * 
 * 保证：即使API失败，也会显示模拟基础金额，数据永不丢失
 */
const loadTotalAmount = async () => {
  try {
    // 获取真实用户购买的总投资
    const response = await fetch('/api/platform/total-investments', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    // 确保响应成功
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success && data.data && data.data.follow_page_total) {
      const realUserInvestment = parseFloat(data.data.follow_page_total) || 0
      
      // 总金额 = 模拟基础值（固定）+ 真实用户投资（动态）
      baseAmount.value = SIMULATED_BASE + realUserInvestment
      
      console.log('[Follow] ✅ Total amount loaded:', {
        simulated: SIMULATED_BASE.toLocaleString(),
        realUser: realUserInvestment.toLocaleString(),
        total: baseAmount.value.toLocaleString()
      })
    } else {
      // API返回格式错误时，保持模拟基础值
      console.warn('[Follow] ⚠️ API response invalid, using simulated base only')
      baseAmount.value = SIMULATED_BASE
    }
  } catch (error) {
    // 任何错误都不影响显示，始终保证模拟基础值可用
    console.warn('[Follow] ⚠️ Failed to load real user investment, using simulated base only:', error.message)
    baseAmount.value = SIMULATED_BASE
  }
}

// 随机增长金额（模拟实时变化）
const getRandomIncrement = () => {
  return Math.floor(Math.random() * 10000) + 1000
}

// 平滑增长动画
const smoothIncrement = (targetValue) => {
  const startValue = currentAmount.value
  const difference = targetValue - startValue
  const duration = 2000 // 2秒完成增长
  const steps = 60 // 60帧
  const increment = difference / steps
  let currentStep = 0

  const timer = setInterval(() => {
    currentStep++
    currentAmount.value += increment
    
    if (currentStep >= steps) {
      currentAmount.value = targetValue
      clearInterval(timer)
    }
  }, duration / steps)
}

// 启动自动增长
const startAutoIncrement = () => {
  animationInterval = setInterval(() => {
    const increment = getRandomIncrement()
    const newAmount = currentAmount.value + increment
    smoothIncrement(newAmount)
  }, 10000) // 每10秒增长一次
}

// 跳转到说明页面
const goToCaption = () => {
  router.push('/robot/caption')
}

/**
 * Grid-Robots: 点击 Open 按钮（固定价格）
 * @param {number} price - 机器人价格
 * @param {string} robotName - 机器人名称
 */
const handleOpenClick = async (price = 0, robotName = '') => {
  // 1. 检查钱包是否连接
  if (!walletStore.isConnected) {
    console.log('[Follow] Wallet not connected')
    showWalletPrompt.value = true
    return
  }
  
  // 2. 从平台获取用户余额
  try {
    const response = await fetch(`/api/user/balance?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (!data.success) {
      console.log('[Follow] Failed to fetch balance')
      showWalletPrompt.value = true
      return
    }
    
    const usdtBalance = parseFloat(data.data.usdt_balance) || 0
    
    // 3. 使用算法验证余额
    const balanceCheck = validateBalance(usdtBalance, price)
    if (!balanceCheck.valid) {
      console.log('[Follow] Insufficient USDT balance:', usdtBalance, 'required:', price)
      showUSDTPrompt.value = true
      return
    }
    
    // 4. 余额足够，执行购买
    console.log('[Follow] Purchasing robot:', robotName, 'price:', price)
    await purchaseRobot(price, robotName)
    
  } catch (error) {
    console.error('[Follow] Error checking balance:', error)
    showWalletPrompt.value = true
  }
}

/**
 * High-Robots: 点击 Open 按钮（范围价格，需要输入金额）
 * @param {object} robot - 机器人配置对象
 */
const handleHighRobotClick = (robot) => {
  // 1. 检查钱包是否连接
  if (!walletStore.isConnected) {
    console.log('[Follow] Wallet not connected')
    showWalletPrompt.value = true
    return
  }
  
  // 显示金额输入弹窗
  selectedHighRobot.value = robot
  inputAmount.value = ''
  amountError.value = ''
  expectedReturn.value = null
  showAmountInput.value = true
}

/**
 * 确认 High-Robot 购买
 */
const confirmHighRobotPurchase = async () => {
  if (!selectedHighRobot.value) return
  
  const amount = parseFloat(inputAmount.value)
  const { name, min_price, max_price } = selectedHighRobot.value
  
  // 使用算法验证金额
  const validation = validateHighAmount(amount, min_price, max_price)
  if (!validation.valid) {
    amountError.value = validation.error
    return
  }
  
  // 检查余额
  try {
    const response = await fetch(`/api/user/balance?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (!data.success) {
      amountError.value = t('common.error')
      return
    }
    
    const usdtBalance = parseFloat(data.data.usdt_balance) || 0
    
    // 使用算法验证余额
    const balanceCheck = validateBalance(usdtBalance, amount)
    if (!balanceCheck.valid) {
      amountError.value = t('followPage.insufficientBalanceDetail', { amount: usdtBalance.toFixed(4) })
      return
    }
    
    // 购买
    showAmountInput.value = false
    await purchaseRobot(amount, name)
    
  } catch (error) {
    console.error('[Follow] Error:', error)
    amountError.value = t('followPage.purchaseFailed')
  }
}

/**
 * 购买机器人
 * @param {number} price - 机器人价格
 * @param {string} robotName - 机器人名称
 */
const purchaseRobot = async (price, robotName) => {
  try {
    // 确保推荐关系已绑定（防止漏发推荐奖励）
    await ensureReferralBound()

    // 使用安全API工具发送请求（自动包含CSRF令牌）
    const data = await post('/api/robot/purchase', {
      wallet_address: walletStore.walletAddress,
      robot_name: robotName,
      price: price
    })

    if (data.success) {
      // 购买成功，更新余额
      walletStore.setUsdtBalance(data.data.new_balance)
      ElMessageBox.alert(
        t('followPage.purchaseSuccess', { name: robotName }),
        t('followPage.promptTitle'),
        {
          confirmButtonText: t('followPage.sureBtn') || 'OK',
          type: 'success'
        }
      )
      // 刷新今日购买记录和机器人列表
      await fetchTodayPurchases()
      await fetchMyRobots()
      // 切换到"我的机器人"标签
      activeTab.value = 'my'
    } else {
      // 检查是否是每日限购错误
      if (data.data?.daily_limit_reached) {
        alert(t('followPage.dailyLimitReached') || 'You can only purchase one of this robot per day')
      } else {
        alert(data.message || t('followPage.purchaseFailed'))
      }
    }
  } catch (error) {
    console.error('[Follow] Purchase error:', error)
    alert(t('followPage.purchaseFailed'))
  }
}

// 关闭钱包提示弹窗
const closeWalletPrompt = () => {
  showWalletPrompt.value = false
}

// 关闭余额不足提示弹窗
const closeUSDTPrompt = () => {
  showUSDTPrompt.value = false
}

// 跳转到钱包页面充值
const goToWallet = () => {
  showWalletPrompt.value = false
  showUSDTPrompt.value = false
  router.push('/wallet')
}

// 关闭金额输入弹窗
const closeAmountInput = () => {
  showAmountInput.value = false
  selectedHighRobot.value = null
  inputAmount.value = ''
  amountError.value = ''
  expectedReturn.value = null
}

/**
 * 获取用户今日已购买的机器人列表（用于限购检查）
 */
const fetchTodayPurchases = async () => {
  if (!walletStore.isConnected) {
    purchasedToday.value = []
    return
  }
  
  try {
    const response = await fetch(`/api/follow/today-purchases?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      purchasedToday.value = data.data.purchased_today || []
    }
  } catch (error) {
    console.error('[Follow] Failed to fetch today purchases:', error)
    purchasedToday.value = []
  }
}

/**
 * 检查某个机器人今天是否已购买
 * @param {string} robotName - 机器人名称
 * @returns {boolean} 是否已购买
 */
const isPurchasedToday = (robotName) => {
  return purchasedToday.value.includes(robotName)
}

/**
 * 获取用户购买的机器人列表（Follow页面专用：grid和high类型）
 */
const fetchMyRobots = async () => {
  if (!walletStore.isConnected) {
    myRobots.value = []
    return
  }
  
  try {
    const response = await fetch(`/api/follow/my?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      myRobots.value = data.data || []
      // 检查每个机器人的量化状态
      for (const robot of myRobots.value) {
        await checkQuantifyStatus(robot.id, robot.robot_type)
      }
    }
  } catch (error) {
    console.error('[Follow] Failed to fetch my robots:', error)
    myRobots.value = []
  }
}

/**
 * 获取用户过期的机器人列表（Follow页面专用）
 */
const fetchExpiredRobots = async () => {
  if (!walletStore.isConnected) {
    expiredRobots.value = []
    return
  }
  
  try {
    const response = await fetch(`/api/follow/expired?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      expiredRobots.value = data.data || []
    }
  } catch (error) {
    console.error('[Follow] Failed to fetch expired robots:', error)
    expiredRobots.value = []
  }
}

/**
 * 检查机器人量化状态（24小时间隔）
 * @param {number} robotPurchaseId - 机器人购买记录ID
 * @param {string} robotType - 机器人类型
 */
const checkQuantifyStatus = async (robotPurchaseId, robotType) => {
  try {
    const response = await fetch(
      `/api/robot/quantify-status?wallet_address=${walletStore.walletAddress}&robot_purchase_id=${robotPurchaseId}`
    )
    const data = await response.json()
    
    if (data.success) {
      quantifiedToday[robotPurchaseId] = data.data.quantified_today
      // 存储下次量化时间和剩余小时数
      nextQuantifyTime[robotPurchaseId] = data.data.next_quantify_time || ''
      hoursRemaining[robotPurchaseId] = parseFloat(data.data.hours_remaining) || 0
    }
  } catch (error) {
    console.error('[Follow] Failed to check quantify status:', error)
  }
}

/**
 * 执行量化操作
 * @param {Object} robot - 机器人对象
 */
const handleQuantify = async (robot) => {
  if (quantifyingRobots[robot.id]) return
  
  quantifyingRobots[robot.id] = true
  // 清除之前的待处理结果
  delete pendingQuantifyResults[robot.id]
  
  try {
    // 确保推荐关系已绑定（防止漏发推荐奖励）
    await ensureReferralBound()
    
    const response = await fetch('/api/robot/quantify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        robot_purchase_id: robot.id
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // 更新量化状态
      quantifiedToday[robot.id] = true
      
      // 对于 Grid 机器人，设置下次可量化时间（24小时后）- 使用本地时间格式
      if (robot.robot_type === 'grid') {
        const nextTime = new Date()
        nextTime.setHours(nextTime.getHours() + 24)
        // Format as local time string (YYYY-MM-DD HH:MM:SS) to match backend format
        const year = nextTime.getFullYear()
        const month = String(nextTime.getMonth() + 1).padStart(2, '0')
        const day = String(nextTime.getDate()).padStart(2, '0')
        const hours = String(nextTime.getHours()).padStart(2, '0')
        const minutes = String(nextTime.getMinutes()).padStart(2, '0')
        const seconds = String(nextTime.getSeconds()).padStart(2, '0')
        nextQuantifyTime[robot.id] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        hoursRemaining[robot.id] = 24
      }
      
      // 记录收益用于显示
      if (data.data.earnings) {
        lastEarnings[robot.id] = parseFloat(data.data.earnings)
      }
      
      // 如果是普通机器人（非High），更新余额
      if (robot.robot_type !== 'high') {
        walletStore.setUsdtBalance(data.data.new_balance)
      }
      
      // 刷新机器人列表
      await fetchMyRobots()
      
      // 存储成功结果（等动画完成后再处理）
      pendingQuantifyResults[robot.id] = {
        success: true,
        robotType: robot.robot_type
      }
    } else {
      if (data.data?.already_quantified) {
        quantifiedToday[robot.id] = true
        // 更新下次可量化时间和剩余小时数
        if (data.data.next_quantify_time) {
          nextQuantifyTime[robot.id] = data.data.next_quantify_time
        }
        if (data.data.hours_remaining) {
          hoursRemaining[robot.id] = parseFloat(data.data.hours_remaining)
        }
        pendingQuantifyResults[robot.id] = {
          success: false,
          message: data.message || t('followPage.alreadyQuantified') || t('robotPage.alreadyQuantified')
        }
      } else {
        pendingQuantifyResults[robot.id] = {
          success: false,
          message: data.message || t('followPage.quantifyFailed')
        }
      }
    }
  } catch (error) {
    console.error('[Follow] Quantify error:', error)
    pendingQuantifyResults[robot.id] = {
      success: false,
      message: t('followPage.quantifyFailed')
    }
  }
  // 注意：不在这里设置 quantifyingRobots[robot.id] = false
  // 等待动画完成后再设置
}

/**
 * 处理量化动画完成
 * @param {string} robotId - 机器人购买记录ID
 */
const handleAnimationComplete = (robotId) => {
  // 动画完成后，设置 quantifying 状态为 false
  quantifyingRobots[robotId] = false
  
  // 检查是否有待显示的失败结果
  const result = pendingQuantifyResults[robotId]
  if (result && !result.success) {
    // 只有失败时才显示alert
    alert(result.message)
  }
  // 成功的情况由组件内的收益弹窗处理
  
  // 清除待处理结果
  delete pendingQuantifyResults[robotId]
}

// 监听标签切换，加载对应数据
watch(activeTab, async (newTab) => {
  if (newTab === 'my') {
    await fetchMyRobots()
  } else if (newTab === 'expired') {
    await fetchExpiredRobots()
  } else if (newTab === 'grid') {
    // 切换到 Grid 时加载配置和今日购买记录
    if (gridRobots.value.length === 0) {
      await loadGridRobots()
    }
    await fetchTodayPurchases()
  } else if (newTab === 'high') {
    // 切换到 High 时加载配置和今日购买记录
    if (highRobots.value.length === 0) {
      await loadHighRobots()
    }
    await fetchTodayPurchases()
  }
})

// 监听钱包连接状态变化
watch(() => walletStore.isConnected, async (connected) => {
  if (connected) {
    // 钱包连接后刷新今日购买记录
    await fetchTodayPurchases()
    if (activeTab.value === 'my') {
      await fetchMyRobots()
    } else if (activeTab.value === 'expired') {
      await fetchExpiredRobots()
    }
    startDataAutoRefresh()
  } else {
    stopDataAutoRefresh()
  }
})

// ==================== 自动刷新方法 ====================

/**
 * 刷新所有数据
 */
const refreshAllData = async () => {
  if (!walletStore.isConnected) return
  console.log('[Follow] 自动刷新数据...')
  await Promise.all([
    loadTotalAmount(),
    fetchTodayPurchases(),
    fetchMyRobots(),
    fetchExpiredRobots()
  ])
}

/**
 * 启动数据自动刷新定时器
 */
const startDataAutoRefresh = () => {
  stopDataAutoRefresh()
  dataRefreshInterval = setInterval(() => {
    if (walletStore.isConnected) {
      refreshAllData()
    }
  }, DATA_REFRESH_INTERVAL)
}

/**
 * 停止数据自动刷新定时器
 */
const stopDataAutoRefresh = () => {
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval)
    dataRefreshInterval = null
  }
}

/**
 * 页面可见性变化处理
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && walletStore.isConnected) {
    console.log('[Follow] 页面变为可见，刷新数据...')
    refreshAllData()
  }
}

// 组件挂载时启动动画
onMounted(async () => {
  // 先加载总金额，再启动动画
  await loadTotalAmount()
  
  // 加载 Grid 机器人配置（默认标签）
  await loadGridRobots()
  
  // 启动初始动画
  const startAmount = 100000000 // 从1亿开始
  const startTime = performance.now()
  const animationDuration = 2000
  
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / animationDuration, 1)
    const easedProgress = easeOutQuart(progress)
    currentAmount.value = startAmount + (baseAmount.value - startAmount) * easedProgress
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      currentAmount.value = baseAmount.value
      startAutoIncrement()
    }
  }
  
  requestAnimationFrame(animate)
  
  // 监听页面可见性
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 如果钱包已连接，加载今日购买记录
  if (walletStore.isConnected) {
    fetchTodayPurchases()
    if (activeTab.value === 'my') {
      fetchMyRobots()
    }
    startDataAutoRefresh()
  }
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (animationInterval) {
    clearInterval(animationInterval)
  }
  stopDataAutoRefresh()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.follow-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a1e 0%, #0f0f12 100%);
  padding: 120px 0 100px 0;
}

/* 总量卡片样式 */
.total-card {
  background: linear-gradient(135deg, #2a2a2e 0%, #1f1f23 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  width: 350px;
  height: 184px;
  padding: 16px 14px;
  margin: 0 auto 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: rgb(255, 255, 255);
  margin: 0;
}

.badge {
  background: rgb(245, 182, 56);
  color: rgb(255, 255, 255);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.badge:hover {
  background: rgb(255, 192, 76);
  transform: translateY(-1px);
}

.badge:active {
  transform: scale(0.95);
}

.total-amount {
  width: 231.42px;
  height: 45px;
  font-size: 28px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  line-height: 45px;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.card-subtitle {
  width: 308px;
  height: 19px;
  font-size: 14px;
  font-weight: 600;
  color: rgb(255, 255, 255);
  line-height: 19px;
  margin: 0 0 6px 0;
}

.card-description {
  width: 322px;
  height: auto;
  max-height: 52px;
  font-size: 11px;
  line-height: 17px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .follow-page {
    padding: 110px 0 100px 0;
  }

  .total-card {
    width: calc(100% - 32px);
    max-width: 350px;
    height: auto;
    min-height: 184px;
    padding: 16px 14px;
  }

  .total-amount {
    font-size: 28px;
    width: 100%;
  }

  .card-subtitle {
    width: 100%;
  }

  .card-description {
    width: 100%;
  }
}

@media (max-width: 400px) {
  .total-card {
    width: calc(100% - 24px);
    padding: 14px 12px;
  }

  .card-title {
    font-size: 11px;
  }

  .badge {
    font-size: 10px;
    padding: 3px 10px;
  }

  .total-amount {
    font-size: 24px;
  }

  .card-subtitle {
    font-size: 13px;
  }

  .card-description {
    font-size: 10px;
    line-height: 16px;
  }
}

/* 标签页导航样式 */
.robot-tabs {
  display: flex;
  gap: 4px;
  padding: 0;
  margin: 0 auto 16px;
  width: 350px;
  height: 33px;
  align-items: center;
  justify-content: space-between;
}

.tab-button {
  background: transparent;
  border: none;
  border-radius: 6px;
  flex: 1;
  height: 33px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  color: rgb(184, 184, 184);
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button.active {
  background: rgb(245, 182, 56);
  color: rgb(255, 255, 255);
  font-weight: 600;
}

.tab-button:hover:not(.active) {
  color: rgb(220, 220, 220);
}

/* 内容区域 */
.content-container {
  width: 100%;
  padding: 0 12px;
  box-sizing: border-box;
  min-height: 300px;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.coming-soon {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

/* 加载状态样式 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}

.loading-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin: 0;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  background: linear-gradient(135deg, rgba(42, 42, 46, 0.6) 0%, rgba(31, 31, 35, 0.6) 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  margin: 0 16px;
}

.empty-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin: 0;
}

/* 机器人列表 */
.robot-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* 机器人卡片 */
.robot-card {
  width: 100%;
  max-width: 350px;
  height: 225px;
  background-image: url('/static/CEX-Robots/机器人背景图.png');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  border: none;
  border-radius: 12px;
  padding: 14px 18px 20px 18px;
  box-sizing: border-box;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.robot-card:hover {
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15);
  transform: translateY(-2px);
}

/* 机器人头部 */
.robot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.robot-logo {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: contain;
  background: transparent;
}

.robot-name {
  font-size: 16px;
  font-weight: 700;
  color: rgb(245, 182, 56);
  margin: 0;
  line-height: 1.2;
}

/* 机器人信息 */
.robot-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  width: 100%;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.info-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.info-value {
  font-size: 12px;
  font-weight: 600;
  color: rgb(255, 255, 255);
  text-align: right;
}

/* 机器人底部 */
.robot-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  flex-shrink: 0;
}

.robot-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price-amount {
  font-size: 24px;
  font-weight: 700;
  color: rgb(51, 190, 135);
}

/* High-Robots价格下划线 */
.price-underline {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.price-currency {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

/* Open 按钮 */
.enable-button {
  background: linear-gradient(90deg, rgb(245, 182, 56) 0%, rgb(255, 193, 77) 100%);
  border: none;
  border-radius: 6px;
  width: 108px;
  height: 32px;
  font-size: 14px;
  font-weight: 600;
  color: rgb(255, 255, 255);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(245, 166, 35, 0.3);
}

.enable-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.5);
}

.enable-button:active {
  transform: scale(0.98);
}

/* 已购买状态 */
.enable-button.purchased {
  background: rgba(128, 128, 128, 0.5);
  color: rgba(255, 255, 255, 0.6);
  cursor: not-allowed;
  box-shadow: none;
}

.enable-button.purchased:hover {
  transform: none;
  box-shadow: none;
}

.enable-button:disabled {
  cursor: not-allowed;
}

/* 弹窗样式 */
.prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10080;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.prompt-container {
  width: 349px;
  min-height: 167px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  box-shadow: 0 6px 6px rgba(0, 0, 0, 0.99);
  padding: 20px 24px;
  box-sizing: border-box;
  animation: scaleIn 0.2s ease-out;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.amount-input-container {
  width: 349px;
  min-height: 320px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  box-shadow: 0 6px 6px rgba(0, 0, 0, 0.99);
  padding: 20px 24px;
  box-sizing: border-box;
  animation: scaleIn 0.2s ease-out;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.prompt-title {
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: rgb(245, 182, 56);
  margin-bottom: 12px;
}

.prompt-content {
  font-size: 15px;
  font-weight: 400;
  text-align: center;
  color: #ffffff;
  margin-bottom: 16px;
  line-height: 1.4;
  padding: 0 10px;
}

.robot-info-summary {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
}

.robot-info-summary p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.robot-info-summary p:last-child {
  margin-bottom: 0;
}

.robot-info-summary .expected-return {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.robot-info-summary .highlight {
  color: rgb(51, 190, 135);
  font-weight: 600;
}

.amount-input-group {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 4px;
}

.amount-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-size: 16px;
  color: #ffffff;
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.amount-currency {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: rgb(245, 182, 56);
}

.amount-error {
  color: #ff6b6b;
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.prompt-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-top: auto;
}

.btn-cancel {
  flex: 1;
  height: 42px;
  background: rgba(150, 150, 150, 0.8);
  border: none;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(130, 130, 130, 0.9);
}

.btn-cancel:active {
  transform: scale(0.98);
}

.btn-sure {
  flex: 1;
  height: 42px;
  background: rgb(245, 182, 56);
  border: none;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-sure:hover {
  background: rgb(255, 192, 66);
}

.btn-sure:active {
  transform: scale(0.98);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端标签适配 */
@media (max-width: 768px) {
  .robot-tabs {
    width: calc(100% - 32px);
    max-width: 350px;
  }

  .tab-button {
    font-size: 9px;
    padding: 0 4px;
  }

  .robot-card {
    padding: 14px 16px 20px 16px;
  }

  .enable-button {
    width: 104px;
    height: 30px;
    font-size: 13px;
  }
}

@media (max-width: 400px) {
  .robot-tabs {
    width: calc(100% - 24px);
  }

  .tab-button {
    font-size: 8px;
    padding: 0 3px;
  }

  .robot-card {
    height: auto;
    min-height: 225px;
    padding: 12px 14px 18px 14px;
  }

  .robot-name {
    font-size: 14px;
  }

  .robot-logo {
    width: 20px;
    height: 20px;
  }

  .info-label,
  .info-value {
    font-size: 11px;
  }

  .price-amount {
    font-size: 22px;
  }

  .price-currency {
    font-size: 13px;
  }

  .enable-button {
    width: 100px;
    height: 28px;
    font-size: 12px;
  }
}
</style>
