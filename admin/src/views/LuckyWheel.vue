<template>
  <div class="lucky-wheel-management">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon blue">
              <el-icon :size="28"><Present /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalSpins }}</div>
              <div class="stat-label">总抽奖次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon green">
              <el-icon :size="28"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.uniqueUsers }}</div>
              <div class="stat-label">参与用户</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon orange">
              <el-icon :size="28"><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(stats.totalPointsEarned) }}</div>
              <div class="stat-label">发放幸运值</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6" :md="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon purple">
              <el-icon :size="28"><Coin /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(stats.totalWLD) }} WLD</div>
              <div class="stat-label">发放奖励</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 奖项统计 -->
    <el-card class="prize-stats-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>各奖项统计</span>
          <el-button type="primary" size="small" @click="fetchStats">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="stats.prizeStats" stripe style="width: 100%">
        <el-table-column prop="prize_name" label="奖项" width="120" />
        <el-table-column prop="count" label="中奖次数" width="120" />
        <el-table-column prop="reward_type" label="奖品类型" width="100" />
        <el-table-column prop="total_amount" label="发放总额">
          <template #default="{ row }">
            {{ formatNumber(row.total_amount) }} {{ row.reward_type }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 标签页 -->
    <el-card class="main-card" shadow="hover">
      <el-tabs v-model="activeTab">
        <!-- 抽奖记录 -->
        <el-tab-pane label="抽奖记录" name="records">
          <div class="filter-bar">
            <el-input
              v-model="recordFilters.wallet_address"
              placeholder="钱包地址"
              clearable
              style="width: 200px"
              @clear="fetchRecords"
            />
            <el-select v-model="recordFilters.wheel_type" placeholder="转盘类型" clearable style="width: 120px" @change="fetchRecords">
              <el-option label="白银" value="silver" />
              <el-option label="黄金" value="gold" />
              <el-option label="钻石" value="diamond" />
            </el-select>
            <el-select v-model="recordFilters.prize_name" placeholder="奖项" clearable style="width: 120px" @change="fetchRecords">
              <el-option label="特等奖" value="特等奖" />
              <el-option label="一等奖" value="一等奖" />
              <el-option label="二等奖" value="二等奖" />
              <el-option label="三等奖" value="三等奖" />
              <el-option label="四等奖" value="四等奖" />
              <el-option label="五等奖" value="五等奖" />
            </el-select>
            <el-date-picker
              v-model="recordFilters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
              @change="fetchRecords"
            />
            <el-button type="primary" @click="fetchRecords">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </div>
          
          <el-table :data="records" stripe v-loading="loading.records" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="wallet_address" label="钱包地址" width="180">
              <template #default="{ row }">
                <span class="wallet-address">{{ formatWallet(row.wallet_address) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="wheel_type" label="转盘类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getWheelTagType(row.wheel_type)">
                  {{ getWheelName(row.wheel_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="prize_name" label="奖项" width="100">
              <template #default="{ row }">
                <el-tag :type="getPrizeTagType(row.prize_name)">{{ row.prize_name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reward_amount" label="奖励" width="140">
              <template #default="{ row }">
                <span class="reward-amount">+{{ row.reward_amount }} {{ row.reward_type }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="points_spent" label="消耗幸运值" width="120" />
            <el-table-column prop="created_at" label="抽奖时间">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="recordPagination.page"
            v-model:page-size="recordPagination.pageSize"
            :total="recordPagination.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchRecords"
            @size-change="fetchRecords"
            style="margin-top: 16px; justify-content: flex-end;"
          />
        </el-tab-pane>

        <!-- 幸运值管理 -->
        <el-tab-pane label="幸运值管理" name="points">
          <div class="filter-bar">
            <el-input
              v-model="pointFilters.wallet_address"
              placeholder="钱包地址"
              clearable
              style="width: 200px"
            />
            <el-input
              v-model="pointFilters.min_points"
              placeholder="最低幸运值"
              type="number"
              style="width: 140px"
            />
            <el-button type="primary" @click="fetchPoints">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button type="success" @click="showAdjustDialog">
              <el-icon><Plus /></el-icon>
              调整幸运值
            </el-button>
            <el-button type="warning" @click="showBatchDialog">
              <el-icon><Files /></el-icon>
              批量发放
            </el-button>
          </div>
          
          <el-table :data="pointUsers" stripe v-loading="loading.points" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="wallet_address" label="钱包地址" width="200">
              <template #default="{ row }">
                <span class="wallet-address">{{ formatWallet(row.wallet_address) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lucky_points" label="当前幸运值" width="140">
              <template #default="{ row }">
                <span class="points-value">{{ formatNumber(row.lucky_points) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="total_earned" label="总获得" width="140">
              <template #default="{ row }">
                {{ formatNumber(row.total_earned) }}
              </template>
            </el-table-column>
            <el-table-column prop="total_spent" label="总消耗" width="140">
              <template #default="{ row }">
                {{ formatNumber(row.total_spent) }}
              </template>
            </el-table-column>
            <el-table-column prop="updated_at" label="更新时间">
              <template #default="{ row }">
                {{ formatTime(row.updated_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="showAdjustDialog(row)">
                  调整
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="pointPagination.page"
            v-model:page-size="pointPagination.pageSize"
            :total="pointPagination.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchPoints"
            @size-change="fetchPoints"
            style="margin-top: 16px; justify-content: flex-end;"
          />
        </el-tab-pane>

        <!-- 获奖公告 -->
        <el-tab-pane label="获奖公告" name="announcements">
          <div class="filter-bar">
            <el-select v-model="announcementFilters.is_virtual" placeholder="公告类型" clearable style="width: 120px" @change="fetchAnnouncements">
              <el-option label="全部" value="" />
              <el-option label="真实" value="false" />
              <el-option label="虚拟" value="true" />
            </el-select>
            <el-button type="primary" @click="fetchAnnouncements">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="showAddAnnouncementDialog">
              <el-icon><Plus /></el-icon>
              添加虚拟公告
            </el-button>
            <el-button type="danger" @click="clearVirtualAnnouncements">
              <el-icon><Delete /></el-icon>
              清空虚拟公告
            </el-button>
          </div>
          
          <el-table :data="announcements" stripe v-loading="loading.announcements" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="wallet_address" label="钱包地址" width="180" />
            <el-table-column prop="prize_name" label="奖项" width="100">
              <template #default="{ row }">
                <el-tag :type="getPrizeTagType(row.prize_name)">{{ row.prize_name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reward_display" label="奖励显示" width="140" />
            <el-table-column prop="is_virtual" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_virtual ? 'warning' : 'success'">
                  {{ row.is_virtual ? '虚拟' : '真实' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-popconfirm title="确定删除？" @confirm="deleteAnnouncement(row.id)">
                  <template #reference>
                    <el-button type="danger" size="small" link>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="announcementPagination.page"
            v-model:page-size="announcementPagination.pageSize"
            :total="announcementPagination.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchAnnouncements"
            @size-change="fetchAnnouncements"
            style="margin-top: 16px; justify-content: flex-end;"
          />
        </el-tab-pane>

        <!-- 指定中奖 -->
        <el-tab-pane label="指定中奖" name="rigged">
          <div class="filter-bar">
            <el-select v-model="riggedFilters.used" placeholder="状态" clearable style="width: 120px" @change="fetchRigged">
              <el-option label="全部" value="" />
              <el-option label="待使用" value="false" />
              <el-option label="已使用" value="true" />
            </el-select>
            <el-button type="primary" @click="fetchRigged">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="success" @click="showRiggedDialog">
              <el-icon><Plus /></el-icon>
              添加指定中奖
            </el-button>
          </div>
          
          <el-alert 
            type="warning" 
            :closable="false" 
            style="margin-bottom: 16px;"
          >
            <template #title>
              <strong>指定中奖说明：</strong>设置后，该用户下次抽奖时将必中指定的奖项（不受概率影响）。使用后记录会标记为"已使用"。
            </template>
          </el-alert>
          
          <el-table :data="riggedList" stripe v-loading="loading.rigged" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="wallet_address" label="钱包地址" width="200">
              <template #default="{ row }">
                <span style="font-family: monospace;">{{ row.wallet_address?.slice(0, 10) }}...{{ row.wallet_address?.slice(-6) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="prize_name" label="指定奖项" width="120">
              <template #default="{ row }">
                <el-tag :type="getPrizeTagType(row.prize_name)">{{ row.prize_name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="used" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.used ? 'info' : 'success'">{{ row.used ? '已使用' : '待使用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_by" label="创建人" width="100" />
            <el-table-column prop="created_at" label="创建时间" width="160">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="used_at" label="使用时间" width="160">
              <template #default="{ row }">
                {{ row.used_at ? formatDate(row.used_at) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="deleteRigged(row.id)"
                  :disabled="row.used"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <el-pagination
            v-model:current-page="riggedPagination.page"
            v-model:page-size="riggedPagination.pageSize"
            :total="riggedPagination.total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchRigged"
            @size-change="fetchRigged"
            style="margin-top: 16px; justify-content: flex-end;"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 调整幸运值弹窗 -->
    <el-dialog v-model="adjustDialog.visible" title="调整幸运值" width="450px">
      <el-form :model="adjustDialog.form" label-width="100px">
        <el-form-item label="钱包地址" required>
          <el-input v-model="adjustDialog.form.wallet_address" placeholder="请输入钱包地址" />
        </el-form-item>
        <el-form-item label="调整数量" required>
          <el-input-number 
            v-model="adjustDialog.form.amount" 
            :min="-100000" 
            :max="100000" 
            :step="100"
            style="width: 100%"
          />
          <div class="form-tip">正数为增加，负数为扣除</div>
        </el-form-item>
        <el-form-item label="调整原因">
          <el-input v-model="adjustDialog.form.reason" placeholder="请输入调整原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="adjustDialog.loading" @click="submitAdjust">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量发放弹窗 -->
    <el-dialog v-model="batchDialog.visible" title="批量发放幸运值" width="500px">
      <el-form :model="batchDialog.form" label-width="100px">
        <el-form-item label="钱包地址" required>
          <el-input
            v-model="batchDialog.form.addresses"
            type="textarea"
            :rows="6"
            placeholder="每行输入一个钱包地址"
          />
          <div class="form-tip">共 {{ batchDialog.addressCount }} 个地址</div>
        </el-form-item>
        <el-form-item label="发放数量" required>
          <el-input-number 
            v-model="batchDialog.form.amount" 
            :min="1" 
            :max="100000" 
            :step="100"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="发放原因">
          <el-input v-model="batchDialog.form.reason" placeholder="请输入发放原因（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="batchDialog.loading" @click="submitBatch">确定发放</el-button>
      </template>
    </el-dialog>

    <!-- 添加虚拟公告弹窗 -->
    <el-dialog v-model="addAnnouncementDialog.visible" title="添加虚拟公告" width="450px">
      <el-form :model="addAnnouncementDialog.form" label-width="100px">
        <el-form-item label="钱包显示" required>
          <el-input v-model="addAnnouncementDialog.form.wallet_address" placeholder="如: 0x1234...abcd" />
        </el-form-item>
        <el-form-item label="奖项" required>
          <el-select v-model="addAnnouncementDialog.form.prize_name" style="width: 100%">
            <el-option label="特等奖" value="特等奖" />
            <el-option label="一等奖" value="一等奖" />
            <el-option label="二等奖" value="二等奖" />
            <el-option label="三等奖" value="三等奖" />
            <el-option label="四等奖" value="四等奖" />
            <el-option label="五等奖" value="五等奖" />
          </el-select>
        </el-form-item>
        <el-form-item label="奖励显示" required>
          <el-input v-model="addAnnouncementDialog.form.reward_display" placeholder="如: +50 WLD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addAnnouncementDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="addAnnouncementDialog.loading" @click="submitAddAnnouncement">添加</el-button>
      </template>
    </el-dialog>

    <!-- 添加指定中奖弹窗 -->
    <el-dialog v-model="riggedDialog.visible" title="添加指定中奖" width="500px">
      <el-alert 
        type="info" 
        :closable="false" 
        style="margin-bottom: 16px;"
      >
        设置后，该用户下次抽奖将必中指定奖项
      </el-alert>
      <el-form :model="riggedDialog.form" label-width="100px">
        <el-form-item label="钱包地址" required>
          <el-input v-model="riggedDialog.form.wallet_address" placeholder="输入完整钱包地址 0x..." />
        </el-form-item>
        <el-form-item label="指定奖项" required>
          <el-select v-model="riggedDialog.form.prize_id" style="width: 100%">
            <el-option label="特等奖 (1 BTC)" :value="1" />
            <el-option label="一等奖 (200 USDT)" :value="2" />
            <el-option label="二等奖 (100 USDT)" :value="3" />
            <el-option label="三等奖 (50 WLD)" :value="4" />
            <el-option label="四等奖 (30 WLD)" :value="5" />
            <el-option label="五等奖 (5 WLD)" :value="6" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="riggedDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="riggedDialog.loading" @click="submitRigged">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Present, User, Star, Coin, Refresh, Search, Plus, Files, Delete
} from '@element-plus/icons-vue'
import request from '@/api'

// 统计数据
const stats = ref({
  totalSpins: 0,
  todaySpins: 0,
  totalWLD: 0,
  totalUSDT: 0,
  totalBTC: 0,
  totalPointsEarned: 0,
  totalPointsSpent: 0,
  uniqueUsers: 0,
  prizeStats: []
})

// 抽奖记录
const records = ref([])
const recordFilters = reactive({
  wallet_address: '',
  wheel_type: '',
  prize_name: '',
  dateRange: null
})
const recordPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 幸运值用户
const pointUsers = ref([])
const pointFilters = reactive({
  wallet_address: '',
  min_points: ''
})
const pointPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 公告
const announcements = ref([])
const announcementFilters = reactive({
  is_virtual: ''
})
const announcementPagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
})

// 加载状态
const loading = reactive({
  records: false,
  points: false,
  announcements: false,
  rigged: false
})

// 指定中奖
const riggedList = ref([])
const riggedFilters = reactive({
  used: ''
})
const riggedPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})
const riggedDialog = reactive({
  visible: false,
  loading: false,
  form: {
    wallet_address: '',
    prize_id: 6
  }
})

// 当前标签
const activeTab = ref('records')

// 调整幸运值弹窗
const adjustDialog = reactive({
  visible: false,
  loading: false,
  form: {
    wallet_address: '',
    amount: 500,
    reason: ''
  }
})

// 批量发放弹窗
const batchDialog = reactive({
  visible: false,
  loading: false,
  form: {
    addresses: '',
    amount: 500,
    reason: ''
  }
})

// 计算地址数量
const addressCount = computed(() => {
  if (!batchDialog.form.addresses) return 0
  return batchDialog.form.addresses.split('\n').filter(a => a.trim()).length
})
batchDialog.addressCount = addressCount

// 添加公告弹窗
const addAnnouncementDialog = reactive({
  visible: false,
  loading: false,
  form: {
    wallet_address: '',
    prize_name: '五等奖',
    reward_display: '+5 WLD'
  }
})

// 工具函数
const formatNumber = (num) => {
  if (!num) return '0'
  return parseFloat(num).toLocaleString()
}

const formatWallet = (address) => {
  if (!address) return ''
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

const getWheelName = (type) => {
  const names = { silver: '白银', gold: '黄金', diamond: '钻石' }
  return names[type] || type
}

const getWheelTagType = (type) => {
  const types = { silver: 'info', gold: 'warning', diamond: 'primary' }
  return types[type] || 'info'
}

const getPrizeTagType = (name) => {
  const types = {
    '特等奖': 'danger',
    '一等奖': 'warning',
    '二等奖': 'success',
    '三等奖': 'primary',
    '四等奖': 'info',
    '五等奖': ''
  }
  return types[name] || ''
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const res = await request.get('/lucky-wheel/stats')
    if (res.success) {
      stats.value = res.data
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

// 获取抽奖记录
const fetchRecords = async () => {
  loading.records = true
  try {
    const params = {
      page: recordPagination.page,
      pageSize: recordPagination.pageSize,
      ...recordFilters
    }
    if (recordFilters.dateRange) {
      params.start_date = recordFilters.dateRange[0]
      params.end_date = recordFilters.dateRange[1]
    }
    delete params.dateRange
    
    const res = await request.get('/lucky-wheel/records', { params })
    if (res.success) {
      records.value = res.data.records
      recordPagination.total = res.data.total
    }
  } catch (error) {
    console.error('获取记录失败:', error)
  } finally {
    loading.records = false
  }
}

// 获取幸运值列表
const fetchPoints = async () => {
  loading.points = true
  try {
    const params = {
      page: pointPagination.page,
      pageSize: pointPagination.pageSize,
      ...pointFilters
    }
    
    const res = await request.get('/lucky-wheel/points', { params })
    if (res.success) {
      pointUsers.value = res.data.users
      pointPagination.total = res.data.total
    }
  } catch (error) {
    console.error('获取幸运值列表失败:', error)
  } finally {
    loading.points = false
  }
}

// 获取公告列表
const fetchAnnouncements = async () => {
  loading.announcements = true
  try {
    const params = {
      page: announcementPagination.page,
      pageSize: announcementPagination.pageSize,
      ...announcementFilters
    }
    
    const res = await request.get('/lucky-wheel/announcements', { params })
    if (res.success) {
      announcements.value = res.data.announcements
      announcementPagination.total = res.data.total
    }
  } catch (error) {
    console.error('获取公告失败:', error)
  } finally {
    loading.announcements = false
  }
}

// 显示调整弹窗
const showAdjustDialog = (row = null) => {
  if (row) {
    adjustDialog.form.wallet_address = row.wallet_address
    adjustDialog.form.amount = 500
  } else {
    adjustDialog.form.wallet_address = ''
    adjustDialog.form.amount = 500
  }
  adjustDialog.form.reason = ''
  adjustDialog.visible = true
}

// 提交调整
const submitAdjust = async () => {
  if (!adjustDialog.form.wallet_address) {
    return ElMessage.warning('请输入钱包地址')
  }
  
  adjustDialog.loading = true
  try {
    const res = await request.post('/lucky-wheel/adjust-points', adjustDialog.form)
    if (res.success) {
      ElMessage.success(res.message)
      adjustDialog.visible = false
      fetchPoints()
      fetchStats()
    } else {
      ElMessage.error(res.message || '调整失败')
    }
  } catch (error) {
    ElMessage.error('调整失败')
  } finally {
    adjustDialog.loading = false
  }
}

// 显示批量弹窗
const showBatchDialog = () => {
  batchDialog.form.addresses = ''
  batchDialog.form.amount = 500
  batchDialog.form.reason = ''
  batchDialog.visible = true
}

// 提交批量发放
const submitBatch = async () => {
  const addresses = batchDialog.form.addresses.split('\n').map(a => a.trim()).filter(a => a)
  if (addresses.length === 0) {
    return ElMessage.warning('请输入钱包地址')
  }
  
  batchDialog.loading = true
  try {
    const res = await request.post('/lucky-wheel/batch-points', {
      wallet_addresses: addresses,
      amount: batchDialog.form.amount,
      reason: batchDialog.form.reason
    })
    if (res.success) {
      ElMessage.success(res.message)
      batchDialog.visible = false
      fetchPoints()
      fetchStats()
    } else {
      ElMessage.error(res.message || '发放失败')
    }
  } catch (error) {
    ElMessage.error('发放失败')
  } finally {
    batchDialog.loading = false
  }
}

// 显示添加公告弹窗
const showAddAnnouncementDialog = () => {
  const randomWallet = '0x' + Math.random().toString(36).substring(2, 8) + '...' + Math.random().toString(36).substring(2, 6)
  addAnnouncementDialog.form.wallet_address = randomWallet
  addAnnouncementDialog.form.prize_name = '五等奖'
  addAnnouncementDialog.form.reward_display = '+5 WLD'
  addAnnouncementDialog.visible = true
}

// 提交添加公告
const submitAddAnnouncement = async () => {
  const { wallet_address, prize_name, reward_display } = addAnnouncementDialog.form
  if (!wallet_address || !prize_name || !reward_display) {
    return ElMessage.warning('请填写完整信息')
  }
  
  addAnnouncementDialog.loading = true
  try {
    const res = await request.post('/lucky-wheel/announcements', addAnnouncementDialog.form)
    if (res.success) {
      ElMessage.success('添加成功')
      addAnnouncementDialog.visible = false
      fetchAnnouncements()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (error) {
    ElMessage.error('添加失败')
  } finally {
    addAnnouncementDialog.loading = false
  }
}

// 删除公告
const deleteAnnouncement = async (id) => {
  try {
    const res = await request.delete(`/lucky-wheel/announcements/${id}`)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchAnnouncements()
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 清空虚拟公告
const clearVirtualAnnouncements = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有虚拟公告吗？', '提示', {
      type: 'warning'
    })
    const res = await request.delete('/lucky-wheel/announcements/virtual')
    if (res.success) {
      ElMessage.success(res.message)
      fetchAnnouncements()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败')
    }
  }
}

// ==================== 指定中奖 ====================

// 获取指定中奖列表
const fetchRigged = async () => {
  loading.rigged = true
  try {
    const params = {
      page: riggedPagination.page,
      pageSize: riggedPagination.pageSize,
      ...riggedFilters
    }
    
    const res = await request.get('/lucky-wheel/rigged', { params })
    if (res.success) {
      riggedList.value = res.data.rigged
      riggedPagination.total = res.data.total
    }
  } catch (error) {
    console.error('获取指定中奖列表失败:', error)
  } finally {
    loading.rigged = false
  }
}

// 显示添加指定中奖弹窗
const showRiggedDialog = () => {
  riggedDialog.form.wallet_address = ''
  riggedDialog.form.prize_id = 6
  riggedDialog.visible = true
}

// 提交指定中奖
const submitRigged = async () => {
  if (!riggedDialog.form.wallet_address) {
    ElMessage.warning('请输入钱包地址')
    return
  }
  if (!riggedDialog.form.wallet_address.startsWith('0x')) {
    ElMessage.warning('钱包地址格式不正确')
    return
  }
  
  riggedDialog.loading = true
  try {
    const res = await request.post('/lucky-wheel/rigged', riggedDialog.form)
    if (res.success) {
      ElMessage.success(res.message)
      riggedDialog.visible = false
      fetchRigged()
    } else {
      ElMessage.error(res.message || '设置失败')
    }
  } catch (error) {
    ElMessage.error('设置失败')
  } finally {
    riggedDialog.loading = false
  }
}

// 删除指定中奖
const deleteRigged = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除这条指定中奖记录吗？', '提示', {
      type: 'warning'
    })
    const res = await request.delete(`/lucky-wheel/rigged/${id}`)
    if (res.success) {
      ElMessage.success('删除成功')
      fetchRigged()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchStats()
  fetchRecords()
  fetchPoints()
  fetchAnnouncements()
  fetchRigged()
})
</script>

<style scoped>
.lucky-wheel-management {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
  border: none;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.blue { background: linear-gradient(135deg, #409eff, #79bbff); }
.stat-icon.green { background: linear-gradient(135deg, #67c23a, #95d475); }
.stat-icon.orange { background: linear-gradient(135deg, #e6a23c, #f3d19e); }
.stat-icon.purple { background: linear-gradient(135deg, #9c27b0, #ce93d8); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.prize-stats-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-card {
  min-height: 500px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.wallet-address {
  font-family: monospace;
  font-size: 13px;
}

.reward-amount {
  color: #67c23a;
  font-weight: 600;
}

.points-value {
  color: #e6a23c;
  font-weight: 600;
  font-size: 16px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 暗黑模式 */
:deep(.is-dark) .stat-card {
  background: linear-gradient(135deg, rgba(30,30,30,0.9), rgba(40,40,40,0.7));
}

:deep(.is-dark) .stat-value {
  color: #fff;
}
</style>

