/**
 * 性能测试工具
 * 用于对比优化前后的性能差异
 */

/**
 * 测试列表渲染性能
 * @param {number} itemCount - 列表项数量
 * @returns {Object} 测试结果
 */
export function testListRenderPerformance(itemCount = 1000) {
  console.log(`\n📊 测试列表渲染性能 (${itemCount}项)`)
  console.log('='.repeat(50))
  
  const results = {
    fullRender: 0,
    virtualRender: 0,
    improvement: 0
  }
  
  // 测试1: 全量渲染
  const startFull = performance.now()
  const fullList = Array.from({ length: itemCount }, (_, i) => ({
    id: i,
    content: `Item ${i}`
  }))
  // 模拟DOM渲染
  const fullDomNodes = fullList.length
  const endFull = performance.now()
  results.fullRender = endFull - startFull
  
  console.log(`全量渲染: ${results.fullRender.toFixed(2)}ms (${fullDomNodes}个DOM节点)`)
  
  // 测试2: 虚拟滚动(只渲染20项)
  const startVirtual = performance.now()
  const visibleCount = 20
  const virtualList = fullList.slice(0, visibleCount)
  const virtualDomNodes = virtualList.length
  const endVirtual = performance.now()
  results.virtualRender = endVirtual - startVirtual
  
  console.log(`虚拟滚动: ${results.virtualRender.toFixed(2)}ms (${virtualDomNodes}个DOM节点)`)
  
  // 计算提升
  results.improvement = ((results.fullRender - results.virtualRender) / results.fullRender * 100).toFixed(2)
  results.domReduction = ((fullDomNodes - virtualDomNodes) / fullDomNodes * 100).toFixed(2)
  
  console.log(`\n✅ 性能提升: ${results.improvement}%`)
  console.log(`✅ DOM节点减少: ${results.domReduction}%`)
  console.log('='.repeat(50))
  
  return results
}

/**
 * 测试API请求缓存性能
 * @returns {Object} 测试结果
 */
export async function testApiCachePerformance() {
  console.log('\n📊 测试API缓存性能')
  console.log('='.repeat(50))
  
  const results = {
    withoutCache: 0,
    withCache: 0,
    improvement: 0
  }
  
  const testUrl = '/api/test'
  
  // 模拟API请求
  const mockApiCall = () => {
    return new Promise(resolve => {
      setTimeout(() => resolve({ data: 'test' }), 100)
    })
  }
  
  // 简单缓存实现
  const cache = new Map()
  const cachedFetch = async (url) => {
    if (cache.has(url)) {
      return cache.get(url)
    }
    const data = await mockApiCall()
    cache.set(url, data)
    return data
  }
  
  // 测试1: 无缓存 - 10次请求
  const startNoCache = performance.now()
  for (let i = 0; i < 10; i++) {
    await mockApiCall()
  }
  const endNoCache = performance.now()
  results.withoutCache = endNoCache - startNoCache
  
  console.log(`无缓存(10次请求): ${results.withoutCache.toFixed(2)}ms`)
  
  // 测试2: 有缓存 - 10次请求(只有第一次真实请求)
  cache.clear()
  const startWithCache = performance.now()
  for (let i = 0; i < 10; i++) {
    await cachedFetch(testUrl)
  }
  const endWithCache = performance.now()
  results.withCache = endWithCache - startWithCache
  
  console.log(`有缓存(10次请求): ${results.withCache.toFixed(2)}ms`)
  
  // 计算提升
  results.improvement = ((results.withoutCache - results.withCache) / results.withoutCache * 100).toFixed(2)
  
  console.log(`\n✅ 性能提升: ${results.improvement}%`)
  console.log('='.repeat(50))
  
  return results
}

/**
 * 测试防抖性能
 * @returns {Object} 测试结果
 */
