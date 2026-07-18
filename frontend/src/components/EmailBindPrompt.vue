<template>
  <el-dialog
    v-model="visible"
    :title="t('emailBind.title')"
    width="420px"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    class="email-bind-dialog"
  >
    <div class="email-bind-body">
      <p class="email-bind-desc">{{ t('emailBind.desc') }}</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item :label="t('emailBind.emailLabel')" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            autocomplete="email"
            :placeholder="t('emailBind.emailPlaceholder')"
            :disabled="submitting"
            clearable
          />
        </el-form-item>
      </el-form>
      <p class="email-bind-wallet">{{ shortenAddress(walletStore.walletAddress) }}</p>
    </div>
    <template #footer>
      <el-button type="primary" :loading="submitting" @click="submitEmail">
        {{ t('emailBind.submit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import secureApi from '@/api/secureApi'
import { useCsrfStore } from '@/stores/csrf'
import { useWalletStore } from '@/stores/wallet'

const { t } = useI18n()
const csrfStore = useCsrfStore()
const walletStore = useWalletStore()
const visible = ref(false)
const submitting = ref(false)
const checking = ref(false)
const formRef = ref(null)

const form = reactive({
  email: ''
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const rules = {
  email: [
    { required: true, message: t('emailBind.emailRequired'), trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!emailPattern.test(String(value || '').trim())) {
          callback(new Error(t('emailBind.emailInvalid')))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

const shortenAddress = (address) => {
  if (!address) return ''
  return `${address.slice(0, 10)}...${address.slice(-8)}`
}

const checkEmailStatus = async () => {
  if (!walletStore.isConnected || !walletStore.walletAddress || checking.value) {
    visible.value = false
    return
  }

  checking.value = true
  try {
    const res = await secureApi.get('/api/user/email/status', {
      wallet_address: walletStore.walletAddress
    })
    if (res.success && res.data) {
      form.email = res.data.email || ''
      visible.value = !res.data.bound
    }
  } finally {
    checking.value = false
  }
}

const submitEmail = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (!csrfStore.hasToken) {
      await csrfStore.fetchToken()
    }

    const res = await secureApi.post('/api/user/email/bind', {
      wallet_address: walletStore.walletAddress,
      email: form.email.trim()
    })

    if (res.success) {
      ElMessage.success(t('emailBind.success'))
      visible.value = false
    } else {
      ElMessage.error(res.message || t('emailBind.failed'))
    }
  } finally {
    submitting.value = false
  }
}

watch(
  () => [walletStore.isConnected, walletStore.walletAddress],
  () => {
    checkEmailStatus()
  },
  { immediate: true }
)
</script>

<style scoped>
.email-bind-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.email-bind-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.email-bind-wallet {
  color: #909399;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  margin: 0;
}
</style>
