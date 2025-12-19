<template>
  <div class="login-container">
    <!-- 3D 背景效果 -->
    <Background3D />
    
    <!-- 登录卡片 -->
    <div 
      class="login-card"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
      ref="cardRef"
    >
      <!-- 光晕边框层 -->
      <div class="glow-effect" :style="glowStyle"></div>
      
      <!-- 极简头部 -->
      <div class="login-header">
        <h1 class="title">Welcome back</h1>
        <p class="subtitle">登录 VituFinance 管理系统</p>
      </div>

      <!-- 内容区 -->
      <div class="card-content">
        <!-- 登录表单 -->
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <!-- 用户名 -->
          <el-form-item prop="username">
            <div class="input-label">账号</div>
            <div class="input-group">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入用户名"
                class="login-input"
              />
            </div>
          </el-form-item>
          
          <!-- 密码 -->
          <el-form-item prop="password">
            <div class="input-label">密码</div>
            <div class="input-group">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="请输入密码"
                show-password
                class="login-input"
              />
            </div>
          </el-form-item>
          
          <!-- 验证码 -->
          <el-form-item prop="captcha">
            <div class="input-label">验证码</div>
            <div class="captcha-container">
              <div class="input-group" style="flex: 1;">
                <el-input
                  v-model="loginForm.captcha"
                  placeholder="输入验证码"
                  class="login-input"
                  @keyup.enter="handleLogin"
                />
              </div>
              <div class="captcha-wrapper" @click="generateCaptcha" title="点击刷新">
                <canvas ref="captchaCanvas" width="100" height="40"></canvas>
              </div>
            </div>
          </el-form-item>
          
          <!-- 底部操作 -->
          <div class="form-footer">
            <el-button
              type="primary"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              <span v-if="!loading">登 录</span>
              <span v-else>登录中...</span>
            </el-button>
          </div>
          
          <div class="form-options">
             <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          </div>
        </el-form>
      </div>
    </div>
    
    <!-- 版本信息 -->
    <div class="version-info">
      <span>v1.0.0</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 管理系统登录页面
 */
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, TrendCharts, ArrowRight } from '@element-plus/icons-vue'
import { login } from '@/api'
import Background3D from '@/components/Background3D.vue'

const router = useRouter()

// 卡片引用和光晕效果
const cardRef = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)
const isHovering = ref(false)

const handleMouseMove = (e) => {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
  isHovering.value = true
}

const handleMouseLeave = () => {
  isHovering.value = false
}

const glowStyle = computed(() => ({
  '--mouse-x': `${mouseX.value}px`,
  '--mouse-y': `${mouseY.value}px`,
  opacity: isHovering.value ? 1 : 0
}))

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: '',
  captcha: '',
  remember: false
})

// 验证码相关
const captchaCanvas = ref(null)
const captchaCode = ref('')

// 生成验证码
const generateCaptcha = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  captchaCode.value = code
  // 确保 DOM 更新后再绘制
  setTimeout(() => drawCaptcha(code), 0)
}

