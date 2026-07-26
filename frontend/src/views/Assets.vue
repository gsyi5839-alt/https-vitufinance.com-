<template>
  <div class="assets-page">
    <div class="page-container">
      <!-- 主要卡片容器 - 带三层叠加效果 -->
      <div class="card-stack-wrapper">
        <!-- 第三层（最底部） -->
        <div class="card-layer card-layer-3"></div>
        <!-- 第二层 -->
        <div class="card-layer card-layer-2"></div>
        <!-- 第一层（主卡片） -->
        <div class="one-view">
          <!-- 标题 -->
          <div class="card-header">
            <!-- IMPORTANT:
              - USDT balance must be independent from WLD market price.
              - Do NOT display "equity (USDT + WLD valuation)" here to avoid user confusion and "jumping" numbers.
            -->
            <h2 class="equity-title">USDT {{ t('assetsPage.balance') }}</h2>
          </div>

          <!-- 主要金额显示 - 从钱包获取 USDT 余额（独立于 WLD 行情） -->
          <div class="equity-amount">
            <span class="amount-value">{{ walletStore.usdtBalance }}</span>
            <!-- 余额加载中显示 -->
            <span v-if="walletStore.isLoadingBalance" class="loading-indicator">...</span>
          </div>

          <!-- 今日盈亏 - 量化收益（点击查看明细） -->
          <div class="today-pnl clickable" @click="openQuantifyHistory">
            <span class="pnl-label">{{ t('assetsPage.todayPnl') }}</span>
            <span class="pnl-value" :class="{ positive: todayEarnings > 0 }">{{ formatTodayEarnings }} USDT</span>
            <span class="pnl-arrow">›</span>
          </div>

          <!-- 推荐奖励 - 只有大于0时显示 (使用精确数学比较) -->
          <div v-if="isPositive(totalReferralReward)" class="today-pnl clickable" @click="openDetailsDrawer('USDT')">
            <span class="pnl-label">{{ t('assetsPage.referralReward') || 'Referral Reward' }}</span>
            <span class="pnl-value positive">{{ formatAmount(totalReferralReward) }} USDT</span>
            <span class="pnl-arrow">›</span>
          </div>

          <!-- 团队奖励 - 只有大于0时显示 (使用精确数学比较) -->
          <div v-if="isPositive(totalTeamReward)" class="today-pnl clickable" @click="openDetailsDrawer('USDT')">
            <span class="pnl-label">{{ t('assetsPage.teamReward') || 'Team Reward' }}</span>
            <span class="pnl-value positive">{{ totalTeamReward }} USDT</span>
            <span class="pnl-arrow">›</span>
          </div>

          <!-- 资产列表 -->
          <div class="asset-list">
            <!-- USDT - 从钱包获取余额 -->
            <div class="asset-item">
              <div class="asset-left">
                <img src="/static/USDT/USDT.png" alt="USDT" class="asset-icon" />
                <span class="asset-name">USDT</span>
              </div>
              <div class="asset-right">
                <span class="asset-balance">{{ walletStore.usdtBalance }}</span>
                <button class="details-btn" @click="openDetailsDrawer('USDT')">{{ t('assetsPage.details') }}</button>
              </div>
            </div>

            <!-- WLD - 从钱包获取余额 -->
            <div class="asset-item">
              <div class="asset-left">
                <img src="/static/USDT/WLD.png" alt="WLD" class="asset-icon" />
                <span class="asset-name">WLD</span>
              </div>
              <div class="asset-right">
                <span class="asset-balance">{{ walletStore.wldBalance }}</span>
                <button class="details-btn" @click="openDetailsDrawer('WLD')">{{ t('assetsPage.details') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二个容器 - 存款/提款按钮 -->
      <div class="action-buttons-container">
        <!-- Deposit 按钮 - 点击打开充值弹窗 -->
        <button class="action-btn deposit-btn" @click="openDepositModal">
          <img src="/static/QIANBAO/提款.png" alt="Deposit" class="btn-icon" />
          <span class="btn-text">{{ t('assetsPage.deposit') }}</span>
        </button>

        <!-- Withdraw 按钮 -->
        <button class="action-btn withdraw-btn" @click="openWithdrawModal">
          <img src="/static/QIANBAO/存款.png" alt="Withdraw" class="btn-icon" />
          <span class="btn-text">{{ t('assetsPage.withdraw') }}</span>
        </button>
      </div>

      <!-- 第三个容器 - Flash Exchange 闪兑 -->
      <div class="two-view" style="position: relative;">
        <!-- 顶部图标 -->
        <div class="exchange-icon-wrapper">
          <img src="/static/YAOQI/2.png" alt="Flash Exchange" class="exchange-icon" />
        </div>

        <!-- 标题 -->
        <div class="exchange-title">
          <h2>{{ t('assetsPage.flashExchange') }}</h2>
        </div>

        <!-- 第一个输入区域（动态显示 WLD 或 USDT） -->
        <div class="exchange-input-group">
          <div class="input-left">
            <input 
              type="number" 
              v-model="topInputAmount" 
              class="exchange-input" 
              :class="{ 'wld-input': topCurrency === 'WLD', 'usdt-input': topCurrency === 'USDT' }"
              placeholder="0.0000"
              step="0.0001"
              min="0"
              @input="handleTopInputChange"
            />
            <div class="input-balance">
              {{ t('assetsPage.balance') }}: <span class="balance-animated">{{ topCurrency === 'WLD' ? displayWldBalance : displayUsdtBalance }}</span> {{ topCurrency }}
            </div>
          </div>
          <div class="input-right">
            <span class="currency-name" :class="{ 'wld-color': topCurrency === 'WLD', 'usdt-color': topCurrency === 'USDT' }">{{ topCurrency }}</span>
            <template v-if="topCurrency === 'WLD'">
              <span class="currency-divider"></span>
              <span class="max-badge" @click="setMaxTopAmount">{{ t('assetsPage.max') }}</span>
            </template>
          </div>
        </div>

        <!-- 转换图标 -->
        <div class="exchange-swap-icon" @click="handleSwap">
          <img src="/static/YAOQI/7.png" alt="Swap" class="swap-icon" />
        </div>

        <!-- 第二个输入区域（动态显示 USDT 或 WLD） -->
        <div class="exchange-input-group">
          <div class="input-left">
            <span class="exchange-result" :class="{ 'wld-result': bottomCurrency === 'WLD', 'usdt-result': bottomCurrency === 'USDT' }">
              {{ bottomCalculatedAmount }}
            </span>
            <div class="input-balance">
              {{ t('assetsPage.balance') }}: <span class="balance-animated">{{ bottomCurrency === 'WLD' ? displayWldBalance : displayUsdtBalance }}</span> {{ bottomCurrency }}
            </div>
          </div>
          <div class="input-right">
            <span class="currency-name" :class="{ 'wld-color': bottomCurrency === 'WLD', 'usdt-color': bottomCurrency === 'USDT' }">{{ bottomCurrency }}</span>
          </div>
        </div>

        <!-- 当前价格 -->
        <div class="exchange-price-row">
          <span class="price-label">{{ t('assetsPage.currentPrice') }}：</span>
          <span class="price-value">1WLD≈{{ exchangeWldPrice.toFixed(4) }}USDT</span>
        </div>

        <!-- 今日可兑换数量（仅 WLD 换 USDT 时显示） -->
        <div class="exchange-limit-row" v-if="!isSwapped">
          <span class="limit-label">{{ t('assetsPage.todayRedeemable') }}：</span>
          <span class="limit-value">{{ (dailyRedeemableWld - todayExchangedWld).toFixed(2) }} WLD</span>
        </div>
        
        <!-- 按钮区域 -->
        <div class="exchange-buttons-wrapper">
          <!-- 等级提示按钮（仅未解锁时显示） -->
          <button 
            class="unlock-hint-btn" 
            v-if="!isSwapped && userLevel === 0"
            @click="goToInvite"
          >
            {{ t('assetsPage.inviteToExchange') || 'Invite members to unlock WLD exchange' }}
          </button>

        <!-- 确认兑换按钮 -->
        <button class="confirm-exchange-btn" @click="handleConfirmExchange">
          {{ t('assetsPage.confirmExchange') }}
        </button>
        </div>

        <!-- 提示弹窗 -->
        <div v-if="showExchangeAlert" class="exchange-alert-overlay" @click.self="closeExchangeAlert">
          <div class="exchange-alert-box">
            <div class="alert-icon">
              <span v-if="exchangeAlertType === 'warning'">⚠️</span>
              <span v-else-if="exchangeAlertType === 'success'">✅</span>
            </div>
            <p class="alert-message">{{ exchangeAlertMessage }}</p>
          </div>
        </div>

        <!-- 交换加载蒙版 -->
        <div v-if="showSwapLoading" class="swap-loading-overlay">
          <div class="swap-loading-dots">
            <span class="dot dot-1"></span>
            <span class="dot dot-2"></span>
            <span class="dot dot-3"></span>
          </div>
        </div>
      </div>

      <!-- 第四个容器 - 四个卡片网格 -->
      <div class="cards-grid-container">
        <!-- White Paper -->
        <div class="info-card" @click="openDocument('whitepaper')">
          <img src="/static/QIANBAO/1.png" alt="White Paper" class="card-image" />
          <span class="card-title">{{ t('assetsPage.whitePaper') }}</span>
        </div>

        <!-- MSB License -->
        <div class="info-card" @click="openDocument('msb')">
          <img src="/static/QIANBAO/2.png" alt="MSB License" class="card-image" />
          <span class="card-title">{{ t('assetsPage.msbLicense') }}</span>
        </div>

        <!-- Safe -->
        <div class="info-card" @click="openSafeModal">
          <img src="/static/QIANBAO/3.png" alt="Safe" class="card-image" />
          <span class="card-title">{{ t('assetsPage.safe') }}</span>
        </div>

        <!-- Business License -->
        <div class="info-card" @click="openDocument('license')">
          <img src="/static/QIANBAO/4.png" alt="Business License" class="card-image" />
          <span class="card-title">{{ t('assetsPage.businessLicense') }}</span>
        </div>
      </div>
    </div>

    <!-- Open Safe 弹窗 -->
    <div v-if="showSafeModal" class="modal-overlay" @click.self="closeSafeModal">
      <div class="safe-modal" :class="{ 'manage-mode': safeMode === 'manage' }">
        <!-- 加载状态 -->
        <div v-if="safeLoading" class="safe-loading">
          <div class="safe-spinner"></div>
        </div>
        
        <!-- 设置/验证模式 -->
        <template v-if="safeMode !== 'manage'">
          <!-- 标题 -->
          <h2 class="modal-title">
            {{ safeMode === 'setup' ? (t('assetsPage.setupSafe') || 'Setup Safe') : t('assetsPage.openSafe') }}
          </h2>
          
          <!-- 提示文字 -->
          <p class="modal-subtitle">
            {{ safeMode === 'setup' 
              ? (t('assetsPage.setPassword') || 'Set a 6-digit password') 
              : t('assetsPage.enterSafePassword') 
            }}
          </p>
          
          <!-- 密码输入框 -->
          <div class="code-input-container">
            <input
              v-for="(item, index) in 6"
              :key="index"
              :ref="el => codeInputs[index] = el"
              v-model="safeCode[index]"
              type="password"
              inputmode="numeric"
              maxlength="1"
              class="code-input-item"
              @input="handleCodeInput(index)"
              @keydown="handleKeyDown($event, index)"
            />
          </div>
          
          <!-- 错误提示 -->
          <p v-if="safeError" class="safe-error">{{ safeError }}</p>
          
          <!-- 锁定余额显示 -->
          <p class="lock-balance">{{ t('assetsPage.lockBalance') }}: {{ safeStatus.locked_usdt }} USDT</p>
          
          <!-- 按钮组 -->
          <div class="modal-buttons">
            <button class="modal-btn cancel-btn" @click="closeSafeModal">{{ t('assetsPage.cancel') }}</button>
            <button class="modal-btn sure-btn" @click="handleSafeSubmit" :disabled="safeLoading">
              {{ safeMode === 'setup' ? (t('assetsPage.create') || 'Create') : t('assetsPage.sure') }}
            </button>
          </div>
        </template>
        
        <!-- 管理模式（密码验证成功后） -->
        <template v-else>
          <h2 class="modal-title">🔐 {{ t('assetsPage.safebox') || 'Safe Box' }}</h2>
          
          <!-- 锁定资产显示 -->
          <div class="safe-assets">
            <div class="safe-asset-item">
              <span class="safe-asset-label">USDT</span>
              <span class="safe-asset-value">{{ safeStatus.locked_usdt }}</span>
            </div>
            <div class="safe-asset-item">
              <span class="safe-asset-label">WLD</span>
              <span class="safe-asset-value">{{ safeStatus.locked_wld }}</span>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="safe-actions">
            <button class="safe-action-btn deposit" @click="handleSafeDeposit('USDT')">
              {{ t('assetsPage.depositUsdt') || 'Deposit USDT' }}
            </button>
            <button class="safe-action-btn withdraw" @click="handleSafeWithdraw('USDT')">
              {{ t('assetsPage.withdrawUsdt') || 'Withdraw USDT' }}
            </button>
          </div>
          
          <!-- 关闭按钮 -->
          <button class="modal-btn cancel-btn full-width" @click="closeSafeModal">
            {{ t('assetsPage.close') || 'Close' }}
          </button>
        </template>
      </div>
    </div>

    <!-- 文档查看器弹窗 -->
    <Teleport to="body">
      <transition name="doc-fade">
        <div v-if="showDocViewer" class="doc-viewer-overlay">
          <!-- 顶部栏 -->
          <div class="doc-header">
            <span class="doc-header-title">{{ currentDocTitle }}</span>
            <button class="doc-close-btn" @click="closeDocViewer">✕</button>
          </div>
          
          <!-- 多页文档（白皮书） -->
          <div
            v-if="currentDocType === 'gallery'"
            ref="docGalleryRef"
            class="doc-gallery"
            @click.self="closeDocViewer"
            @scroll.passive="handleDocGalleryScroll"
          >
            <div class="doc-gallery-inner">
              <!-- Direct img tags for better compatibility with TokenPocket browser -->
              <img
                v-for="(pageUrl, index) in visibleWhitepaperPages"
                :key="index"
                :src="pageUrl"
                :alt="`Page ${index + 1}`"
                class="doc-gallery-page"
                :loading="index === 0 ? 'eager' : 'lazy'"
                decoding="async"
                @error="handleImageError($event, index)"
              />
            </div>
          </div>
          
          <!-- PDF 文档 -->
          <div v-else-if="currentDocType === 'pdf'" class="doc-pdf" @click.self="closeDocViewer">
            <iframe class="doc-pdf-frame" :src="currentDocUrl" :title="currentDocTitle" />
          </div>

          <!-- 单张图片 -->
          <div v-else class="doc-single-image" @click="closeDocViewer">
            <img 
              :src="currentDocUrl"
              :alt="currentDocTitle"
              class="doc-image"
              @click.stop
            />
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Details 侧边抽屉 -->
    <transition name="drawer">
      <div v-if="showDetailsDrawer" class="drawer-overlay" @click="closeDetailsDrawer">
        <div class="details-drawer">
          <!-- 顶部导航栏 -->
          <div class="drawer-navigation">
            <div class="drawer-nav-container">
              <!-- 左侧 - 菜单图标 -->
              <div class="drawer-nav-left">
                <img src="/static/one/1.png" alt="Menu" class="drawer-menu-icon" />
              </div>

              <!-- 中间 - 显示钱包ID或连接提示 -->
              <div class="drawer-nav-center" @click.stop="showWalletAlert">
                <img src="/static/YAOQI/10.png" alt="Wallet" class="drawer-wallet-icon" />
                <span class="drawer-wallet-text" v-if="walletStore.isConnected && walletStore.walletAddress">
                  ID: {{ walletStore.walletAddress.slice(-8) }}
                </span>
                <span class="drawer-wallet-text" v-else>{{ t('nav.connectWallet') }}</span>
              </div>

              <!-- 右侧 - 语言选择 -->
              <div class="drawer-nav-right" @click.stop="toggleDrawerLanguageMenu">
                <img src="/static/one/3.png" alt="Globe" class="drawer-globe-icon" />
                <span class="drawer-language-text">{{ currentLanguageName }}</span>
                <span class="drawer-arrow-icon" :class="{ 'arrow-up': showDrawerLanguageMenu }">∨</span>
                
                <!-- 语言下拉菜单 -->
                <div v-if="showDrawerLanguageMenu" class="drawer-language-dropdown" @click.stop>
                  <div class="drawer-dropdown-triangle"></div>
                  <div 
                    v-for="lang in languages" 
                    :key="lang.code"
                    class="drawer-language-option"
                    :class="{ 'active': locale === lang.code }"
                    @click.stop="selectLanguage(lang)"
                  >
                    <span class="drawer-lang-name">{{ lang.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 币种信息区域 -->
          <div class="drawer-header">
            <div class="header-content">
              <img :src="`/static/USDT/${selectedAsset}.png`" :alt="selectedAsset" class="drawer-icon" />
              <div class="drawer-title-group">
                <h3 class="drawer-title">{{ selectedAsset }}</h3>
                <p class="drawer-subtitle">{{ selectedAsset === 'WLD' ? 'Worldcoin' : 'Tether USD' }}</p>
              </div>
            </div>
            <!-- 余额显示 -->
            <div class="drawer-balance-info">
              <span class="drawer-balance-amount">${{ selectedAsset === 'WLD' ? walletStore.wldBalance : walletStore.usdtBalance }}</span>
              <span class="drawer-balance-value">${{ selectedAsset === 'WLD' ? (parseFloat(walletStore.wldBalance) * wldPrice).toFixed(4) : walletStore.usdtBalance }}</span>
            </div>
          </div>

          <!-- 内容区域 - 签到记录 -->
          <div class="drawer-content">
            <!-- WLD 签到记录 -->
            <template v-if="selectedAsset === 'WLD'">
              <div v-if="checkinRecords.length > 0 || exchangeRecords.length > 0" class="checkin-records">
                <div 
                  v-for="record in checkinRecords" 
                  :key="record.id" 
                  class="usdt-record-card"
                >
                  <div class="tx-card-header">
                    <span class="tx-type checkin">{{ t('assetsPage.dailySignInRewards') }}</span>
                    <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                  </div>
                  <div class="tx-card-body">
                    <div class="tx-info">
                      <div class="tx-address">{{ formatWalletAddress(record.wallet_address) }}</div>
                      <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                    </div>
                    <div class="tx-amount-wrap">
                      <div class="tx-amount deposit">+{{ parseFloat(record.reward_amount).toFixed(4) }}</div>
                      <div class="tx-currency">WLD</div>
                    </div>
                  </div>
                </div>

                <!-- WLD Exchange Records (WLD <-> USDT) -->
                <!-- English Note:
                  - usdt_to_wld increases WLD (+wld_amount)
                  - wld_to_usdt decreases WLD (-wld_amount)
                -->
                <div
                  v-for="record in exchangeRecords"
                  :key="'exchange-' + record.id"
                  class="usdt-record-card"
                >
                  <div class="tx-card-header">
                    <span class="tx-type deposit">{{ t('assetsPage.exchangeRecord') || 'Exchange' }}</span>
                    <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                  </div>
                  <div class="tx-card-body">
                    <div class="tx-info">
                      <div class="tx-address">{{ formatWalletAddress(record.wallet_address) }}</div>
                      <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                    </div>
                    <div class="tx-amount-wrap">
                      <template v-if="record.direction === 'usdt_to_wld'">
                        <div class="tx-amount deposit">+{{ parseFloat(record.wld_amount).toFixed(4) }}</div>
                        <div class="tx-currency">WLD</div>
                      </template>
                      <template v-else>
                        <div class="tx-amount withdraw">-{{ parseFloat(record.wld_amount).toFixed(4) }}</div>
                        <div class="tx-currency">WLD</div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="no-records-text">{{ t('assetsPage.noRecords') }}</p>
            </template>
            <!-- USDT 记录 -->
            <template v-else>
              <div class="usdt-records">
                <!-- 所有记录（充值、提现、量化收益）按时间排序 -->
                <div v-if="allUsdtRecords.length > 0" class="records-section">
                  <div 
                    v-for="record in allUsdtRecords" 
                    :key="record.type + '-' + record.id" 
                    class="usdt-record-card"
                  >
                    <!-- 充值记录 -->
                    <template v-if="record.type === 'deposit'">
                      <div class="tx-card-header">
                        <span class="tx-type deposit">{{ t('assetsPage.depositRecord') }}</span>
                        <span class="tx-status" :class="record.status">{{ getStatusText(record.status) }}</span>
                    </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ formatWalletAddress(record.wallet_address) }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                      </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount deposit">+{{ parseFloat(record.amount).toFixed(4) }}</div>
                          <div class="tx-currency">USDT</div>
                        </div>
                    </div>
                    </template>
                
                <!-- 提现记录 -->
                    <template v-else-if="record.type === 'withdraw'">
                      <div class="tx-card-header">
                        <span class="tx-type withdraw">{{ t('assetsPage.withdrawRecord') }}</span>
                        <span class="tx-status" :class="record.status">{{ getStatusText(record.status) }}</span>
                    </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ formatWalletAddress(record.to_address || record.wallet_address) }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                      </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount withdraw">-{{ parseFloat(record.amount).toFixed(4) }}</div>
                          <div class="tx-currency">USDT</div>
                    </div>
                      </div>
                      <div class="tx-card-footer">
                        <div class="tx-fee-row">
                          <span class="tx-fee-label">{{ t('assetsPage.fee') || 'Fee' }} (0.5%)</span>
                          <span class="tx-fee-value">-{{ parseFloat(record.fee || record.amount * 0.005).toFixed(4) }} USDT</span>
                        </div>
                        <div class="tx-actual-row">
                          <span class="tx-actual-label">{{ t('assetsPage.actualAmount') || 'Actual' }}</span>
                          <span class="tx-actual-value">{{ parseFloat(record.actual_amount || record.amount * 0.995).toFixed(4) }} USDT</span>
                        </div>
                    </div>
                    </template>
                    
                    <!-- 量化收益记录 -->
                    <template v-else-if="record.type === 'quantify'">
                      <div class="tx-card-header">
                        <span class="tx-type quantify">{{ t('assetsPage.quantifyRecord') }}</span>
                        <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                      </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ record.robot_name }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                        </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount deposit">+{{ parseFloat(record.earnings).toFixed(4) }}</div>
                          <div class="tx-currency">USDT</div>
                        </div>
                      </div>
                    </template>
                    
                    <!-- 推荐奖励记录 -->
                    <template v-else-if="record.type === 'referral'">
                      <div class="tx-card-header">
                        <span class="tx-type referral">{{ t('assetsPage.referralRecord') }} (Lv{{ record.level }})</span>
                        <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                      </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ formatWalletAddress(record.from_wallet) }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                        </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount deposit">+{{ parseFloat(record.reward_amount).toFixed(4) }}</div>
                          <div class="tx-currency">USDT</div>
                        </div>
                      </div>
                    </template>

                    <!-- 闪兑记录 -->
                    <template v-else-if="record.type === 'exchange'">
                      <div class="tx-card-header">
                        <span class="tx-type deposit">{{ t('assetsPage.exchangeRecord') || 'Exchange' }}</span>
                        <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                      </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ formatWalletAddress(record.wallet_address) }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                        </div>
                        <div class="tx-amount-wrap">
                          <template v-if="record.direction === 'wld_to_usdt'">
                            <div class="tx-amount deposit">+{{ parseFloat(record.usdt_amount).toFixed(4) }}</div>
                            <div class="tx-currency">USDT</div>
                          </template>
                          <template v-else>
                            <div class="tx-amount withdraw">-{{ parseFloat(record.usdt_amount).toFixed(4) }}</div>
                            <div class="tx-currency">USDT</div>
                          </template>
                        </div>
                      </div>
                    </template>

                    <!-- 保证金退还记录 -->
                    <template v-else-if="record.type === 'margin_refund'">
                      <div class="tx-card-header">
                        <span class="tx-type margin-refund">保证金退还</span>
                        <span class="tx-status" :class="record.status">{{ getStatusText(record.status) }}</span>
                      </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ record.description || formatWalletAddress(record.wallet_address) }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                        </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount deposit">+{{ parseFloat(record.amount).toFixed(4) }}</div>
                          <div class="tx-currency">{{ record.token || 'USDT' }}</div>
                        </div>
                      </div>
                    </template>
                    
                    <!-- 团队奖励记录 -->
                    <template v-else-if="record.type === 'team_reward'">
                      <div class="tx-card-header">
                        <span class="tx-type team-reward">{{ t('assetsPage.teamRewardRecord') || '团队奖励' }} (Level{{ record.broker_level }})</span>
                        <span class="tx-status completed">{{ t('assetsPage.completed') }}</span>
                      </div>
                      <div class="tx-card-body">
                        <div class="tx-info">
                          <div class="tx-address">{{ record.reward_type === 'daily_dividend' ? (t('assetsPage.dailyDividend') || '每日分红') : record.reward_type }}</div>
                          <div class="tx-time">{{ formatDateTime(record.created_at) }}</div>
                        </div>
                        <div class="tx-amount-wrap">
                          <div class="tx-amount deposit">+{{ parseFloat(record.reward_amount).toFixed(4) }}</div>
                          <div class="tx-currency">USDT</div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
                
                <!-- 无记录 -->
                <p v-if="allUsdtRecords.length === 0" class="no-records-text">
                  {{ t('assetsPage.noRecords') }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>

    <!-- 充值弹窗 -->
    <DepositModal 
      v-model:visible="showDepositModal" 
      @success="handleDepositSuccess"
    />

    <!-- 提款弹窗 -->
    <WithdrawModal 
      v-model:visible="showWithdrawModal" 
      @success="handleWithdrawSuccess"
    />

    <!-- 量化收益明细弹窗 -->
    <QuantifyHistoryPopup 
      v-model:visible="showQuantifyHistory"
    />

    <BottomNav />
  </div>
</template>

<script setup>
/**
 * Assets 页面 - 钱包资产
 * 
 * 功能：
 * - 显示钱包余额（USDT、WLD）
 * - 存款/提款功能
 * - 闪兑功能
 * - 与 TokenPocket 等钱包集成
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import DepositModal from '@/components/DepositModal.vue'
import WithdrawModal from '@/components/WithdrawModal.vue'
import QuantifyHistoryPopup from '@/components/QuantifyHistoryPopup.vue'
import { useWalletStore } from '@/stores/wallet'
import { isDAppBrowser, detectWalletType } from '@/utils/wallet'
import { trackDeposit, trackWithdraw } from '@/utils/tracker'
// Import precision math module for accurate financial calculations
import {
  add,
  multiply,
  divide,
  calculateEquity,
  calculateExchange,
  formatAmount,
  isGreaterThan,
  isPositive
} from '@/utils/precisionMath'
import { shouldUpdateEquityPrice, smoothlyUpdateEquityValue } from '@/utils/equitySmoother'

const { t, locale } = useI18n()
const router = useRouter()

/**
 * 跳转到邀请页面
 */
const goToInvite = () => {
  router.push('/invite')
}

// 钱包 store
const walletStore = useWalletStore()

const isTokenPocketBrowser = () => {
  const ua = (navigator.userAgent || '').toLowerCase()
  if (ua.includes('tokenpocket')) return true
  return isDAppBrowser() && detectWalletType() === 'TokenPocket'
}

// ==================== 自动刷新相关 ====================
let refreshInterval = null
const REFRESH_INTERVAL = 30000 // 30秒自动刷新一次
const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000 // WLD价格估值刷新间隔（5分钟）
// Equity display smoothing threshold:
// - If the equity change is smaller than this value, we keep the displayed value unchanged.
// - This avoids "balance jumping" caused by tiny WLD price micro-moves.
const MIN_EQUITY_UPDATE_USDT = '1' // 低于 1 USDT 不更新显示，避免“跳动”
let lastPriceFetchAt = 0

// ==================== 余额动画相关 ====================
// 动画显示的余额
const animatedWldBalance = ref(0)
const animatedUsdtBalance = ref(0)

/**
 * Format large numbers safely (handles numbers > MAX_SAFE_INTEGER)
 * @param {number|string} value - Number to format
 * @param {number} decimals - Decimal places to show
 * @returns {string} Formatted number string
 */
const formatLargeNumber = (value, decimals = 4) => {
  // Handle invalid values
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0000'
  }
  
  // Convert to string to preserve precision for very large numbers
  const strValue = String(value)
  
  // Check if it's in scientific notation
  if (strValue.includes('e') || strValue.includes('E')) {
    // Convert scientific notation to regular number string
    const num = parseFloat(value)
    if (!isFinite(num)) return '0.0000'
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }
  
  // For very large numbers (> 1 trillion), use abbreviations
  const num = parseFloat(value)
  if (!isFinite(num)) return '0.0000'
  
  if (num >= 1e15) {
    return (num / 1e15).toFixed(2) + 'Q' // Quadrillion
  } else if (num >= 1e12) {
    return (num / 1e12).toFixed(2) + 'T' // Trillion
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B' // Billion
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M' // Million
  }
  
  // Normal number formatting
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Format animated balance display
const displayWldBalance = computed(() => {
  return formatLargeNumber(animatedWldBalance.value, 4)
})

const displayUsdtBalance = computed(() => {
  return formatLargeNumber(animatedUsdtBalance.value, 4)
})

// Smooth transition animation function
const animateBalance = (currentRef, targetValue) => {
  // For very large numbers (> 1 trillion), skip animation to avoid precision issues
  if (targetValue > 1e12 || !isFinite(targetValue)) {
    currentRef.value = targetValue
    return
  }
  
  const startValue = currentRef.value
  const difference = targetValue - startValue
  
  // If difference is too small, set directly
  if (Math.abs(difference) < 0.0001) {
    currentRef.value = targetValue
    return
  }
  
  const duration = 800 // Animation duration 800ms
  const startTime = performance.now()
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Use easing function
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    currentRef.value = startValue + difference * easeProgress
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      currentRef.value = targetValue // Ensure final value is precise
    }
  }
  
  requestAnimationFrame(animate)
}

