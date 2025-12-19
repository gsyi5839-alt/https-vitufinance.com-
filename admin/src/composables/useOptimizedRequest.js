/**
 * 优化的请求Hook
 * 
 * 功能:
 * - 请求去重 (防止重复请求)
 * - 请求缓存
 * - 自动重试
 * - 请求取消
 * 
 * 创建时间: 2025-12-18
 */
import { ref, onUnmounted } from 'vue';

// 请求缓存
const requestCache = new Map();

// 进行中的请求
const pendingRequests = new Map();

/**
 * 生成请求键
 */
function generateRequestKey(url, params) {
  return `${url}:${JSON.stringify(params || {})}`;
}

/**
 * 优化的请求Hook
 * 
 * @param {Function} requestFn - 请求函数
 * @param {Object} options - 选项
 * @returns {Object} { data, loading, error, execute, cancel }
 */
export function useOptimizedRequest(requestFn, options = {}) {
  const {
    immediate = false,
    cache = false,
    cacheTTL = 300000, // 缓存时间 (5分钟)
    dedupe = true, // 请求去重
    retry = 0, // 重试次数
    retryDelay = 1000 // 重试延迟
  } = options;
  
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  let abortController = null;
  
  /**
   * 执行请求
   */
  async function execute(...args) {
    const requestKey = generateRequestKey(requestFn.name, args);
    
    // 检查缓存
    if (cache) {
      const cached = requestCache.get(requestKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        data.value = cached.data;
        return cached.data;
      }
    }
    
    // 请求去重
    if (dedupe && pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }
    
    loading.value = true;
    error.value = null;
    
    // 创建取消控制器
    abortController = new AbortController();
    
    // 执行请求
    const requestPromise = executeWithRetry(requestFn, args, retry, retryDelay);
    
    if (dedupe) {
      pendingRequests.set(requestKey, requestPromise);
    }
    
    try {
      const result = await requestPromise;
      
      data.value = result;
      
      // 缓存结果
      if (cache) {
        requestCache.set(requestKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
      
      if (dedupe) {
        pendingRequests.delete(requestKey);
      }
    }
  }
  
  /**
   * 带重试的请求执行
   */
  async function executeWithRetry(fn, args, retryCount, delay) {
    try {
      return await fn(...args);
    } catch (err) {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeWithRetry(fn, args, retryCount - 1, delay * 2);
      }
      throw err;
    }
  }
  
  /**
   * 取消请求
   */
  function cancel() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    loading.value = false;
  }
  
  // 立即执行
  if (immediate) {
    execute();
  }
  
  // 组件卸载时取消请求
  onUnmounted(() => {
    cancel();
  });
  
  return {
    data,
    loading,
    error,
    execute,
    cancel
  };
}

/**
 * 清除请求缓存
 */
export function clearRequestCache(pattern) {
  if (pattern) {
    for (const key of requestCache.keys()) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    }
  } else {
    requestCache.clear();
  }
}

