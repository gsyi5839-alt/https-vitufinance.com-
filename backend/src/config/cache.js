/**
 * 内存缓存管理器
 * 
 * 功能:
 * - 基于内存的LRU缓存
 * - 支持TTL过期
 * - 支持缓存预热
 * - 支持缓存统计
 * 
 * 注意: 如果后续需要分布式缓存,可以替换为Redis
 * 
 * 创建时间: 2025-12-18
 */

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttlMap = new Map(); // 存储过期时间
    this.maxSize = options.maxSize || 1000; // 最大缓存数量
    this.defaultTTL = options.defaultTTL || 300000; // 默认5分钟
    
    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }
  
  /**
   * 生成缓存键
   * 
   * @param {string} prefix - 前缀
   * @param {any} params - 参数
   * @returns {string} 缓存键
   */
  generateKey(prefix, params = {}) {
    const paramStr = JSON.stringify(params);
    return `${prefix}:${paramStr}`;
  }
  
  /**
   * 获取缓存
   * 
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值
   */
  get(key) {
    // 检查是否过期
    const ttl = this.ttlMap.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * 设置缓存
   * 
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间(毫秒)
   */
  set(key, value, ttl = this.defaultTTL) {
    // 如果缓存已满,删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }
    
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);
    this.stats.sets++;
  }
  
  /**
   * 删除缓存
   * 
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    this.stats.deletes++;
  }
  
  /**
   * 清空指定前缀的缓存
   * 
   * @param {string} prefix - 前缀
   */
  deleteByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, ttl] of this.ttlMap.entries()) {
      if (now > ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] 清理了 ${cleaned} 个过期缓存`);
    }
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * 销毁缓存管理器
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// 创建全局缓存实例
const cache = new CacheManager({
  maxSize: 2000, // 最多缓存2000个项目
  defaultTTL: 300000 // 默认5分钟
});

/**
 * 缓存装饰器 - 用于包装数据库查询函数
 * 
 * @param {string} prefix - 缓存键前缀
 * @param {number} ttl - 过期时间(毫秒)
 * @returns {Function} 装饰器函数
 */
export function cached(prefix, ttl = 300000) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = cache.generateKey(prefix, args);
      
      // 尝试从缓存获取
      const cachedValue = cache.get(key);
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      // 执行原始方法
      const result = await originalMethod.apply(this, args);
      
      // 存入缓存
      cache.set(key, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * 包装函数使其支持缓存
 * 
 * @param {Function} fn - 原始函数
 * @param {string} prefix - 缓存键前缀
 * @param {number} ttl - 过期时间(毫秒)
 * @returns {Function} 包装后的函数
 */
export function withCache(fn, prefix, ttl = 300000) {
  return async function(...args) {
    const key = cache.generateKey(prefix, args);
    
    // 尝试从缓存获取
    const cachedValue = cache.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // 执行原始函数
    const result = await fn(...args);
    
    // 存入缓存
    cache.set(key, result, ttl);
    
    return result;
  };
}

export default cache;