// 监听 WLD 余额变化
watch(() => walletStore.wldBalance, (newVal) => {
  const target = parseFloat(newVal) || 0
  animateBalance(animatedWldBalance, target)
}, { immediate: true })

// 监听 USDT 余额变化
watch(() => walletStore.usdtBalance, (newVal) => {
  const target = parseFloat(newVal) || 0
  animateBalance(animatedUsdtBalance, target)
}, { immediate: true })

// 充值弹窗状态
const showDepositModal = ref(false)

// 提款弹窗状态
const showWithdrawModal = ref(false)

// Safe Modal 状态
const showSafeModal = ref(false)
const safeCode = ref(['', '', '', '', '', ''])
const codeInputs = ref([])
const safeStatus = ref({
  has_safe: false,
  locked_usdt: '0.0000',
  locked_wld: '0.0000'
})
const safeMode = ref('verify') // 'setup' | 'verify' | 'manage'
const safeLoading = ref(false)
const safeError = ref('')

const translateSafeApiError = (message, token = 'USDT') => {
  const fallback = t('assetsPage.operationFailed') || 'Operation failed'
  const raw = String(message || '').trim()
  if (!raw) return fallback

  const lower = raw.toLowerCase()
  if (lower.includes('safe already exists')) return t('assetsPage.safeAlreadyExists') || fallback
  if (lower.includes('safe not found')) return t('assetsPage.safeNotFound') || fallback
  if (lower.includes('invalid password')) return t('assetsPage.wrongPassword') || fallback
  if (lower.includes('password must be 6 digits')) return t('assetsPage.enterSixDigit') || fallback
  if (lower.includes('invalid amount')) return t('assetsPage.invalidAmount') || fallback
  if (lower.includes('insufficient locked balance')) return t('assetsPage.insufficientLocked') || fallback
  if (lower.includes('insufficient balance')) return t('assetsPage.insufficientBalance', { currency: token }) || fallback
  if (lower.includes('invalid token')) return t('assetsPage.invalidTokenType') || fallback
  if (lower.includes('balance record not found')) return t('assetsPage.balanceNotFound') || fallback

  console.warn('[Assets][Safe] Unmapped API error:', raw)
  return fallback
}

