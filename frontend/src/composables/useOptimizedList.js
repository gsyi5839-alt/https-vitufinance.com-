/**
 * 优化列表渲染 Composable
 * 
 * 功能:
 * - 虚拟滚动(只渲染可见项)
 * - 分页加载
 * - 防抖搜索
 * - 性能优化
 */

import { ref, computed, watch } from 'vue'

/**
 * 使用优化列表
 * @param {Array} sourceList - 源数据列表
 * @param {Object} options - 配置选项
 * @returns {Object} 列表管理对象
 */
export function useOptimizedList(sourceList, options = {}) {
  const {
    pageSize = 20, // 每页显示数量
    initialPage = 1, // 初始页码
    enableVirtualScroll = false, // 是否启用虚拟滚动
    itemHeight = 100 // 虚拟滚动项高度
  } = options
  
  // ==================== 状态 ====================
  const currentPage = ref(initialPage)
  const isLoading = ref(false)
  const hasMore = computed(() => {
    return currentPage.value * pageSize < sourceList.value.length
  })
  
  // ==================== 分页列表 ====================
  
  /**
   * 当前页显示的数据
   */
  const displayList = computed(() => {
    const start = 0
    const end = currentPage.value * pageSize
    return sourceList.value.slice(start, end)
  })
  
  /**
   * 加载更多数据
   */
  const loadMore = () => {
    if (isLoading.value || !hasMore.value) return
    
    isLoading.value = true
    
    // 模拟加载延迟
    setTimeout(() => {
      currentPage.value++
      isLoading.value = false
    }, 300)
  }
  
  /**
   * 重置列表
   */
  const reset = () => {
    currentPage.value = initialPage
  }
  
  // ==================== 虚拟滚动 ====================
  
  const scrollTop = ref(0)
  const containerHeight = ref(600)
  
  /**
   * 虚拟滚动 - 可见项范围
   */
  const visibleRange = computed(() => {
    if (!enableVirtualScroll) {
      return { start: 0, end: sourceList.value.length }
    }
    
    const start = Math.floor(scrollTop.value / itemHeight)
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)
    const end = start + visibleCount + 5 // 多渲染5项作为缓冲
    
    return {
      start: Math.max(0, start - 5), // 上方缓冲5项
      end: Math.min(sourceList.value.length, end)
    }
  })
  
  /**
   * 虚拟滚动 - 可见项列表
   */
  const virtualList = computed(() => {
    if (!enableVirtualScroll) {
      return sourceList.value
    }
    
    const { start, end } = visibleRange.value
    return sourceList.value.slice(start, end).map((item, index) => ({
      ...item,
      _index: start + index,
      _offsetTop: (start + index) * itemHeight
    }))
  })
  
  /**
   * 虚拟滚动 - 总高度
   */
  const totalHeight = computed(() => {
    return sourceList.value.length * itemHeight
  })
  
  /**
   * 处理滚动事件
   */
  const handleScroll = (event) => {
    scrollTop.value = event.target.scrollTop
  }
  
  /**
   * 设置容器高度
   */
  const setContainerHeight = (height) => {
    containerHeight.value = height
  }
  
  // ==================== 监听源数据变化 ====================
  watch(() => sourceList.value.length, () => {
    // 数据变化时重置到第一页
    if (currentPage.value > 1) {
      reset()
    }
  })
  
  // ==================== 返回 ====================
  return {
    // 分页相关
    displayList,
    currentPage,
    isLoading,
    hasMore,
    loadMore,
    reset,
    
    // 虚拟滚动相关
    virtualList,
    totalHeight,
    visibleRange,
    handleScroll,
    setContainerHeight
  }
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  
  return function(...args) {
    if (timer) clearTimeout(timer)
    
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let lastTime = 0
  
  return function(...args) {
    const now = Date.now()
    
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}

/**
 * 使用防抖搜索
 * @param {Function} searchFn - 搜索函数
 * @param {number} delay - 防抖延迟
 * @returns {Object} 搜索管理对象
 */
export function useDebouncedSearch(searchFn, delay = 500) {
  const searchQuery = ref('')
  const isSearching = ref(false)
  const searchResults = ref([])
  
  // 创建防抖搜索函数
  const debouncedSearch = debounce(async (query) => {
    if (!query.trim()) {
      searchResults.value = []
      isSearching.value = false
      return
    }
    
    isSearching.value = true
    
    try {
      const results = await searchFn(query)
      searchResults.value = results
    } catch (error) {
      console.error('[Search] 搜索失败:', error)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, delay)
  
  // 监听搜索词变化
  watch(searchQuery, (newQuery) => {
    debouncedSearch(newQuery)
  })
  
  return {
    searchQuery,
    isSearching,
    searchResults
  }
}

