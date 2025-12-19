<template>
  <div class="quantify-logs-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>量化日志</span>
        </div>
      </template>
      <el-table :data="logData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="wallet" label="钱包地址" />
        <el-table-column prop="action" label="操作类型" />
        <el-table-column prop="amount" label="金额" />
        <el-table-column prop="status" label="状态" />
        <el-table-column prop="created_at" label="创建时间" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const logData = ref([])

// Fetch logs on mount
onMounted(async () => {
  // TODO: Fetch logs from API
})
</script>

<style scoped>
.quantify-logs-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