// 文档查看器状态
const showDocViewer = ref(false)
const currentDocUrl = ref('')
const currentDocTitle = ref('')
const currentDocType = ref('image') // 'image' | 'pdf'
const docGalleryRef = ref(null)

// Details Drawer 状态
const showDetailsDrawer = ref(false)
const selectedAsset = ref('USDT')
const showDrawerLanguageMenu = ref(false)
const checkinRecords = ref([]) // 签到记录
const wldPrice = ref(0) // WLD 当前价格
const depositRecords = ref([]) // 充值记录
const withdrawRecords = ref([]) // 提现记录
const quantifyRecords = ref([]) // 量化收益记录
const referralRecords = ref([]) // 推荐奖励记录
const teamRewards = ref([]) // 团队奖励记录
const exchangeRecords = ref([]) // 闪兑记录（WLD <-> USDT）
const transactionRecords = ref([]) // 交易历史记录（保证金退还等）

// 闪兑相关状态
const exchangeWldPrice = ref(0) // 闪兑用的 WLD 价格
const equityWldPrice = ref(0) // 权益估值用的 WLD 价格（带阈值平滑）
const userLevel = ref(0) // 用户经纪人等级 (0-5)
const dailyRedeemableWld = ref(0) // 每日可兑换 WLD 数量
const todayExchangedWld = ref(0) // 今日已兑换 WLD 数量

// 交换加载状态
const showSwapLoading = ref(false)

// 今日量化收益
const todayEarnings = ref(0)

// 奖励统计
const totalReferralReward = ref('0.0000') // 总推荐奖励
const totalTeamReward = ref('0.0000') // 总团队奖励

// 量化收益明细弹窗状态
const showQuantifyHistory = ref(false)

// 兑换提示弹窗状态
const showExchangeAlert = ref(false)
const exchangeAlertType = ref('warning') // 'warning' | 'success'
const exchangeAlertMessage = ref('')

// 币种交换状态（false: WLD在上，true: USDT在上）
const isSwapped = ref(false)

// WLD 和 USDT 的输入值
const topInputAmount = ref('')

// 计算当前显示的币种和金额
const topCurrency = computed(() => isSwapped.value ? 'USDT' : 'WLD')
const bottomCurrency = computed(() => isSwapped.value ? 'WLD' : 'USDT')

// 计算底部显示的金额（根据输入和汇率）- 使用精确数学算法
const bottomCalculatedAmount = computed(() => {
  const inputVal = topInputAmount.value || 0
  if (!isPositive(inputVal) || !isPositive(exchangeWldPrice.value)) return '0.0000'
  
  // Use precision math to avoid floating point errors
  // WLD -> USDT: amount × price
  // USDT -> WLD: amount ÷ price
  return calculateExchange(inputVal, exchangeWldPrice.value, topCurrency.value === 'WLD')
})

// 处理顶部输入变化
const handleTopInputChange = () => {
  // 输入值变化时自动计算底部金额
  console.log('[Exchange] Input changed:', topInputAmount.value)
}

// 设置最大金额
const setMaxTopAmount = () => {
  if (topCurrency.value === 'WLD') {
    topInputAmount.value = walletStore.wldBalance
  } else {
    topInputAmount.value = walletStore.usdtBalance
  }
}

// 格式化今日收益显示
const formatTodayEarnings = computed(() => {
  const earnings = parseFloat(todayEarnings.value) || 0
  if (earnings > 0) {
    return '+' + earnings.toFixed(2)
  }
  return earnings.toFixed(2)
})

// 合并并排序所有USDT记录（充值、提现、量化收益、推荐奖励）
const allUsdtRecords = computed(() => {
  const records = []
  
  // 添加充值记录
  depositRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'deposit',
      timestamp: new Date(record.created_at).getTime()
    })
  })
  
  // 添加提现记录
  withdrawRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'withdraw',
      timestamp: new Date(record.created_at).getTime()
    })
  })
  
  // 添加量化收益记录
  quantifyRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'quantify',
      timestamp: new Date(record.created_at).getTime()
    })
  })
  
  // 添加推荐奖励记录
  referralRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'referral',
      timestamp: new Date(record.created_at).getTime()
    })
  })
  
  // 添加团队奖励记录
  teamRewards.value.forEach(record => {
    records.push({
      ...record,
      type: 'team_reward',
      timestamp: new Date(record.created_at).getTime()
    })
  })

  // 添加闪兑记录
  // English Note:
  // - The exchange API writes to `wld_exchange_records`.
  // - For USDT details view we show the USDT delta:
  //   - wld_to_usdt: +usdt_amount
  //   - usdt_to_wld: -usdt_amount
  exchangeRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'exchange',
      timestamp: new Date(record.created_at).getTime()
    })
  })

  // 添加保证金退还记录
  transactionRecords.value.forEach(record => {
    records.push({
      ...record,
      type: 'margin_refund',
      timestamp: new Date(record.created_at).getTime()
    })
  })
  
  // 按时间倒序排序（最新的在前面）
  return records.sort((a, b) => b.timestamp - a.timestamp)
})

