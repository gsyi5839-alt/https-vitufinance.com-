<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <p class="description">管理平台所有用户信息和余额</p>
    </div>
    
    <!-- 搜索区域 -->
    <div class="search-area">
      <el-form :inline="true" :model="searchForm" @submit.prevent="handleSearch">
        <el-form-item label="钱包地址">
          <el-input
            v-model="searchForm.wallet_address"
            placeholder="请输入钱包地址"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="userList"
      stripe
      border
      style="width: 100%"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      
      <el-table-column prop="wallet_address" label="钱包地址" min-width="200">
        <template #default="{ row }">
          <el-tooltip :content="row.wallet_address" placement="top">
            <span class="wallet-address" @click="copyAddress(row.wallet_address)">
              {{ shortenAddress(row.wallet_address) }}
              <el-icon><CopyDocument /></el-icon>
            </span>
          </el-tooltip>
        </template>
      </el-table-column>
      
      <el-table-column prop="is_banned" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="Number(row.is_banned) === 1"
            :content="`冻结原因：${row.ban_reason || '-'}\n冻结时间：${row.banned_at ? formatTime(row.banned_at) : '-'}\n操作员：${row.banned_by || '-'}`"
            placement="top"
          >
            <el-tag type="danger" size="small">冻结</el-tag>
          </el-tooltip>
          <el-tag v-else type="success" size="small">正常</el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="usdt_balance" label="USDT余额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.usdt_balance) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="frozen_usdt" label="冻结USDT" width="140" align="right">
        <template #default="{ row }">
          <span class="amount warning">{{ formatAmount(row.frozen_usdt) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="wld_balance" label="WLD余额" width="140" align="right">
        <template #default="{ row }">
          <span class="amount">{{ formatAmount(row.wld_balance) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="total_deposit" label="总充值" width="140" align="right">
        <template #default="{ row }">
          <span class="amount positive">{{ formatAmount(row.total_deposit) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="total_withdraw" label="总提款" width="140" align="right">
        <template #default="{ row }">
          <span class="amount negative">{{ formatAmount(row.total_withdraw) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="注册时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="470" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button type="success" link size="small" @click="handleViewBalanceDetails(row)">
            明细
          </el-button>
          <el-button type="primary" link size="small" @click="handleViewOrders(row)">
            订单
          </el-button>
          <el-button type="success" link size="small" @click="handleMarginRefund(row)">
            保证金退回
          </el-button>
          <el-button type="warning" link size="small" @click="handleDiagnose(row)">
            诊断
          </el-button>
          <el-button
            v-if="Number(row.frozen_usdt) > 0 && Number(row.is_banned) === 0"
            type="info"
            link
            size="small"
            @click="handleReleaseFrozenUsdt(row)"
          >
            释放冻结
          </el-button>
          <el-button
            v-if="Number(row.is_banned) === 1"
            type="success"
            link
            size="small"
            @click="handleUnban(row)"
          >
            解冻
          </el-button>
          <el-button
            v-else
            type="danger"
            link
            size="small"
            @click="handleBan(row)"
          >
            冻结
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
    
    <!-- 编辑余额弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑用户余额"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="钱包地址">
          <el-input v-model="editForm.wallet_address" disabled />
        </el-form-item>
        <el-form-item label="USDT余额" prop="usdt_balance">
          <el-input-number
            v-model="editForm.usdt_balance"
            :precision="4"
            :step="1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="WLD余额" prop="wld_balance">
          <el-input-number
            v-model="editForm.wld_balance"
            :precision="4"
            :step="1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="操作备注" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入操作备注（必填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitEdit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 保证金退回弹窗 -->
    <el-dialog
      v-model="marginRefundDialogVisible"
      title="保证金退回"
      width="520px"
      destroy-on-close
    >
      <el-form
        ref="marginRefundFormRef"
        :model="marginRefundForm"
        :rules="marginRefundRules"
        label-width="110px"
      >
        <el-form-item label="钱包地址">
          <el-input v-model="marginRefundForm.wallet_address" disabled />
        </el-form-item>
        <el-form-item label="当前USDT">
          <el-input :model-value="formatAmount(marginRefundForm.current_usdt_balance)" disabled>
            <template #append>USDT</template>
          </el-input>
        </el-form-item>
        <el-form-item label="退回金额" prop="amount">
          <el-input-number
            v-model="marginRefundForm.amount"
            :precision="4"
            :step="1"
            :min="0.0001"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="退回后余额">
          <el-input :model-value="marginRefundPreviewBalance" disabled>
            <template #append>USDT</template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="marginRefundDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="marginRefundSubmitting" @click="handleSubmitMarginRefund">
          确认退回
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 用户详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="用户详情"
      size="500px"
    >
      <template v-if="currentUser">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="钱包地址">
            {{ currentUser.wallet_address }}
          </el-descriptions-item>
          <el-descriptions-item label="USDT余额">
            {{ formatAmount(currentUser.usdt_balance) }}
          </el-descriptions-item>
          <el-descriptions-item label="WLD余额">
            {{ formatAmount(currentUser.wld_balance) }}
          </el-descriptions-item>
          <el-descriptions-item label="总充值">
            {{ formatAmount(currentUser.total_deposit) }}
          </el-descriptions-item>
          <el-descriptions-item label="总提款">
            {{ formatAmount(currentUser.total_withdraw) }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatTime(currentUser.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatTime(currentUser.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
    
    <!-- 余额明细抽屉 -->
    <el-drawer
      v-model="balanceDetailsDrawerVisible"
      title="💰 用户余额明细"
      size="800px"
    >
      <div v-if="balanceDetailsLoading" class="diagnose-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载...</span>
      </div>
      <template v-else-if="balanceDetailsData">
        <!-- 用户信息 -->
        <el-card class="diagnose-card">
          <template #header><span>👤 用户信息</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="钱包地址" :span="2">
              {{ balanceDetailsData.user.wallet_address }}
            </el-descriptions-item>
            <el-descriptions-item label="当前USDT余额">
              <span class="amount">{{ balanceDetailsData.user.current_usdt_balance }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="当前WLD余额">
              {{ balanceDetailsData.user.current_wld_balance }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <!-- 余额汇总 -->
        <el-card class="diagnose-card" :class="{ 'card-warning': parseFloat(balanceDetailsData.totals.balance_difference) !== 0 }">
          <template #header>
            <div class="card-header">
              <span>📊 余额汇总</span>
              <el-tag v-if="parseFloat(balanceDetailsData.totals.balance_difference) !== 0" type="danger" size="small">
                差异: {{ balanceDetailsData.totals.balance_difference }}
              </el-tag>
              <el-tag v-else type="success" size="small">数据一致</el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="总充值">
              <span class="amount positive">+{{ balanceDetailsData.totals.deposits }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="总提款">
              <span class="amount negative">-{{ balanceDetailsData.totals.withdrawals }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="机器人购买">
              <span class="amount negative">-{{ balanceDetailsData.totals.robot_purchases }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="量化收益">
              <span class="amount positive">+{{ balanceDetailsData.totals.robot_earnings }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="推荐奖励">
              <span class="amount positive">+{{ balanceDetailsData.totals.referral_rewards }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="团队奖励">
              <span class="amount positive">+{{ balanceDetailsData.totals.team_rewards }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="保证金退还">
              <span class="amount positive">+{{ balanceDetailsData.totals.margin_refunds || '0.0000' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="管理员调整">
              <span :class="parseFloat(balanceDetailsData.totals.admin_adjustments) >= 0 ? 'amount positive' : 'amount negative'">
                {{ parseFloat(balanceDetailsData.totals.admin_adjustments) >= 0 ? '+' : '' }}{{ balanceDetailsData.totals.admin_adjustments }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="计算余额">
              <span class="amount">{{ balanceDetailsData.totals.calculated_balance }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <!-- 交易记录 -->
        <el-card class="diagnose-card">
          <template #header>
            <span>📝 交易记录 ({{ balanceDetailsData.transaction_count }}条)</span>
          </template>
          <el-table :data="balanceDetailsData.transactions" max-height="400" size="small" stripe>
            <el-table-column prop="type_cn" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTransactionTypeColor(row.type)" size="small">{{ row.type_cn }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">
                <span :class="row.amount >= 0 ? 'amount positive' : 'amount negative'">
                  {{ row.amount >= 0 ? '+' : '' }}{{ row.amount.toFixed(4) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="running_balance" label="余额" width="100" align="right">
              <template #default="{ row }">
                {{ row.running_balance.toFixed(4) }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="order_no" label="订单号" width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.order_no || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </el-drawer>

    <!-- 用户订单抽屉 -->
    <el-drawer
      v-model="userOrdersDrawerVisible"
      title="用户订单"
      size="900px"
    >
      <div v-if="userOrdersLoading" class="diagnose-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载...</span>
      </div>
      <template v-else-if="userOrdersData">
        <el-card class="diagnose-card">
          <template #header><span>账户余额</span></template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="钱包地址" :span="2">
              {{ userOrdersData.userInfo.wallet_address }}
            </el-descriptions-item>
            <el-descriptions-item label="USDT余额">
              {{ formatAmount(userOrdersData.userInfo.usdt_balance) }} USDT
            </el-descriptions-item>
            <el-descriptions-item label="当前持仓保证金">
              {{ activeMarginBalance }} USDT
            </el-descriptions-item>
            <el-descriptions-item label="冻结USDT">
              {{ formatAmount(userOrdersData.userInfo.frozen_usdt) }} USDT
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="diagnose-card">
          <template #header>
            <span>订单记录 ({{ filteredUserOrders.length }}/{{ userOrdersData.robots.length }}条)</span>
          </template>
          <el-form :inline="true" class="order-filter-bar">
            <el-form-item label="订单类型">
              <el-select v-model="orderFilters.type" clearable placeholder="全部" style="width: 130px">
                <el-option label="CEX" value="cex" />
                <el-option label="DEX" value="dex" />
                <el-option label="GRID" value="grid" />
                <el-option label="HIGH" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item label="订单状态">
              <el-select v-model="orderFilters.status" clearable placeholder="全部" style="width: 130px">
                <el-option label="当前持仓" value="active" />
                <el-option label="历史到期" value="expired" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
            <el-form-item label="订单时间">
              <el-date-picker
                v-model="orderFilters.dateRange"
                type="daterange"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                value-format="YYYY-MM-DD"
                style="width: 240px"
              />
            </el-form-item>
            <el-form-item label="排序">
              <el-select v-model="orderFilters.sort" style="width: 150px">
                <el-option label="下单时间倒序" value="created_desc" />
                <el-option label="下单时间正序" value="created_asc" />
                <el-option label="金额从高到低" value="amount_desc" />
                <el-option label="金额从低到高" value="amount_asc" />
                <el-option label="到期时间倒序" value="end_desc" />
                <el-option label="到期时间正序" value="end_asc" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button @click="resetOrderFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="filteredUserOrders" max-height="430" size="small" stripe border>
            <el-table-column prop="id" label="订单ID" width="80" />
            <el-table-column prop="robot_name" label="机器人" min-width="150" show-overflow-tooltip />
            <el-table-column prop="robot_type" label="类型" width="90">
              <template #default="{ row }">
                <el-tag :type="getRobotTypeColor(row.robot_type)" size="small">
                  {{ getRobotTypeName(row.robot_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getRobotStatusColor(row.status)" size="small">
                  {{ getRobotStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="保证金" width="120" align="right">
              <template #default="{ row }">
                {{ formatAmount(row.price) }} USDT
              </template>
            </el-table-column>
            <el-table-column prop="total_profit" label="累计收益" width="120" align="right">
              <template #default="{ row }">
                <span class="amount positive">{{ formatAmount(row.total_profit) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="下单时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column prop="end_time" label="到期时间" width="160">
              <template #default="{ row }">
                {{ formatTime(row.end_time || row.end_date) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </el-drawer>
    
    <!-- 余额诊断抽屉 -->
    <el-drawer
      v-model="diagnoseDrawerVisible"
      title="余额诊断"
      size="600px"
    >
      <div v-if="diagnoseLoading" class="diagnose-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在诊断...</span>
      </div>
      <template v-else-if="diagnoseData">
        <!-- 余额概览 -->
        <el-card class="diagnose-card">
          <template #header>
            <div class="card-header">
              <span>💰 当前余额</span>
              <el-tag v-if="diagnoseData.analysis.is_mismatch" type="danger" size="small">数据异常</el-tag>
              <el-tag v-else type="success" size="small">正常</el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="USDT">{{ diagnoseData.current_balance.usdt }}</el-descriptions-item>
            <el-descriptions-item label="WLD">{{ diagnoseData.current_balance.wld }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <!-- 收入明细 -->
        <el-card class="diagnose-card">
          <template #header><span>📥 收入明细</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="充值 (completed)">
              +{{ diagnoseData.calculated.deposits.total }} ({{ diagnoseData.calculated.deposits.count }}笔)
            </el-descriptions-item>
            <el-descriptions-item label="机器人收益">
              +{{ diagnoseData.calculated.robots.profit }}
            </el-descriptions-item>
            <el-descriptions-item label="推荐奖励">
              +{{ diagnoseData.calculated.referral_reward }}
            </el-descriptions-item>
            <el-descriptions-item label="团队奖励">
              +{{ diagnoseData.calculated.team_reward }}
            </el-descriptions-item>
            <el-descriptions-item label="保证金退还">
              +{{ diagnoseData.calculated.margin_refund?.total || '0.0000' }} ({{ diagnoseData.calculated.margin_refund?.count || 0 }}笔)
            </el-descriptions-item>
            <el-descriptions-item label="手动添加">
              +{{ diagnoseData.stored_totals.manual_added }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <!-- 支出明细 -->
        <el-card class="diagnose-card">
          <template #header><span>📤 支出明细</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="提款 (completed)">
              -{{ diagnoseData.calculated.withdrawals.total }} ({{ diagnoseData.calculated.withdrawals.count }}笔)
            </el-descriptions-item>
            <el-descriptions-item label="机器人购买">
              -{{ diagnoseData.calculated.robots.cost }} ({{ diagnoseData.calculated.robots.count }}个)
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        
        <!-- 余额分析 -->
        <el-card class="diagnose-card" :class="{ 'card-warning': diagnoseData.analysis.is_mismatch }">
          <template #header><span>📊 余额分析</span></template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="预期余额">{{ diagnoseData.analysis.expected_balance }}</el-descriptions-item>
            <el-descriptions-item label="实际余额">{{ diagnoseData.analysis.actual_balance }}</el-descriptions-item>
            <el-descriptions-item label="差异">
              <span :class="{ 'text-danger': diagnoseData.analysis.is_mismatch }">
                {{ diagnoseData.analysis.difference }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="diagnoseData.analysis.has_negative_expected"
            type="warning"
            title="预期余额为负数，说明存在未记录的收入来源"
            :closable="false"
            show-icon
            style="margin-top: 10px"
          />
        </el-card>
        
        <!-- 字段不匹配提示 -->
        <el-card v-if="diagnoseData.field_mismatches.total_deposit || diagnoseData.field_mismatches.total_withdraw" class="diagnose-card card-warning">
          <template #header><span>⚠️ 字段不匹配</span></template>
          <div v-if="diagnoseData.field_mismatches.total_deposit">
            <p>total_deposit: 存储值 {{ diagnoseData.field_mismatches.total_deposit.stored }} ≠ 计算值 {{ diagnoseData.field_mismatches.total_deposit.calculated }}</p>
          </div>
          <div v-if="diagnoseData.field_mismatches.total_withdraw">
            <p>total_withdraw: 存储值 {{ diagnoseData.field_mismatches.total_withdraw.stored }} ≠ 计算值 {{ diagnoseData.field_mismatches.total_withdraw.calculated }}</p>
          </div>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * 用户管理页面
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, CopyDocument, Loading } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { getUsers, updateUserBalance, diagnoseUserBalance, getUserBalanceDetails, getUserRobots, banUser, unbanUser, releaseFrozenUsdt, refundUserMargin } from '@/api'

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 用户列表
const userList = ref([])

// 搜索表单
const searchForm = reactive({
  wallet_address: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 编辑相关
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  wallet_address: '',
  usdt_balance: 0,
  wld_balance: 0,
  remark: ''
})

const editRules = {
  usdt_balance: [{ required: true, message: '请输入USDT余额', trigger: 'blur' }],
  wld_balance: [{ required: true, message: '请输入WLD余额', trigger: 'blur' }],
  remark: [{ required: true, message: '请输入操作备注', trigger: 'blur' }]
}

// 保证金退回
const marginRefundDialogVisible = ref(false)
const marginRefundSubmitting = ref(false)
const marginRefundFormRef = ref(null)
const marginRefundForm = reactive({
  wallet_address: '',
  current_usdt_balance: 0,
  amount: null,
  reason: ''
})

const marginRefundPreviewBalance = computed(() => {
  const current = parseFloat(marginRefundForm.current_usdt_balance || 0)
  const amount = parseFloat(marginRefundForm.amount || 0)
  return (current + (Number.isFinite(amount) ? amount : 0)).toFixed(4)
})

const validateMarginRefundAmount = (_rule, value, callback) => {
  const amount = parseFloat(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    callback(new Error('退回金额必须大于 0'))
    return
  }
  callback()
}

const marginRefundRules = {
  amount: [
    { required: true, message: '请输入退回金额', trigger: 'blur' },
    { validator: validateMarginRefundAmount, trigger: 'blur' }
  ],
  reason: []
}

// 详情相关
const detailDrawerVisible = ref(false)
const currentUser = ref(null)

// 诊断相关
const diagnoseDrawerVisible = ref(false)
const diagnoseLoading = ref(false)
const diagnoseData = ref(null)

// 余额明细相关
const balanceDetailsDrawerVisible = ref(false)
const balanceDetailsLoading = ref(false)
const balanceDetailsData = ref(null)

// 用户订单相关
const userOrdersDrawerVisible = ref(false)
const userOrdersLoading = ref(false)
const userOrdersData = ref(null)
const orderFilters = reactive({
  type: '',
  status: '',
  dateRange: [],
  sort: 'created_desc'
})

const filteredUserOrders = computed(() => {
  let orders = [...(userOrdersData.value?.robots || [])]

  if (orderFilters.type) {
    orders = orders.filter(order => String(order.robot_type || '').toLowerCase() === orderFilters.type)
  }

  if (orderFilters.status) {
    orders = orders.filter(order => String(order.status || '').toLowerCase() === orderFilters.status)
  }

  if (orderFilters.dateRange?.length === 2) {
    const start = dayjs(orderFilters.dateRange[0]).startOf('day')
    const end = dayjs(orderFilters.dateRange[1]).endOf('day')
    orders = orders.filter(order => {
      const orderTime = dayjs(order.created_at || order.start_time || order.start_date)
      return orderTime.isValid() && !orderTime.isBefore(start) && !orderTime.isAfter(end)
    })
  }

  return orders.sort((a, b) => {
    if (orderFilters.sort === 'created_asc') return compareOrderDate(a, b, 'created_at')
    if (orderFilters.sort === 'amount_desc') return compareOrderAmount(b, a)
    if (orderFilters.sort === 'amount_asc') return compareOrderAmount(a, b)
    if (orderFilters.sort === 'end_desc') return compareOrderDate(b, a, 'end_time')
    if (orderFilters.sort === 'end_asc') return compareOrderDate(a, b, 'end_time')
    return compareOrderDate(b, a, 'created_at')
  })
})

const activeMarginBalance = computed(() => {
  return (userOrdersData.value?.robots || [])
    .filter(order => String(order.status || '').toLowerCase() === 'active')
    .reduce((sum, order) => sum + parseFloat(order.price || 0), 0)
    .toFixed(4)
})

/**
 * 获取用户列表
 */
const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await getUsers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      wallet_address: searchForm.wallet_address || undefined
    })
    
    if (res.success) {
      userList.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 冻结用户（封禁）
 * 后端接口：POST /api/admin/users/:wallet_address/ban
 * 必填：reason
 */
const handleBan = async (row) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `确定要冻结该用户吗？\n钱包地址：${shortenAddress(row.wallet_address)}`,
      '确认冻结',
      {
        confirmButtonText: '冻结',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入冻结原因（必填）',
        inputType: 'textarea',
        inputValidator: (val) => {
          if (!val || !String(val).trim()) return '冻结原因不能为空'
          if (String(val).trim().length < 3) return '原因太短（至少 3 个字符）'
          return true
        },
        type: 'warning'
      }
    )

    const res = await banUser(row.wallet_address, { reason: String(reason).trim() })
    if (res.success) {
      ElMessage.success('已冻结用户')
      fetchUsers()
    } else {
      ElMessage.error(res.message || '冻结失败')
    }
  } catch (e) {
    // user cancelled or error
  }
}

/**
 * 解冻用户（解封）
 * 后端接口：POST /api/admin/users/:wallet_address/unban
 */
const handleUnban = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要解冻该用户吗？\n钱包地址：${shortenAddress(row.wallet_address)}`,
      '确认解冻',
      { type: 'warning', confirmButtonText: '解冻', cancelButtonText: '取消' }
    )

    const res = await unbanUser(row.wallet_address)
    if (res.success) {
      ElMessage.success('已解冻用户')
      fetchUsers()
    } else {
      ElMessage.error(res.message || '解冻失败')
    }
  } catch (e) {
    // cancelled
  }
}

/**
 * Release frozen USDT to available USDT (manual admin action).
 * Backend: POST /api/admin/users/:wallet_address/release-frozen
 */
const handleReleaseFrozenUsdt = async (row) => {
  try {
    if (!row?.wallet_address) return

    const frozen = parseFloat(row.frozen_usdt || 0)
    if (!isFinite(frozen) || frozen <= 0) {
      ElMessage.warning('冻结USDT余额为 0，无需释放')
      return
    }

    const { value } = await ElMessageBox.prompt(
      `请输入要释放的金额（留空=全部释放）\n钱包地址：${shortenAddress(row.wallet_address)}\n当前冻结：${formatAmount(row.frozen_usdt)} USDT`,
      '释放冻结余额',
      {
        confirmButtonText: '释放',
        cancelButtonText: '取消',
        inputPlaceholder: '留空则全部释放',
        inputValue: '',
        inputValidator: (val) => {
          const str = String(val ?? '').trim()
          if (!str) return true // empty => release all
          const num = parseFloat(str)
          if (!isFinite(num) || num <= 0) return '释放金额不合法'
          if (num > frozen) return `释放金额超过冻结余额（冻结：${frozen.toFixed(4)}）`
          return true
        },
        type: 'warning'
      }
    )

    const amountStr = String(value ?? '').trim()
    const payload = amountStr ? { amount: parseFloat(amountStr) } : {}

    const res = await releaseFrozenUsdt(row.wallet_address, payload)
    if (res?.success) {
      ElMessage.success(`已释放冻结余额：${res.data?.released || (amountStr || frozen.toFixed(4))} USDT`)
      fetchUsers()
    } else {
      ElMessage.error(res?.message || '释放失败')
    }
  } catch (e) {
    // cancelled
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

/**
 * 重置
 */
const handleReset = () => {
  searchForm.wallet_address = ''
  pagination.page = 1
  fetchUsers()
}

/**
 * 分页大小变化
 */
const handleSizeChange = () => {
  pagination.page = 1
  fetchUsers()
}

/**
 * 页码变化
 */
const handlePageChange = () => {
  fetchUsers()
}

/**
 * 编辑用户
 */
const handleEdit = (row) => {
  editForm.wallet_address = row.wallet_address
  editForm.usdt_balance = parseFloat(row.usdt_balance)
  editForm.wld_balance = parseFloat(row.wld_balance)
  editForm.remark = ''
  editDialogVisible.value = true
}

/**
 * 提交编辑
 */
const handleSubmitEdit = async () => {
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  try {
    const res = await updateUserBalance(editForm.wallet_address, {
      usdt_balance: editForm.usdt_balance,
      wld_balance: editForm.wld_balance,
      remark: editForm.remark
    })
    
    if (res.success) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      fetchUsers()
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (error) {
    console.error('更新用户余额失败:', error)
  } finally {
    submitting.value = false
  }
}

/**
 * 打开保证金退回弹窗
 */
const handleMarginRefund = (row) => {
  marginRefundForm.wallet_address = row.wallet_address
  marginRefundForm.current_usdt_balance = parseFloat(row.usdt_balance || 0)
  marginRefundForm.amount = null
  marginRefundForm.reason = ''
  marginRefundDialogVisible.value = true
}

/**
 * 提交保证金退回
 */
const handleSubmitMarginRefund = async () => {
  const valid = await marginRefundFormRef.value.validate().catch(() => false)
  if (!valid) return

  const amount = parseFloat(marginRefundForm.amount)
  try {
    await ElMessageBox.confirm(
      `确认给该用户退回 ${amount.toFixed(4)} USDT 保证金吗？\n钱包地址：${shortenAddress(marginRefundForm.wallet_address)}\n退回后余额：${marginRefundPreviewBalance.value} USDT`,
      '确认保证金退回',
      { type: 'warning', confirmButtonText: '确认退回', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  marginRefundSubmitting.value = true
  try {
    const res = await refundUserMargin(marginRefundForm.wallet_address, {
      amount: amount.toFixed(4),
      reason: marginRefundForm.reason.trim() || 'Manual margin refund'
    })

    if (res.success) {
      ElMessage.success(`保证金退回成功，订单号：${res.data?.order_no || '-'}`)
      marginRefundDialogVisible.value = false
      await fetchUsers()
      if (
        balanceDetailsDrawerVisible.value &&
        String(balanceDetailsData.value?.user?.wallet_address || '').toLowerCase() === String(marginRefundForm.wallet_address || '').toLowerCase()
      ) {
        await handleViewBalanceDetails({ wallet_address: marginRefundForm.wallet_address })
      }
    } else {
      ElMessage.error(res.message || '保证金退回失败')
    }
  } catch (error) {
    console.error('保证金退回失败:', error)
  } finally {
    marginRefundSubmitting.value = false
  }
}

/**
 * 查看详情
 */
const handleViewDetail = (row) => {
  currentUser.value = row
  detailDrawerVisible.value = true
}

/**
 * 诊断用户余额
 */
const handleDiagnose = async (row) => {
  diagnoseDrawerVisible.value = true
  diagnoseLoading.value = true
  diagnoseData.value = null
  
  try {
    const res = await diagnoseUserBalance(row.wallet_address)
    if (res.success) {
      diagnoseData.value = res.data
    } else {
      ElMessage.error(res.message || '诊断失败')
    }
  } catch (error) {
    console.error('诊断用户余额失败:', error)
    ElMessage.error('诊断失败')
  } finally {
    diagnoseLoading.value = false
  }
}

/**
 * 查看用户余额明细
 */
const handleViewBalanceDetails = async (row) => {
  balanceDetailsDrawerVisible.value = true
  balanceDetailsLoading.value = true
  balanceDetailsData.value = null
  
  try {
    const res = await getUserBalanceDetails(row.wallet_address)
    if (res.success) {
      balanceDetailsData.value = res.data
    } else {
      ElMessage.error(res.message || '获取明细失败')
    }
  } catch (error) {
    console.error('获取用户余额明细失败:', error)
    ElMessage.error('获取明细失败')
  } finally {
    balanceDetailsLoading.value = false
  }
}

const resetOrderFilters = () => {
  orderFilters.type = ''
  orderFilters.status = ''
  orderFilters.dateRange = []
  orderFilters.sort = 'created_desc'
}

const handleViewOrders = async (row) => {
  userOrdersDrawerVisible.value = true
  userOrdersLoading.value = true
  userOrdersData.value = null
  resetOrderFilters()

  try {
    const res = await getUserRobots(row.wallet_address)
    if (res.success) {
      userOrdersData.value = res.data
    } else {
      ElMessage.error(res.message || '获取订单失败')
    }
  } catch (error) {
    console.error('获取用户订单失败:', error)
    ElMessage.error('获取订单失败')
  } finally {
    userOrdersLoading.value = false
  }
}

/**
 * 获取交易类型的颜色
 */
const getTransactionTypeColor = (type) => {
  const colors = {
    deposit: 'success',
    withdraw: 'danger',
    robot_purchase: 'warning',
    robot_earning: 'success',
    referral_reward: 'primary',
    team_reward: 'primary',
    margin_refund: 'success',
    admin_adjustment: 'info'
  }
  return colors[type] || 'info'
}

const getRobotTypeName = (type) => {
  const names = {
    cex: 'CEX',
    dex: 'DEX',
    grid: 'GRID',
    high: 'HIGH'
  }
  return names[String(type || '').toLowerCase()] || type || '-'
}

const getRobotTypeColor = (type) => {
  const colors = {
    cex: 'primary',
    dex: 'success',
    grid: 'warning',
    high: 'danger'
  }
  return colors[String(type || '').toLowerCase()] || 'info'
}

const getRobotStatusText = (status) => {
  const texts = {
    active: '当前持仓',
    expired: '历史到期',
    cancelled: '已取消'
  }
  return texts[String(status || '').toLowerCase()] || status || '-'
}

const getRobotStatusColor = (status) => {
  const colors = {
    active: 'success',
    expired: 'info',
    cancelled: 'danger'
  }
  return colors[String(status || '').toLowerCase()] || 'info'
}

const getOrderDate = (order, field) => {
  const value = field === 'end_time'
    ? order.end_time || order.end_date
    : order.created_at || order.start_time || order.start_date
  const timestamp = dayjs(value).valueOf()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const compareOrderDate = (a, b, field) => getOrderDate(a, field) - getOrderDate(b, field)
const compareOrderAmount = (a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0)

/**
 * 复制地址
 */
const copyAddress = (address) => {
  navigator.clipboard.writeText(address)
  ElMessage.success('地址已复制')
}

/**
 * 缩短地址
 */
const shortenAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

/**
 * 格式化金额
 */
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(4)
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

// 初始化
onMounted(() => {
  fetchUsers()
})
</script>

<style lang="scss" scoped>
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    color: #409EFF;
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.amount {
  font-weight: 600;
  
  &.positive {
    color: #67C23A;
  }
  
  &.negative {
    color: #F56C6C;
  }
}

// Diagnose styles
.diagnose-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
  
  .el-icon {
    font-size: 32px;
    margin-bottom: 10px;
  }
}

.diagnose-card {
  margin-bottom: 16px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  &.card-warning {
    border-color: #E6A23C;
    
    :deep(.el-card__header) {
      background-color: #fdf6ec;
    }
  }
}

.text-danger {
  color: #F56C6C;
  font-weight: 600;
}
</style>