// 绘制验证码
const drawCaptcha = (text) => {
  const canvas = captchaCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)
  
  // 绘制文字
  ctx.font = 'bold 24px Arial'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  
  for (let i = 0; i < text.length; i++) {
    const x = (width / 5) * (i + 1)
    const y = height / 2
    const deg = (Math.random() - 0.5) * 30 * Math.PI / 180
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(deg)
    ctx.fillStyle = '#f0f6fc'
    ctx.fillText(text[i], 0, 0)
    ctx.restore()
  }
  
  // 干扰线
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(Math.random() * width, Math.random() * height)
    ctx.lineTo(Math.random() * width, Math.random() * height)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.stroke()
  }
}

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度在 6 到 30 个字符', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value.toLowerCase() !== captchaCode.value.toLowerCase()) {
          callback(new Error('验证码错误'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  // 表单验证
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  loading.value = true
  
  try {
    const res = await login({
      username: loginForm.username,
      password: loginForm.password
    })
    
    if (res.success) {
      // 保存登录令牌
      localStorage.setItem('admin_token', res.data.token)
      // 记住用户名
      if (loginForm.remember) {
        localStorage.setItem('admin_username', loginForm.username)
      } else {
        localStorage.removeItem('admin_username')
      }
      ElMessage.success('登录成功')
      // 跳转到仪表盘
      router.push('/dashboard')
    } else {
      // API返回success为false的情况
      ElMessage.error(res.message || '登录失败')
      generateCaptcha()
    }
  } catch (error) {
    console.error('登录失败:', error)
    // 处理401错误（密码错误）
    const errorMessage = error.response?.data?.message || '登录失败，请稍后重试'
    ElMessage.error(errorMessage)
    generateCaptcha()
  } finally {
    loading.value = false
  }
}

// 保存原始主题状态
let originalTheme = null

// 初始化
onMounted(() => {
  // 保存当前主题设置
  originalTheme = localStorage.getItem('admin_theme')
  
  // 强制登录页面使用暗黑主题
  document.documentElement.classList.add('dark')
  
  // 恢复记住的用户名
  const savedUsername = localStorage.getItem('admin_username')
  if (savedUsername) {
    loginForm.username = savedUsername
    loginForm.remember = true
  }
  generateCaptcha()
})

// 组件卸载时恢复原始主题（用户登录后）
onUnmounted(() => {
  // 恢复原来的主题设置
  if (originalTheme === 'light') {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow: hidden;
}

// 登录卡片 - 极简风格
.login-card {
  width: 400px;
  background: rgba(13, 17, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08); // 基础边框
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  position: relative;
  z-index: 10;
  backdrop-filter: blur(40px);
  padding: 48px;
  display: flex;
  flex-direction: column;
  
  // 动态光晕边框
  .glow-effect {
    position: absolute;
    inset: -1px;
    border-radius: 24px;
    padding: 1.5px;
    
    background: radial-gradient(
      500px circle at var(--mouse-x) var(--mouse-y), 
      rgba(255, 255, 255, 0.4), 
      transparent 40%
    );
    
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    
    pointer-events: none;
    transition: opacity 0.5s ease;
    z-index: 20;
  }
}

// 头部
.login-header {
  margin-bottom: 40px;
  
  .title {
    font-size: 32px;
    font-weight: 700;
    color: #f0f6fc;
    margin-bottom: 8px;
    letter-spacing: -1px;
    line-height: 1.2;
  }
  
  .subtitle {
    font-size: 14px;
    color: #8b949e;
    font-weight: 400;
  }
}

// 内容区
.card-content {
  width: 100%;
}

// 表单
.login-form {
  .el-form-item {
    margin-bottom: 24px;
    display: block; // 确保label在上方
    
    .input-label {
      font-size: 12px;
      color: #8b949e;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .input-group {
      width: 100%;
      border-bottom: 1px solid #30363d;
      transition: all 0.3s;
      
      &:focus-within {
        border-color: #58a6ff;
        transform: translateY(-1px);
      }
    }
    
    .captcha-container {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .captcha-wrapper {
        width: 100px;
        height: 40px;
        border-radius: 4px;
        overflow: hidden;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.3s;
        border: 1px solid rgba(255, 255, 255, 0.1);
        
        &:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.2);
        }
        
        canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
      }
    }
  }
  
  .login-input {
    :deep(.el-input__wrapper) {
      background: transparent;
      box-shadow: none !important;
      padding: 0;
      height: 40px;
      
      &.is-focus {
        box-shadow: none !important;
      }
    }
    
    :deep(.el-input__inner) {
      color: #f0f6fc;
      font-size: 16px;
      padding-left: 0;
      height: 40px;
      background: transparent !important;
      
      &::placeholder {
        color: #484f58;
        font-size: 14px;
      }
      
      // 修复浏览器自动填充背景色问题
      &:-webkit-autofill,
      &:-webkit-autofill:hover,
      &:-webkit-autofill:focus,
      &:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px rgba(13, 17, 23, 0.95) inset !important;
        -webkit-text-fill-color: #f0f6fc !important;
        background-color: transparent !important;
        transition: background-color 5000s ease-in-out 0s;
        caret-color: #f0f6fc;
      }
    }
  }
  
  .form-footer {
    margin-top: 32px;
    margin-bottom: 24px;
    
    .login-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 12px;
      background: #f0f6fc; // 亮色按钮，形成反差
      color: #0d1117;
      border: none;
      transition: all 0.3s;
      
      &:hover {
        background: #ffffff;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
  }
  
  .form-options {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    
    .el-checkbox {
      --el-checkbox-text-color: #8b949e;
      --el-checkbox-checked-text-color: #f0f6fc;
      height: auto;
    }
  }
}

// 版本信息
.version-info {
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 12px;
  color: #484f58;
}

// 响应式
@media (max-width: 480px) {
  .login-card {
    width: calc(100% - 40px);
    margin: 0 20px;
  }
  
  .login-header {
    .title {
      font-size: 24px;
    }
  }
}
</style>