// 语言列表
const languages = ref([
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'id', name: 'Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'fr', name: 'Français' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zu', name: 'Iingizimu Afrika' },
  { code: 'es', name: 'España' },
  { code: 'pt', name: 'Portugal' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ms', name: 'Melayu' },
  { code: 'uk', name: 'Україна' },
  { code: 'zh-tw', name: '繁體中文' }
])

// 计算当前语言名称
const currentLanguageName = computed(() => {
  const lang = languages.value.find(l => l.code === locale.value)
  return lang ? lang.name : 'English'
})

// 打开Safe弹窗
const openSafeModal = async () => {
  if (!walletStore.isConnected) {
    alert(t('assetsPage.connectWalletFirst'))
    return
  }
  
  safeCode.value = ['', '', '', '', '', '']
  safeError.value = ''
  safeLoading.value = true
  
  try {
    // 检查保险箱状态
    const response = await fetch(`/api/safe/status?wallet_address=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      safeStatus.value = data.data
      // 根据是否有保险箱决定模式
      safeMode.value = data.data.has_safe ? 'verify' : 'setup'
    } else {
      safeError.value = translateSafeApiError(data.message)
    }
  } catch (error) {
    console.error('获取保险箱状态失败:', error)
    safeError.value = t('assetsPage.networkError') || 'Network error'
  } finally {
    safeLoading.value = false
  }
  
  showSafeModal.value = true
  // 延迟聚焦第一个输入框
  setTimeout(() => {
    if (codeInputs.value[0]) {
      codeInputs.value[0].focus()
    }
  }, 100)
}

// 关闭Safe弹窗
const closeSafeModal = () => {
  showSafeModal.value = false
  safeCode.value = ['', '', '', '', '', '']
  safeError.value = ''
  safeMode.value = 'verify'
}

// 文档配置（默认使用本地静态文件；可由后台动态配置覆盖）
// Whitepaper uses gallery mode (26 PNG images) by default
const documentConfig = ref({
  whitepaper: {
    url: '/static/documents/whitepaper',
    title: 'White Paper',
    type: 'gallery',
    pages: 26,
    fallback: {
      url: '/static/documents/whitepaper.pdf',
      type: 'pdf'
    }
  },
  msb: {
    url: '/static/documents/MSB.png',
    title: 'MSB License',
    type: 'image'
  },
  license: {
    url: '/static/documents/license.png',
    title: 'Business License',
    type: 'image'
  }
})

// 白皮书图片列表
const whitepaperPages = ref([])
const whitepaperVisibleCount = ref(0)

const WHITEPAPER_TP_INITIAL_PAGES = 3
const WHITEPAPER_TP_BATCH_PAGES = 3
const WHITEPAPER_SCROLL_THRESHOLD_PX = 800

const visibleWhitepaperPages = computed(() => {
  const total = whitepaperPages.value.length
  if (!total) return []
  const count = whitepaperVisibleCount.value > 0 ? whitepaperVisibleCount.value : total
  return whitepaperPages.value.slice(0, Math.min(total, count))
})

let lastWhitepaperLoadMoreAt = 0
const loadMoreWhitepaperPages = () => {
  const total = whitepaperPages.value.length
  if (!total) return
  if (whitepaperVisibleCount.value <= 0) {
    whitepaperVisibleCount.value = Math.min(total, WHITEPAPER_TP_INITIAL_PAGES)
    return
  }
  if (whitepaperVisibleCount.value >= total) return
  whitepaperVisibleCount.value = Math.min(total, whitepaperVisibleCount.value + WHITEPAPER_TP_BATCH_PAGES)
}

const handleDocGalleryScroll = () => {
  if (currentDocType.value !== 'gallery') return
  if (!isTokenPocketBrowser()) return

  const el = docGalleryRef.value
  if (!el) return

  const total = whitepaperPages.value.length
  if (!total || whitepaperVisibleCount.value >= total) return

  const now = Date.now()
  if (now - lastWhitepaperLoadMoreAt < 200) return

  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - WHITEPAPER_SCROLL_THRESHOLD_PX
  if (!nearBottom) return

  lastWhitepaperLoadMoreAt = now
  loadMoreWhitepaperPages()
}

let cachedWebpSupport = null
const supportsWebp = () => {
  if (cachedWebpSupport !== null) return cachedWebpSupport
  try {
    const canvas = document.createElement('canvas')
    cachedWebpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch (e) {
    cachedWebpSupport = false
  }
  return cachedWebpSupport
}

// Convert image URL to webp format (supports both jpg and png)
const toWhitepaperWebpUrl = (url) => {
  const str = String(url || '')
  if (!str) return str
  if (str.endsWith('.webp')) return str
  if (str.endsWith('.jpg')) return str.slice(0, -4) + '.webp'
  if (str.endsWith('.png')) return str.slice(0, -4) + '.webp'
  return `${str}.webp`
}

// Prefetch first whitepaper pages for better UX in TokenPocket browser
const prefetchWhitepaperFirstPages = () => {
  if (!isTokenPocketBrowser()) return
  const base = documentConfig.value.whitepaper?.fallback?.url
  if (!base) return
  const ext = supportsWebp() ? 'webp' : 'png'

  for (const pageNum of ['01', '02']) {
    const img = new Image()
    img.decoding = 'async'
    img.src = `${base}/page-${pageNum}.${ext}`
  }
}

// 从后端加载文档配置（由管理系统维护）
// Load document URLs, types and pages from backend, supports PDF, image, and gallery formats
const loadPlatformDocuments = async () => {
  try {
    const response = await fetch('/api/platform/documents')
    const data = await response.json()
    if (data?.success && data.data) {
      // Update whitepaper config (URL, type, and pages for gallery mode)
      if (data.data.whitepaper_url) {
        documentConfig.value.whitepaper.url = data.data.whitepaper_url
      }
      if (data.data.whitepaper_type) {
        documentConfig.value.whitepaper.type = data.data.whitepaper_type
      }
      if (data.data.whitepaper_pages) {
        documentConfig.value.whitepaper.pages = data.data.whitepaper_pages
      }
      
      // Update MSB license config (URL and type)
      if (data.data.msb_url) {
        documentConfig.value.msb.url = data.data.msb_url
      }
      if (data.data.msb_type) {
        documentConfig.value.msb.type = data.data.msb_type
      }
      
      // Update business license config (URL and type)
      if (data.data.business_license_url) {
        documentConfig.value.license.url = data.data.business_license_url
      }
      if (data.data.business_license_type) {
        documentConfig.value.license.type = data.data.business_license_type
      }
    }
  } catch (error) {
    console.warn('[Assets] Failed to load platform documents:', error)
  }
}

// 打开文档查看器
const openDocument = (docKey) => {
  const config = documentConfig.value[docKey]
  if (config) {
    currentDocTitle.value = config.title

    // TokenPocket 内置浏览器对 PDF iframe 兼容性较差（可能外跳/下载/白屏），白皮书优先使用图片版
    let effectiveType = config.type
    let effectiveUrl = config.url
    let effectivePages = config.pages
    if (docKey === 'whitepaper' && isTokenPocketBrowser() && config.fallback?.type === 'gallery') {
      effectiveType = config.fallback.type
      effectiveUrl = config.fallback.url
      effectivePages = config.fallback.pages
    }

    currentDocType.value = effectiveType
    
    // 多页文档（白皮书）
    if (effectiveType === 'gallery') {
      // 生成页面图片列表 (supports PNG format)
      whitepaperPages.value = Array.from({ length: effectivePages || 0 }, (_, i) => {
        const pageNum = String(i + 1).padStart(2, '0')
        return `${effectiveUrl}/page-${pageNum}.png`
      })
      currentDocUrl.value = ''

      const totalPages = whitepaperPages.value.length
      if (docKey === 'whitepaper' && isTokenPocketBrowser()) {
        whitepaperVisibleCount.value = Math.min(totalPages, WHITEPAPER_TP_INITIAL_PAGES)
      } else {
        whitepaperVisibleCount.value = totalPages
      }
      lastWhitepaperLoadMoreAt = 0
    } else if (effectiveType === 'pdf') {
      currentDocUrl.value = effectiveUrl
      whitepaperPages.value = []
      whitepaperVisibleCount.value = 0
    } else {
      // 单张图片
      currentDocUrl.value = effectiveUrl
      whitepaperPages.value = []
      whitepaperVisibleCount.value = 0
    }
    
    showDocViewer.value = true
    // 禁止背景滚动
    document.body.style.overflow = 'hidden'

    // TokenPocket：若首屏内容不足以滚动，自动补足下一批，减少“空白等待”
    if (effectiveType === 'gallery' && docKey === 'whitepaper' && isTokenPocketBrowser()) {
      setTimeout(() => {
        if (docGalleryRef.value) {
          docGalleryRef.value.scrollTop = 0
        }
        handleDocGalleryScroll()
      }, 0)
    }
  }
}

// Handle image loading error (for debugging)
const handleImageError = (event, index) => {
  console.error(`[Whitepaper] Failed to load page ${index + 1}:`, event.target?.src)
  // Set a placeholder or hide the broken image
  event.target.style.display = 'none'
}

// 关闭文档查看器
const closeDocViewer = () => {
  showDocViewer.value = false
  // 恢复背景滚动
  document.body.style.overflow = ''
  whitepaperVisibleCount.value = 0
  whitepaperPages.value = []
}

// 打开Details抽屉
const openDetailsDrawer = async (asset) => {
  selectedAsset.value = asset
  showDetailsDrawer.value = true
  
  // 如果是 WLD，获取签到记录和价格
  if (asset === 'WLD') {
    await Promise.all([
      fetchCheckinRecords(),
      fetchWldPrice(),
      // Also fetch exchange records so users can verify WLD exchange "arrival" in details.
      // English Note: Balance changes are applied immediately, but users also expect a visible ledger entry.
      fetchExchangeRecords()
    ])
  }
  
  // 如果是 USDT，获取充值、提现、量化收益、推荐奖励和团队奖励记录
  if (asset === 'USDT') {
    await Promise.all([
      fetchDepositRecords(),
      fetchWithdrawRecords(),
      fetchQuantifyRecords(),
      fetchReferralRecords(),
      fetchTeamRewards(),
      fetchTransactionRecords(),
      fetchExchangeRecords()
    ])
  }
}

/**
 * 获取闪兑记录
 * GET /api/exchange/history?wallet_address=0x...&limit=20
 *
 * English Note:
 * - This is required so "Details" shows exchange transactions instead of silently missing them.
 */
const fetchExchangeRecords = async () => {
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    exchangeRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/exchange/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Exchange records response:', data)
    
    if (data.success) {
      exchangeRecords.value = data.data || []
    } else {
      exchangeRecords.value = []
    }
  } catch (error) {
    console.error('获取闪兑记录失败:', error)
    exchangeRecords.value = []
  }
}

// 获取 WLD 当前价格
const fetchWldPrice = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/market/ticker?symbols=["WLDUSDT"]`)
    const data = await response.json()
    
    // API直接返回币安数组数据 [{symbol, lastPrice, ...}]
    if (Array.isArray(data) && data.length > 0) {
      wldPrice.value = parseFloat(data[0].lastPrice) || 0
    } else if (data.success && data.data && data.data.length > 0) {
      // 兼容包装格式
      wldPrice.value = parseFloat(data.data[0].lastPrice) || 0
    }
  } catch (error) {
    console.error('获取WLD价格失败:', error)
    wldPrice.value = 0
  }
}

// 获取充值记录
const fetchDepositRecords = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    depositRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/deposit/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Deposit records response:', data)
    
    if (data.success) {
      depositRecords.value = data.data || []
    } else {
      depositRecords.value = []
    }
  } catch (error) {
    console.error('获取充值记录失败:', error)
    depositRecords.value = []
  }
}

