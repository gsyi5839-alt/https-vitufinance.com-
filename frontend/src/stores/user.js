import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => user.value?.name || '游客')
  
  // 动作
  function setUser(userData) {
    user.value = userData
  }
  
  function setToken(tokenValue) {
    token.value = tokenValue
    localStorage.setItem('token', tokenValue)
  }
  
  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }
  
  return {
    user,
    token,
    isLoggedIn,
    username,
    setUser,
    setToken,
    logout
  }
})