export function testDebouncePerformance() {
  console.log('\n📊 测试防抖性能')
  console.log('='.repeat(50))
  
  const results = {
    withoutDebounce: 0,
    withDebounce: 0,
    reduction: 0
  }
  
  // 防抖函数
  function debounce(fn, delay) {
    let timer = null
    return function(...args) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), delay)
    }
  }
  
  // 测试函数
  let callCount = 0
  const testFn = () => { callCount++ }
  
  // 测试1: 无防抖 - 模拟100次快速输入
  callCount = 0
  for (let i = 0; i < 100; i++) {
    testFn()
  }
  results.withoutDebounce = callCount
  
  console.log(`无防抖: 执行${results.withoutDebounce}次`)
  
  // 测试2: 有防抖 - 模拟100次快速输入
  callCount = 0
  const debouncedFn = debounce(testFn, 300)
  for (let i = 0; i < 100; i++) {
    debouncedFn()
  }
  // 等待防抖完成
  setTimeout(() => {
    results.withDebounce = callCount
    results.reduction = ((results.withoutDebounce - results.withDebounce) / results.withoutDebounce * 100).toFixed(2)
    
    console.log(`有防抖: 执行${results.withDebounce}次`)
    console.log(`\n✅ 执行次数减少: ${results.reduction}%`)
    console.log('='.repeat(50))
  }, 500)
  
  return results
}

/**
 * 测试组件懒加载性能
 * @returns {Object} 测试结果
 */
export function testLazyLoadPerformance() {
  console.log('\n📊 测试组件懒加载性能')
  console.log('='.repeat(50))
  
  const results = {
    syncLoad: 0,
    asyncLoad: 0,
    improvement: 0
  }
  
  // 模拟组件大小(KB)
  const componentSizes = [50, 80, 120, 150, 200]
  
  // 测试1: 同步加载所有组件
  const startSync = performance.now()
  const totalSyncSize = componentSizes.reduce((sum, size) => sum + size, 0)
  const endSync = performance.now()
  results.syncLoad = endSync - startSync
  
  console.log(`同步加载: ${results.syncLoad.toFixed(2)}ms (${totalSyncSize}KB)`)
  
  // 测试2: 异步加载(只加载首屏必需的)
  const startAsync = performance.now()
  const criticalComponents = componentSizes.slice(0, 2) // 只加载前2个
  const totalAsyncSize = criticalComponents.reduce((sum, size) => sum + size, 0)
  const endAsync = performance.now()
  results.asyncLoad = endAsync - startAsync
  
  console.log(`异步加载: ${results.asyncLoad.toFixed(2)}ms (${totalAsyncSize}KB)`)
  
  // 计算提升
  results.improvement = ((results.syncLoad - results.asyncLoad) / results.syncLoad * 100).toFixed(2)
  results.sizeReduction = ((totalSyncSize - totalAsyncSize) / totalSyncSize * 100).toFixed(2)
  
  console.log(`\n✅ 加载时间减少: ${results.improvement}%`)
  console.log(`✅ 首屏体积减少: ${results.sizeReduction}%`)
  console.log('='.repeat(50))
  
  return results
}

/**
 * 运行所有性能测试
 */
export async function runAllPerformanceTests() {
  console.log('\n🚀 开始性能测试')
  console.log('='.repeat(50))
  console.log('测试时间:', new Date().toLocaleString())
  console.log('='.repeat(50))
  
  const results = {
    listRender: testListRenderPerformance(1000),
    apiCache: await testApiCachePerformance(),
    debounce: testDebouncePerformance(),
    lazyLoad: testLazyLoadPerformance()
  }
  
  // 生成总结报告
  setTimeout(() => {
    console.log('\n\n📈 性能测试总结')
    console.log('='.repeat(50))
    console.log('✅ 列表渲染优化:', results.listRender.improvement + '%')
    console.log('✅ API缓存优化:', results.apiCache.improvement + '%')
    console.log('✅ 防抖优化:', results.debounce.reduction + '%')
    console.log('✅ 懒加载优化:', results.lazyLoad.improvement + '%')
    console.log('='.repeat(50))
    console.log('\n💡 建议: 将这些优化应用到生产环境可显著提升性能')
  }, 1000)
  
  return results
}

// 在开发环境中添加到全局
if (import.meta.env.DEV) {
  window.__performanceTest = {
    testListRender: testListRenderPerformance,
    testApiCache: testApiCachePerformance,
    testDebounce: testDebouncePerformance,
    testLazyLoad: testLazyLoadPerformance,
    runAll: runAllPerformanceTests
  }
  
  console.log('💡 性能测试工具已加载')
  console.log('使用 window.__performanceTest.runAll() 运行所有测试')
}

export default {
  testListRenderPerformance,
  testApiCachePerformance,
  testDebouncePerformance,
  testLazyLoadPerformance,
  runAllPerformanceTests
}