// 获取提现记录
const fetchWithdrawRecords = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    withdrawRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/withdraw/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Withdraw records response:', data)
    
    if (data.success) {
      withdrawRecords.value = data.data || []
    } else {
      withdrawRecords.value = []
    }
  } catch (error) {
    console.error('获取提现记录失败:', error)
    withdrawRecords.value = []
  }
}

// 获取量化收益记录
const fetchQuantifyRecords = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    quantifyRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/robot/quantify-history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Quantify records response:', data)
    
    if (data.success) {
      quantifyRecords.value = data.data.records || []
    } else {
      quantifyRecords.value = []
    }
  } catch (error) {
    console.error('获取量化收益记录失败:', error)
    quantifyRecords.value = []
  }
}

// 获取推荐奖励记录
const fetchReferralRecords = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    referralRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/referral-rewards/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Referral records response:', data)
    
    if (data.success) {
      referralRecords.value = data.data || []
    } else {
      referralRecords.value = []
    }
  } catch (error) {
    console.error('获取推荐奖励记录失败:', error)
    referralRecords.value = []
  }
}

// 获取团队奖励记录
const fetchTeamRewards = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    teamRewards.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/team-rewards/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Team rewards response:', data)
    
    if (data.success) {
      teamRewards.value = data.data || []
    } else {
      teamRewards.value = []
    }
  } catch (error) {
    console.error('获取团队奖励记录失败:', error)
    teamRewards.value = []
  }
}

// 获取保证金退还等交易历史记录
const fetchTransactionRecords = async () => {
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    transactionRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/transaction/history?wallet_address=${wallet.toLowerCase()}&limit=20`)
    const data = await response.json()
    
    console.log('[Assets] Transaction records response:', data)
    
    if (data.success) {
      transactionRecords.value = data.data || []
    } else {
      transactionRecords.value = []
    }
  } catch (error) {
    console.error('获取交易历史失败:', error)
    transactionRecords.value = []
  }
}

// 获取签到记录
const fetchCheckinRecords = async () => {
  // 优先使用 walletStore，其次从 localStorage 获取
  const wallet = walletStore.walletAddress || localStorage.getItem('walletAddress') || localStorage.getItem('wallet_address')
  if (!wallet) {
    checkinRecords.value = []
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/checkin/records?wallet=${wallet.toLowerCase()}`)
    const data = await response.json()
    
    console.log('[Assets] Checkin records response:', data)
    
    if (data.success) {
      checkinRecords.value = data.data || []
    } else {
      checkinRecords.value = []
    }
  } catch (error) {
    console.error('获取签到记录失败:', error)
    checkinRecords.value = []
  }
}

// 格式化钱包地址（隐藏中间部分）
const formatWalletAddress = (address) => {
  if (!address || address.length < 15) return address
  return `${address.slice(0, 10)}*****${address.slice(-10)}`
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'pending': t('assetsPage.statusPending') || 'Pending',
    'processing': t('assetsPage.statusProcessing') || 'Processing',
    'success': t('assetsPage.statusCompleted') || 'Completed',
    'completed': t('assetsPage.statusCompleted') || 'Completed',
    'failed': t('assetsPage.statusFailed') || 'Failed'
  }
  return statusMap[status] || status
}

// 关闭Details抽屉
const closeDetailsDrawer = () => {
  showDetailsDrawer.value = false
  showDrawerLanguageMenu.value = false
}

// 切换抽屉内语言菜单
const toggleDrawerLanguageMenu = () => {
  showDrawerLanguageMenu.value = !showDrawerLanguageMenu.value
}

// 选择语言
const selectLanguage = (lang) => {
  locale.value = lang.code
  showDrawerLanguageMenu.value = false
  // 保存语言设置到localStorage
  localStorage.setItem('language', lang.code)
}

// 显示钱包未连接提示
const showWalletAlert = () => {
  // TODO: 实现钱包提示功能
  console.log('Connect wallet clicked')
}

// 点击外部关闭语言菜单
const handleClickOutside = (event) => {
  const drawerNavRight = document.querySelector('.drawer-nav-right')
  if (drawerNavRight && !drawerNavRight.contains(event.target)) {
    showDrawerLanguageMenu.value = false
  }
}

// ==================== 自动刷新方法 ====================

/**
 * 刷新所有数据
 */
const refreshAllData = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress) return
  
  console.log('[Assets] 自动刷新数据...')
  // Price is expensive and changes frequently; refresh it less often to keep equity display stable.
  const shouldFetchPrice = (
    !isPositive(exchangeWldPrice.value) ||
    (Date.now() - lastPriceFetchAt) >= PRICE_REFRESH_INTERVAL
  )

  await Promise.all([
    fetchPlatformBalance(),
    fetchTodayEarnings(),
    fetchUserLevel(),
    shouldFetchPrice ? fetchExchangeWldPrice() : Promise.resolve()
  ])
}

/**
 * 启动自动刷新定时器
 */
const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    if (walletStore.isConnected) {
      refreshAllData()
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
 */
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && walletStore.isConnected) {
    console.log('[Assets] 页面变为可见，刷新数据...')
    refreshAllData()
  }
}

// 组件挂载和卸载
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 从后台读取最新资质文件配置（白皮书/MSB/营业执照）
  await loadPlatformDocuments()
  prefetchWhitepaperFirstPages()
  
  // 获取 WLD 价格
  await fetchExchangeWldPrice()
  
  // 如果钱包已连接，从平台获取余额和今日收益
  if (walletStore.isConnected) {
    console.log('[Assets] Wallet connected, fetching platform balance...')
    await fetchPlatformBalance()
    await fetchTodayEarnings()
    await fetchUserLevel()
    startAutoRefresh()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopAutoRefresh()
})

// 监听钱包连接状态变化，自动刷新余额
watch(() => walletStore.isConnected, async (connected) => {
  if (connected) {
    console.log('[Assets] Wallet connected, refreshing balances...')
    await fetchPlatformBalance()
    await fetchTodayEarnings()
    await fetchUserLevel()
    startAutoRefresh()
  } else {
    stopAutoRefresh()
    todayEarnings.value = 0
    userLevel.value = 0
    dailyRedeemableWld.value = 0
    todayExchangedWld.value = 0
  }
})

/**
 * 获取 WLD 当前价格（用于闪兑）
 * 注意：/api/market/ticker 直接返回币安数组数据，不包装在 { success, data } 中
 */
const fetchExchangeWldPrice = async () => {
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/market/ticker?symbols=["WLDUSDT"]`)
    const data = await response.json()
    
    // API直接返回币安数组数据 [{symbol, lastPrice, ...}]
    if (Array.isArray(data) && data.length > 0) {
      exchangeWldPrice.value = parseFloat(data[0].lastPrice) || 0
      console.log('[Exchange] WLD price fetched:', exchangeWldPrice.value)
    } else if (data.success && data.data && data.data.length > 0) {
      // 兼容包装格式
      exchangeWldPrice.value = parseFloat(data.data[0].lastPrice) || 0
    }

    // Record last successful fetch time
    lastPriceFetchAt = Date.now()

    // Update equity valuation price only when the equity delta is meaningful.
    // This prevents tiny market micro-moves from making the equity value "jump" visually.
    const wldBal = walletStore.wldBalance || '0'
    if (!isPositive(equityWldPrice.value)) {
      equityWldPrice.value = exchangeWldPrice.value
    } else if (shouldUpdateEquityPrice(equityWldPrice.value, exchangeWldPrice.value, wldBal, MIN_EQUITY_UPDATE_USDT)) {
      equityWldPrice.value = exchangeWldPrice.value
    }
  } catch (error) {
    console.error('获取 WLD 价格失败:', error)
    exchangeWldPrice.value = 0 // 出错时设为0，不使用假数据
  }
}

/**
 * 获取用户等级和每日可兑换数量
 */
const fetchUserLevel = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress) {
    return
  }
  
  try {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/user/level?wallet=${walletStore.walletAddress}`)
    const data = await response.json()
    
    if (data.success) {
      userLevel.value = data.data.level
      dailyRedeemableWld.value = data.data.dailyWldLimit
      todayExchangedWld.value = data.data.exchangedToday
    }
  } catch (error) {
    console.error('获取用户等级失败:', error)
  }
}

/**
 * 从平台后端获取用户余额
 * 添加时间戳参数防止浏览器缓存，确保每次获取最新数据
 */
const fetchPlatformBalance = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress) {
    return
  }
  
  try {
    walletStore.setLoadingBalance(true)
    // Add timestamp to prevent browser caching
    const timestamp = Date.now()
    const response = await fetch(
      `/api/user/balance?wallet_address=${walletStore.walletAddress}&_t=${timestamp}`,
      {
        // Disable browser cache
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    )
    const data = await response.json()
    
    if (data.success && data.data) {
      // 更新 USDT 和 WLD 余额
      walletStore.setUsdtBalance(data.data.usdt_balance)
      walletStore.setWldBalance(data.data.wld_balance)
      
      // 更新奖励统计
      totalReferralReward.value = data.data.total_referral_reward || '0.0000'
      totalTeamReward.value = data.data.total_team_reward || '0.0000'
      
      // 计算并更新总权益值（USDT + WLD 折算成 USDT）
      // 使用精确数学算法计算，避免浮点精度问题
      // Formula: Equity = USDT + (WLD × WLD_Price)
      // IMPORTANT:
      // - We use a smoothed price (equityWldPrice) to avoid tiny market micro-moves making equity "jump".
      // - If equityWldPrice is not ready yet, fallback to latest fetched exchangeWldPrice.
      const equityPrice = isPositive(equityWldPrice.value) ? equityWldPrice.value : exchangeWldPrice.value
      const totalEquity = calculateEquity(
        data.data.usdt_balance,
        data.data.wld_balance,
        equityPrice
      )
      // Smooth equity value updates to avoid UI "jumping" by tiny amounts.
      smoothlyUpdateEquityValue(walletStore.equityValue, totalEquity, walletStore.setEquityValue, MIN_EQUITY_UPDATE_USDT)
      
      console.log('[Assets] Platform balance fetched:', {
        usdt: data.data.usdt_balance,
        wld: data.data.wld_balance,
        total_referral_reward: data.data.total_referral_reward,
        total_team_reward: data.data.total_team_reward,
        equity: totalEquity,
        _timestamp: timestamp
      })
    }
  } catch (error) {
    console.error('[Assets] Failed to fetch platform balance:', error)
    // IMPORTANT:
    // Keep last known balances when the backend request fails.
    // Do NOT fallback to on-chain token balance here because "platform balance"
    // is an internal ledger value and may differ from wallet token holdings.
  } finally {
    walletStore.setLoadingBalance(false)
  }
}

/**
 * 获取用户今日量化收益
 * 添加时间戳参数防止浏览器缓存
 */
const fetchTodayEarnings = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress) {
    todayEarnings.value = 0
    return
  }
  
  try {
    const timestamp = Date.now()
    const response = await fetch(
      `/api/robot/today-earnings?wallet_address=${walletStore.walletAddress}&_t=${timestamp}`,
      { cache: 'no-store' }
    )
    const data = await response.json()
    
    if (data.success && data.data) {
      todayEarnings.value = parseFloat(data.data.today_earnings) || 0
      console.log('[Assets] Today earnings fetched:', todayEarnings.value)
    }
  } catch (error) {
    console.error('[Assets] Failed to fetch today earnings:', error)
    todayEarnings.value = 0
  }
}

/**
 * 打开充值弹窗
 */
const openDepositModal = () => {
  if (!walletStore.isConnected) {
    alert(t('assetsPage.connectWalletFirst'))
    return
  }
  showDepositModal.value = true
}

/**
 * 充值成功回调
 */
const handleDepositSuccess = async (data) => {
  console.log('[Assets] Deposit success:', data)
  // 记录充值行为
  trackDeposit(data?.amount || 0)
  // 刷新余额
  await fetchPlatformBalance()
}

/**
 * 打开提款弹窗
 */
const openWithdrawModal = () => {
  if (!walletStore.isConnected) {
    alert(t('assetsPage.connectWalletFirst'))
    return
  }
  showWithdrawModal.value = true
}

/**
 * 打开量化收益明细弹窗
 */
const openQuantifyHistory = () => {
  if (!walletStore.isConnected) {
    alert(t('assetsPage.connectWalletFirst'))
    return
  }
  showQuantifyHistory.value = true
}

/**
 * 提款成功回调
 */
const handleWithdrawSuccess = async (data) => {
  console.log('[Assets] Withdraw success:', data)
  // 记录提款行为
  trackWithdraw(data?.amount || 0)
  // 刷新余额
  await fetchPlatformBalance()
}

// 处理输入
const handleCodeInput = (index) => {
  // 只允许输入数字
  safeCode.value[index] = safeCode.value[index].replace(/[^0-9]/g, '')
  
  // 如果输入了内容，自动跳到下一个输入框
  if (safeCode.value[index] && index < 5) {
    codeInputs.value[index + 1]?.focus()
  }
}

// 处理键盘事件
const handleKeyDown = (event, index) => {
  // 按删除键时跳到上一个输入框
  if (event.key === 'Backspace' && !safeCode.value[index] && index > 0) {
    codeInputs.value[index - 1]?.focus()
  }
}

// 提交Safe密码
const handleSafeSubmit = async () => {
  const code = safeCode.value.join('')
  if (code.length !== 6) {
    safeError.value = t('assetsPage.enterSixDigit') || 'Please enter 6 digits'
    return
  }
  
  safeLoading.value = true
  safeError.value = ''
  
  try {
    if (safeMode.value === 'setup') {
      // 首次设置密码
      const response = await fetch('/api/safe/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletStore.walletAddress,
          password: code
        })
      })
      const data = await response.json()
      
      if (data.success) {
        safeStatus.value.has_safe = true
        safeMode.value = 'manage'
        safeCode.value = ['', '', '', '', '', '']
        alert(t('assetsPage.safeCreated') || 'Safe created successfully!')
      } else {
        safeError.value = translateSafeApiError(data.message)
      }
    } else if (safeMode.value === 'verify') {
      // 验证密码
      const response = await fetch('/api/safe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletStore.walletAddress,
          password: code
        })
      })
      const data = await response.json()
      
      if (data.success) {
        safeStatus.value.locked_usdt = data.data.locked_usdt
        safeStatus.value.locked_wld = data.data.locked_wld
        safeMode.value = 'manage'
        safeCode.value = ['', '', '', '', '', '']
      } else {
        safeError.value = translateSafeApiError(data.message)
        // 清空输入框
        safeCode.value = ['', '', '', '', '', '']
        setTimeout(() => {
          if (codeInputs.value[0]) {
            codeInputs.value[0].focus()
          }
        }, 100)
      }
    }
  } catch (error) {
    console.error('保险箱操作失败:', error)
    safeError.value = t('assetsPage.networkError') || 'Network error'
  } finally {
    safeLoading.value = false
  }
}

// 保险箱存款
const handleSafeDeposit = async (token = 'USDT') => {
  const code = safeCode.value.join('')
  const amountStr = prompt(t('assetsPage.enterDepositAmount') || `Enter ${token} amount to deposit:`)
  if (!amountStr) return
  
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) {
    alert(t('assetsPage.invalidAmount') || 'Invalid amount')
    return
  }
  
  safeLoading.value = true
  
  try {
    const tokenUpper = String(token || 'USDT').toUpperCase()
    const response = await fetch('/api/safe/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        password: code || prompt(t('assetsPage.enterPassword') || 'Enter password:'),
        amount: amount,
        token: tokenUpper
      })
    })
    const data = await response.json()
    
    if (data.success) {
      // 更新余额
      walletStore.setUsdtBalance(data.data.balance.usdt)
      walletStore.setWldBalance(data.data.balance.wld)
      safeStatus.value.locked_usdt = data.data.safe.locked_usdt
      safeStatus.value.locked_wld = data.data.safe.locked_wld
      alert(t('assetsPage.depositSuccess') || 'Deposit successful!')
    } else {
      alert(translateSafeApiError(data.message, tokenUpper))
    }
  } catch (error) {
    console.error('保险箱存款失败:', error)
    alert(t('assetsPage.networkError') || 'Network error')
  } finally {
    safeLoading.value = false
  }
}

// 保险箱取款
const handleSafeWithdraw = async (token = 'USDT') => {
  const code = safeCode.value.join('')
  const tokenUpper = String(token || 'USDT').toUpperCase()
  const maxAmount = tokenUpper === 'USDT' 
    ? parseFloat(safeStatus.value.locked_usdt) 
    : parseFloat(safeStatus.value.locked_wld)
    
  const amountStr = prompt(
    (t('assetsPage.enterWithdrawAmount') || `Enter ${token} amount to withdraw:`) + 
    ` (Max: ${maxAmount.toFixed(4)})`
  )
  if (!amountStr) return
  
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) {
    alert(t('assetsPage.invalidAmount') || 'Invalid amount')
    return
  }
  
  if (amount > maxAmount) {
    alert(t('assetsPage.insufficientLocked') || 'Insufficient locked balance')
    return
  }
  
  safeLoading.value = true
  
  try {
    const response = await fetch('/api/safe/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletStore.walletAddress,
        password: code || prompt(t('assetsPage.enterPassword') || 'Enter password:'),
        amount: amount,
        token: tokenUpper
      })
    })
    const data = await response.json()
    
    if (data.success) {
      // 更新余额
      walletStore.setUsdtBalance(data.data.balance.usdt)
      walletStore.setWldBalance(data.data.balance.wld)
      safeStatus.value.locked_usdt = data.data.safe.locked_usdt
      safeStatus.value.locked_wld = data.data.safe.locked_wld
      alert(t('assetsPage.withdrawSuccess') || 'Withdraw successful!')
    } else {
      alert(translateSafeApiError(data.message, tokenUpper))
    }
  } catch (error) {
    console.error('保险箱取款失败:', error)
    alert(t('assetsPage.networkError') || 'Network error')
  } finally {
    safeLoading.value = false
  }
}

// 处理 WLD 和 USDT 交换
const handleSwap = () => {
  // 显示加载动画
  showSwapLoading.value = true
  
  // 1.5秒后执行交换并关闭动画
  setTimeout(() => {
    // 切换币种位置
    isSwapped.value = !isSwapped.value
    
    // 清空输入值
    topInputAmount.value = ''
    
    // 关闭加载动画
    showSwapLoading.value = false
  }, 1500)
}

/**
 * 处理确认兑换按钮点击
 */
const handleConfirmExchange = async () => {
  // 检查钱包是否连接
  if (!walletStore.isConnected) {
    exchangeAlertType.value = 'warning'
    exchangeAlertMessage.value = t('assetsPage.connectWalletFirst')
    showExchangeAlert.value = true
    
    setTimeout(() => {
      showExchangeAlert.value = false
    }, 2000)
    return
  }
  
  // 获取当前兑换方向和金额
  const fromCurrency = topCurrency.value
  const exchangeAmount = parseFloat(topInputAmount.value) || 0
  
  // 获取当前用户余额
  let fromBalance = 0
  if (fromCurrency === 'WLD') {
    fromBalance = parseFloat(walletStore.wldBalance) || 0
  } else {
    fromBalance = parseFloat(walletStore.usdtBalance) || 0
  }
  
  // 检查输入金额是否有效
  if (exchangeAmount <= 0) {
    exchangeAlertType.value = 'warning'
    exchangeAlertMessage.value = t('assetsPage.enterAmount') || 'Please enter a valid amount'
    showExchangeAlert.value = true
    
    setTimeout(() => {
      showExchangeAlert.value = false
    }, 2000)
    return
  }
  
  // 检查余额是否足够
  if (exchangeAmount > fromBalance) {
    exchangeAlertType.value = 'warning'
    exchangeAlertMessage.value = t('assetsPage.insufficientBalance', { currency: fromCurrency })
    showExchangeAlert.value = true
    
    setTimeout(() => {
      showExchangeAlert.value = false
    }, 2000)
    return
  }
  
  // 确定兑换方向
  const direction = fromCurrency === 'WLD' ? 'wld_to_usdt' : 'usdt_to_wld'
  
  // WLD 换 USDT 需要检查等级限制
  if (direction === 'wld_to_usdt') {
    if (userLevel.value === 0) {
      exchangeAlertType.value = 'warning'
      exchangeAlertMessage.value = t('assetsPage.inviteToExchange') || 'Invite members to unlock WLD exchange'
      showExchangeAlert.value = true
      
      setTimeout(() => {
        showExchangeAlert.value = false
      }, 2000)
      return
    }
    
    // 检查每日限额
    const remaining = dailyRedeemableWld.value - todayExchangedWld.value
    if (exchangeAmount > remaining) {
      exchangeAlertType.value = 'warning'
      exchangeAlertMessage.value = `Daily limit exceeded. You can only exchange ${remaining.toFixed(4)} WLD today.`
      showExchangeAlert.value = true
      
      setTimeout(() => {
        showExchangeAlert.value = false
      }, 2000)
      return
    }
  }
  
  try {
    // 调用兑换 API
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vitufinance.com'
    const response = await fetch(`${API_BASE}/api/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wallet: walletStore.walletAddress,
        direction: direction,
        amount: exchangeAmount
      })
    })
    const result = await response.json()
    
    if (result.success) {
      // 更新本地余额
      walletStore.setUsdtBalance(result.data.newUsdtBalance)
      walletStore.setWldBalance(result.data.newWldBalance)
      
      // 更新已兑换数量
      if (direction === 'wld_to_usdt') {
        todayExchangedWld.value = parseFloat(todayExchangedWld.value) + exchangeAmount
      }
      
      // 清空输入框
      topInputAmount.value = ''
      
      // 显示成功提示
  exchangeAlertType.value = 'success'
  exchangeAlertMessage.value = t('assetsPage.exchangeSuccess')
  showExchangeAlert.value = true
  
  setTimeout(() => {
    showExchangeAlert.value = false
  }, 2000)
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    console.error('兑换失败:', error)
    exchangeAlertType.value = 'warning'
    exchangeAlertMessage.value = error.message || 'Exchange failed'
    showExchangeAlert.value = true
    
    setTimeout(() => {
      showExchangeAlert.value = false
    }, 2000)
  }
}

/**
 * 关闭兑换提示弹窗
 */
const closeExchangeAlert = () => {
  showExchangeAlert.value = false
}
</script>

<style scoped>
.assets-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a1e 0%, #0f0f12 100%);
  padding: 120px 0 100px 0;
}

.page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

/* 卡片堆叠容器 */
.card-stack-wrapper {
  position: relative;
  width: 399px;
  height: 336px;
  margin: 0 auto;
}

/* 叠加层效果 */
.card-layer {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2a2d35 0%, #1f2229 100%);
  border-radius: 16px;
}

/* 第三层（最底部） */
.card-layer-3 {
  bottom: -16px;
  width: 90%;
  height: 20px;
  opacity: 0.3;
  z-index: 1;
}

/* 第二层 */
.card-layer-2 {
  bottom: -8px;
  width: 95%;
  height: 30px;
  opacity: 0.5;
  z-index: 2;
}

/* 主卡片 */
.one-view {
  position: relative;
  width: 399px;
  height: 336px;
  background: linear-gradient(135deg, #3a3d45 0%, #2f3239 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 3;
}

/* 标题 */
.card-header {
  text-align: center;
  margin-bottom: 16px;
}

.equity-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* 主要金额 */
.equity-amount {
  text-align: center;
  margin-bottom: 12px;
}

.amount-value {
  font-size: 48px;
  font-weight: 700;
  color: #f5a623;
  letter-spacing: 1px;
}

/* 今日盈亏 */
.today-pnl {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.today-pnl.clickable {
  cursor: pointer;
  padding: 8px 12px;
  margin: -8px -12px;
  margin-bottom: 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.today-pnl.clickable:hover {
  background: rgba(255, 255, 255, 0.05);
}

.today-pnl.clickable:active {
  background: rgba(255, 255, 255, 0.08);
}

.pnl-arrow {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;
  transition: transform 0.2s ease;
}

.today-pnl.clickable:hover .pnl-arrow {
  transform: translateX(2px);
  color: rgba(255, 255, 255, 0.6);
}

.pnl-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.pnl-value {
  font-size: 14px;
  font-weight: 600;
}

.pnl-value.positive {
  color: #4ade80;
}

.pnl-value.negative {
  color: #ef4444;
}

/* 资产列表 */
.asset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.asset-item:hover {
  background: rgba(255, 255, 255, 0.08);
}


.asset-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.asset-name {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.asset-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.asset-balance {
  font-size: 18px;
  font-weight: 600;
  color: #f5a623;
  min-width: 80px;
  text-align: right;
}

.details-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.details-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .assets-page {
    padding: 100px 0 100px 0;
  }

  .card-stack-wrapper,
  .one-view {
    width: 350px;
    min-height: 336px;
  }

  .amount-value {
    font-size: 40px;
  }

  .asset-icon {
    width: 22px;
    height: 22px;
  }

  .asset-name {
    font-size: 16px;
  }

  .asset-balance {
    font-size: 16px;
    min-width: 70px;
  }

  .details-btn {
    padding: 5px 12px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .card-stack-wrapper,
  .one-view {
    width: 320px;
  }

  .one-view {
    padding: 20px;
  }

  .amount-value {
    font-size: 36px;
  }

  .asset-right {
    gap: 12px;
  }

  .asset-balance {
    font-size: 15px;
    min-width: 60px;
  }
}

/* 第二个容器 - 操作按钮 */
.action-buttons-container {
  display: flex;
  gap: 16px;
  width: 399px;
  margin: 24px auto 0;
}

.action-btn {
  flex: 1;
  height: 56px;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-icon {
  width: 23px;
  height: 23px;
  object-fit: contain;
}

.btn-text {
  line-height: 1;
}

/* Deposit 按钮 - 橙色 */
.deposit-btn {
  background: linear-gradient(135deg, #f5a623 0%, #e89b1f 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
}

.deposit-btn:hover {
  background: linear-gradient(135deg, #f7b040 0%, #f0a935 100%);
  box-shadow: 0 6px 16px rgba(245, 166, 35, 0.4);
  transform: translateY(-2px);
}

.deposit-btn:active {
  transform: translateY(0);
}

/* Withdraw 按钮 - 灰白色 */
.withdraw-btn {
  background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.withdraw-btn:hover {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.withdraw-btn:active {
  transform: translateY(0);
}

/* 移动端适配 - 操作按钮 */
@media (max-width: 768px) {
  .action-buttons-container {
    width: 350px;
  }

  .action-btn {
    height: 52px;
    font-size: 15px;
  }

  .btn-icon {
    width: 23px;
    height: 23px;
  }
}

@media (max-width: 480px) {
  .action-buttons-container {
    width: 320px;
    gap: 12px;
  }

  .action-btn {
    height: 50px;
    font-size: 14px;
    gap: 6px;
  }

  .btn-icon {
    width: 20px;
    height: 20px;
  }
}

/* 第三个容器 - Flash Exchange */
.two-view {
  width: 432px;
  height: 516px;
  background: linear-gradient(135deg, #3a3d45 0%, #2f3239 100%);
  border-radius: 16px;
  padding: 32px 24px;
  margin: 24px auto 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

/* 顶部图标 */
.exchange-icon-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.exchange-icon {
  width: 106px;
  height: 106px;
  object-fit: contain;
}

/* 标题 */
.exchange-title {
  text-align: center;
  margin-bottom: 24px;
}

.exchange-title h2 {
  font-size: 28px;
  font-weight: 700;
  color: #f5a623;
  margin: 0;
  letter-spacing: 0.5px;
}

/* 输入组 */
.exchange-input-group {
  width: 100%;
  max-width: 389px;
  height: 61px;
  background-image: url('/static/YAOQI/9.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 12px;
  padding: 8px 16px;
  margin: 0 auto 12px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
}

.input-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.input-right {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  margin-left: 12px;
}

/* 兑换输入框样式 */
.exchange-input {
  width: 100%;
  max-width: 200px;
  font-size: 24px;
  font-weight: 700;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  margin: 0;
  min-width: 0;
}

.exchange-input.wld-input {
  color: #f5a623;
}

.exchange-input.usdt-input {
  color: #00D094;
}

.exchange-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

/* 兑换结果显示 */
.exchange-result {
  font-size: 24px;
  font-weight: 700;
}

.exchange-result.wld-result {
  color: #f5a623;
}

.exchange-result.usdt-result {
  color: #00D094;
}

.input-number {
  font-size: 24px;
  font-weight: 700;
  color: #f5a623;
}

.input-amount {
  font-size: 20px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.currency-name {
  font-size: 18px;
  font-weight: 700;
}

.currency-name.wld-color {
  color: #f5a623;
}

.currency-name.usdt-color {
  color: #00D094;
}

.currency-divider {
  width: 1px;
  height: 18px;
  background: rgba(216, 216, 216, 0.6);
  margin: 0 10px;
}

.max-badge {
  font-size: 14px;
  font-weight: 600;
  color: rgba(216, 216, 216, 0.9);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  background: transparent;
  border: none;
}

.max-badge:hover {
  color: #f5a623;
}

.max-badge:active {
  transform: scale(0.95);
}

.input-balance {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.balance-animated {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  /* 性能优化：避免闪烁 */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
}

/* 转换图标 */
.exchange-swap-icon {
  display: flex;
  justify-content: center;
  margin: 8px 0;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.exchange-swap-icon:hover {
  transform: scale(1.1);
}

.exchange-swap-icon:active {
  transform: scale(0.95);
}

.swap-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* 交换加载蒙版 */
.swap-loading-overlay {
  position: absolute;
  top: 150px;
  left: 0;
  right: 0;
  width: 100%;
  height: 240px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
  pointer-events: none;
}

/* 三个圆圈加载动画容器 */
.swap-loading-dots {
  width: 398px;
  height: 230px;
  background: rgba(47, 50, 57, 0.95);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: scaleIn 0.3s ease;
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f5a623;
  animation: dotPulse 1.4s infinite ease-in-out;
}

.dot-1 {
  animation-delay: 0s;
}

.dot-2 {
  animation-delay: 0.2s;
}

.dot-3 {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 移动端适配 - 加载框 */
@media (max-width: 768px) {
  .swap-loading-dots {
    width: 350px;
    height: 210px;
  }

  .dot {
    width: 10px;
    height: 10px;
  }
}

@media (max-width: 480px) {
  .swap-loading-dots {
    width: 320px;
    height: 200px;
  }

  .dot {
    width: 9px;
    height: 9px;
  }
}

/* 价格显示行 */
.exchange-price-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.price-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.price-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

/* 兑换限额显示行 */
.exchange-limit-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.limit-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.limit-value {
  font-size: 14px;
  font-weight: 600;
  color: #f5b638;
}

/* 按钮区域容器 */
.exchange-buttons-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

/* 解锁提示按钮 */
.unlock-hint-btn {
  width: 100%;
  max-width: 280px;
  height: 38px;
  background: rgba(245, 182, 56, 0.1);
  border: 1px solid rgba(245, 182, 56, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #f5b638;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unlock-hint-btn:hover {
  background: rgba(245, 182, 56, 0.15);
  border-color: #f5b638;
}

.unlock-hint-btn:active {
  transform: scale(0.98);
}

.info-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.info-value.green {
  color: #4ade80;
}

.info-value-usdt {
  font-size: 14px;
  font-weight: 600;
  color: #00D094;
}

/* 确认兑换按钮 */
.confirm-exchange-btn {
  width: 100%;
  max-width: 280px;
  height: 44px;
  background: #f5b638;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #161616;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-exchange-btn:hover {
  background: #f7c04d;
  transform: translateY(-1px);
}

.confirm-exchange-btn:active {
  transform: translateY(0);
}

/* PC端适配 - Flash Exchange */
@media (min-width: 769px) {
  .exchange-buttons-wrapper {
    gap: 12px;
    width: 100%;
    max-width: 380px;
  }

  .unlock-hint-btn {
    max-width: 100%;
    height: 40px;
    font-size: 14px;
  }

  .confirm-exchange-btn {
    max-width: 100%;
    height: 48px;
    font-size: 16px;
  }
}

/* 移动端适配 - Flash Exchange */
@media (max-width: 768px) {
  .two-view {
    width: 350px;
    height: auto;
    min-height: 480px;
    padding: 28px 20px;
  }

  .exchange-icon {
    width: 90px;
    height: 90px;
  }

  .exchange-title h2 {
    font-size: 24px;
  }

  .input-number,
  .currency-name,
  .currency-name-only {
    font-size: 18px;
  }

  .input-amount {
    font-size: 18px;
  }

  .exchange-input-group {
    max-width: 100%;
    height: 61px;
  }

  .exchange-buttons-wrapper {
    gap: 10px;
  }

  .unlock-hint-btn {
    max-width: 260px;
    height: 36px;
    font-size: 12px;
  }

  .confirm-exchange-btn {
    max-width: 260px;
    height: 42px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .two-view {
    width: 320px;
    height: auto;
    min-height: 460px;
    padding: 24px 16px;
  }

  .exchange-icon {
    width: 80px;
    height: 80px;
  }

  .exchange-title h2 {
    font-size: 22px;
  }

  .input-number,
  .currency-name,
  .currency-name-only {
    font-size: 16px;
  }

  .input-amount {
    font-size: 16px;
  }

  .max-badge {
    padding: 3px 10px;
    font-size: 12px;
  }

  .exchange-input-group {
    max-width: 100%;
    height: 61px;
  }

  .exchange-price-row,
  .exchange-limit-row {
    font-size: 13px;
  }

  .price-label,
  .limit-label {
    font-size: 13px;
  }

  .price-value,
  .limit-value {
    font-size: 13px;
  }

  .exchange-buttons-wrapper {
    gap: 8px;
  }

  .unlock-hint-btn {
    max-width: 240px;
    height: 34px;
    font-size: 11px;
  }

  .confirm-exchange-btn {
    max-width: 240px;
    height: 40px;
    font-size: 14px;
  }
}

/* 第四个容器 - 卡片网格 */
.cards-grid-container {
  display: grid;
  grid-template-columns: repeat(2, 207px);
  gap: 18px;
  width: 432px;
  margin: 24px auto 0;
  justify-content: center;
}

.info-card {
  position: relative;
  width: 207px;
  height: 161px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
  text-decoration: none;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-title {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  width: 100%;
  padding: 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  line-height: 1.2;
}

/* 移动端适配 - 卡片网格 */
@media (max-width: 768px) {
  .cards-grid-container {
    grid-template-columns: repeat(2, 165px);
    gap: 16px;
    width: 350px;
  }

  .info-card {
    width: 165px;
    height: 128px;
  }

  .card-title {
    font-size: 14px;
    bottom: 10px;
    padding: 0 12px;
  }
}

@media (max-width: 480px) {
  .cards-grid-container {
    grid-template-columns: repeat(2, 150px);
    gap: 14px;
    width: 320px;
  }

  .info-card {
    width: 150px;
    height: 117px;
  }

  .card-title {
    font-size: 13px;
    bottom: 8px;
    padding: 0 10px;
  }
}

/* Open Safe 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.safe-modal {
  position: relative;
  width: 397px;
  min-height: 288px;
  background: linear-gradient(135deg, #4a4d5a 0%, #3a3d48 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

/* 标题 */
.modal-title {
  width: 360px;
  height: 20px;
  font-size: 18px;
  font-weight: 600;
  color: rgb(255, 255, 255);
  margin: 0 0 12px 0;
  text-align: left;
  line-height: 20px;
}

/* 副标题 */
.modal-subtitle {
  width: 360px;
  height: 25px;
  font-size: 17px;
  font-family: "PingFang SC", "PingFang SC-Bold", sans-serif;
  font-weight: 700;
  color: rgb(167, 167, 167);
  margin: 0 0 16px 0;
  text-align: left;
  line-height: 25px;
}

/* 密码输入框容器 */
.code-input-container {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

/* 单个输入框 */
.code-input-item {
  width: 45px;
  height: 45px;
  border: 1px solid rgb(105, 88, 214);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  outline: none;
  transition: all 0.3s ease;
}

.code-input-item:focus {
  border-color: rgb(135, 118, 244);
  background: rgba(135, 118, 244, 0.1);
  box-shadow: 0 0 0 3px rgba(105, 88, 214, 0.2);
}

/* 锁定余额 */
.lock-balance {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 20px 0;
}

/* 保险箱错误提示 */
.safe-error {
  color: #ff6b6b;
  font-size: 13px;
  margin: 8px 0;
  text-align: center;
}

/* 保险箱加载状态 */
.safe-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  z-index: 10;
}

.safe-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 管理模式弹窗 */
.safe-modal.manage-mode {
  height: auto;
  min-height: 320px;
}

/* 保险箱资产显示 */
.safe-assets {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
}

.safe-asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.safe-asset-item:last-child {
  border-bottom: none;
}

.safe-asset-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.safe-asset-value {
  color: #4ade80;
  font-size: 18px;
  font-weight: 600;
}

/* 保险箱操作按钮 */
.safe-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  margin-bottom: 16px;
}

.safe-action-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.safe-action-btn.deposit {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  color: #fff;
}

.safe-action-btn.deposit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
}

.safe-action-btn.withdraw {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

.safe-action-btn.withdraw:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

/* 全宽按钮 */
.modal-btn.full-width {
  width: 100%;
}

/* 按钮组 */
.modal-buttons {
  display: flex;
  gap: 16px;
  margin-top: auto;
}

/* 按钮基础样式 */
.modal-btn {
  width: 160px;
  height: 49px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Cancel 按钮 */
.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Sure 按钮 */
.sure-btn {
  background: linear-gradient(135deg, rgb(105, 88, 214) 0%, rgb(125, 108, 234) 100%);
  color: #fff;
}

.sure-btn:hover {
  background: linear-gradient(135deg, rgb(125, 108, 234) 0%, rgb(145, 128, 254) 100%);
  box-shadow: 0 4px 12px rgba(105, 88, 214, 0.4);
}

/* 移动端适配 - 弹窗 */
@media (max-width: 768px) {
  .safe-modal {
    width: 350px;
    height: 288px;
    padding: 20px;
  }

  .modal-title,
  .modal-subtitle {
    width: 310px;
  }

  .code-input-item {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .code-input-container {
    gap: 12px;
  }

  .modal-btn {
    width: 140px;
    height: 46px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .safe-modal {
    width: 320px;
    height: 280px;
    padding: 18px;
  }

  .modal-title,
  .modal-subtitle {
    width: 284px;
    font-size: 16px;
  }

  .modal-subtitle {
    font-size: 15px;
  }

  .code-input-item {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .code-input-container {
    gap: 10px;
  }

  .modal-btn {
    width: 130px;
    height: 44px;
    font-size: 14px;
  }

  .modal-buttons {
    gap: 12px;
  }
}

/* Details 侧边抽屉 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 9998;
  backdrop-filter: blur(2px);
}

.details-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 463px;
  height: 100vh;
  background: rgb(15, 15, 18);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

/* 抽屉内导航栏 */
.drawer-navigation {
  width: 100%;
  height: 108px;
  background-image: url('/static/two/headbgimg.png');
  background-size: 100% 100%;
  background-position: top center;
  background-repeat: no-repeat;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.drawer-nav-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

/* 左侧 - 菜单图标 */
.drawer-nav-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.drawer-menu-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.drawer-menu-icon:hover {
  opacity: 0.8;
}

/* 中间 - Connect Wallet */
.drawer-nav-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.3s ease;
  max-width: calc(100% - 200px);
  padding: 4px 8px;
}

.drawer-nav-center:hover {
  opacity: 0.8;
}

.drawer-wallet-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.drawer-wallet-text {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  line-height: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

/* 右侧 - 语言选择器 */
.drawer-nav-right {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  max-width: 180px;
}

.drawer-nav-right:hover {
  opacity: 0.9;
}

.drawer-globe-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.drawer-language-text {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.drawer-arrow-icon {
  display: inline-block;
  font-size: 16px;
  color: #fff;
  font-weight: 400;
  line-height: 1;
  transition: transform 0.3s ease;
  flex-shrink: 0;
  margin-left: 4px;
}

.drawer-arrow-icon.arrow-up {
  transform: rotate(180deg);
}

/* 语言下拉菜单 */
.drawer-language-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 193px;
  max-height: 430px;
  background: #4F4843;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
  overflow-y: auto;
  z-index: 10000;
  animation: drawerDropdownSlide 0.2s ease;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.drawer-language-dropdown::-webkit-scrollbar {
  display: none;
}

@keyframes drawerDropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 三角形指示器 */
.drawer-dropdown-triangle {
  position: absolute;
  top: -22px;
  right: 21px;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-bottom: 22px solid #4F4843;
}

.drawer-language-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 193px;
  height: 88px;
  color: #f7f7f7;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: #544D47;
}

.drawer-language-option:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.drawer-language-option:last-child {
  border-bottom: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.drawer-language-option:hover {
  background: #60554D;
}

.drawer-language-option.active {
  background: #524C45;
  color: #fff;
}

.drawer-lang-name {
  text-align: center;
}

/* 币种信息区域 */
.drawer-header {
  width: 100%;
  min-height: 90px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(180deg, #2a1f00 0%, #1a1400 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-icon {
  width: 46px;
  height: 46px;
  object-fit: contain;
  flex-shrink: 0;
}

.drawer-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: rgb(255, 255, 255);
  margin: 0;
  line-height: 1;
}

.drawer-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1;
}

/* 内容区域 */
.drawer-content {
  flex: 1;
  width: 463px;
  background: rgb(15, 15, 18);
  padding: 24px;
  overflow-y: auto;
}

/* 抽屉余额信息 */
.drawer-balance-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.drawer-balance-amount {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.drawer-balance-value {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

/* 签到记录列表 */
.checkin-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

/* 签到记录卡片 - 335x80 */
.checkin-record-card {
  width: 335px;
  height: 80px;
  background: linear-gradient(135deg, #1e3a4c 0%, #1a2d3a 100%);
  border-radius: 12px;
  padding: 12px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
}


/* ==================== 统一交易记录卡片样式 ==================== */

/* 卡片头部 */
.tx-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

/* 交易类型标签 */
.tx-type {
  font-size: 15px;
  font-weight: 600;
}

.tx-type.deposit {
  color: #4ade80;
}

.tx-type.withdraw {
  color: #f5a623;
}

.tx-type.quantify {
  color: #60a5fa;
}

.tx-type.referral {
  color: #a78bfa;
}

.tx-type.team-reward {
  color: #60a5fa;
}

.tx-type.margin-refund {
  color: #4ade80;
}

.tx-type.checkin {
  color: #fbbf24;
}

/* 状态标签 */
.tx-status {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.tx-status.pending {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.tx-status.completed {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.tx-status.failed {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

/* 卡片主体 */
.tx-card-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* 左侧信息区 */
.tx-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.tx-address {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  word-break: break-all;
}

.tx-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 右侧金额区 */
.tx-amount-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 16px;
  flex-shrink: 0;
}

.tx-amount {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.tx-amount.deposit {
  color: #4ade80;
}

.tx-amount.withdraw {
  color: #f87171;
}

.tx-currency {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

/* 卡片底部 - 手续费区域 */
.tx-card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tx-fee-row,
.tx-actual-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.tx-fee-label,
.tx-actual-label {
  color: rgba(255, 255, 255, 0.5);
}

.tx-fee-value {
  color: #f87171;
  font-weight: 500;
}

.tx-actual-row {
  background: rgba(251, 191, 36, 0.08);
  padding: 8px 10px;
  border-radius: 6px;
  margin-top: 2px;
}

.tx-actual-label {
  color: rgba(251, 191, 36, 0.8);
  font-weight: 500;
}

.tx-actual-value {
  font-size: 14px;
  font-weight: 600;
  color: #fbbf24;
}

/* 无记录提示 */
.no-records-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin-top: 40px;
}

/* USDT 记录列表 */
.usdt-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

.records-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* USDT 记录卡片 - 自适应高度 */
.usdt-record-card {
  width: 335px;
  min-height: 80px;
  background: linear-gradient(135deg, #1e3a4c 0%, #1a2d3a 100%);
  border-radius: 12px;
  padding: 12px 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  overflow: visible;
}

/* 充值标题 - 绿色 */
.deposit-title {
  color: #4ade80 !important;
}

/* 提现标题 - 橙色 */
.withdraw-title {
  color: #f5a623 !important;
}

/* 量化收益标题 - 蓝色 */
.quantify-title {
  color: #60a5fa !important;
}

/* 推荐奖励标题 - 紫色 */
.referral-title {
  color: #a78bfa !important;
}

/* 状态标签 */
.record-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.record-status.pending {
  background: rgba(245, 166, 35, 0.2);
  color: #f5a623;
}

.record-status.processing {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.record-status.completed {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.record-status.failed {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* 充值金额 - 绿色 */
.deposit-amount {
  color: #4ade80 !important;
}

/* 提现金额 - 红色 */
.withdraw-amount {
  color: #ef4444 !important;
}

.coming-soon-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  margin-top: 40px;
}

/* 抽屉动画 */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-active .details-drawer,
.drawer-leave-active .details-drawer {
  transition: transform 0.3s ease;
}

.drawer-enter-from .details-drawer {
  transform: translateX(100%);
}

.drawer-leave-to .details-drawer {
  transform: translateX(100%);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

/* 移动端适配 - 抽屉 */
@media (max-width: 768px) {
  .details-drawer {
    width: 100%;
  }

  .drawer-navigation {
    height: 90px;
    padding: 12px;
  }

  .drawer-wallet-text,
  .drawer-language-text {
    font-size: 13px;
  }

  .drawer-nav-center {
    max-width: calc(100% - 180px);
  }

  .drawer-wallet-text {
    max-width: 120px;
  }

  .drawer-language-text {
    max-width: 100px;
  }

  .drawer-nav-right {
    max-width: 150px;
  }

  .drawer-language-dropdown {
    width: 115px;
    max-height: 482px;
  }

  .drawer-dropdown-triangle {
    right: 15px;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-bottom: 15px solid #4F4843;
    top: -15px;
  }

  .drawer-language-option {
    width: 115px;
    height: 55px;
    font-size: 13px;
  }

  .drawer-arrow-icon {
    font-size: 14px;
  }

  .drawer-header {
    width: 100%;
    padding: 12px;
  }

  .drawer-content {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .drawer-navigation {
    height: 80px;
    padding: 10px;
  }

  .drawer-menu-icon {
    width: 20px;
    height: 20px;
  }

  .drawer-wallet-icon,
  .drawer-globe-icon {
    width: 14px;
    height: 14px;
  }

  .drawer-wallet-text,
  .drawer-language-text {
    font-size: 12px;
  }

  .drawer-nav-center {
    max-width: calc(100% - 160px);
  }

  .drawer-wallet-text {
    max-width: 100px;
  }

  .drawer-language-text {
    max-width: 90px;
  }

  .drawer-nav-right {
    max-width: 130px;
  }

  .drawer-arrow-icon {
    font-size: 13px;
  }

  .drawer-header {
    height: 60px;
    padding: 10px;
  }

  .drawer-icon {
    width: 40px;
    height: 40px;
  }

  .drawer-title {
    font-size: 16px;
  }

  .drawer-subtitle {
    font-size: 11px;
  }
}

/* 兑换提示弹窗 */
.exchange-alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10200;
  animation: fadeIn 0.2s ease;
}

.exchange-alert-box {
  width: 128px;
  height: 90px;
  background: rgba(60, 60, 65, 0.95);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  animation: scaleIn 0.2s ease;
}

.alert-icon {
  font-size: 28px;
  line-height: 1;
}

.alert-message {
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
  margin: 0;
  padding: 0 8px;
  line-height: 1.3;
}

/* ========================================
   文档查看器弹窗样式
   ======================================== */
.doc-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 15, 18, 0.98);
  display: flex;
  flex-direction: column;
  z-index: 99999;
}

/* 顶部栏 */
.doc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.doc-header-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.doc-close-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.doc-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 多页画廊 */
.doc-gallery {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

.doc-gallery-inner {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-gallery-picture {
  width: 100%;
  display: block;
}

.doc-gallery-page {
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 单张图片 */
.doc-single-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: pointer;
}

/* PDF 文档 */
.doc-pdf {
  flex: 1;
  padding: 12px;
}

.doc-pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  background: #fff;
}

.doc-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  cursor: default;
}

/* 文档查看器过渡动画 */
.doc-fade-enter-active,
.doc-fade-leave-active {
  transition: opacity 0.3s ease;
}

.doc-fade-enter-from,
.doc-fade-leave-to {
  opacity: 0;
}
</style>
