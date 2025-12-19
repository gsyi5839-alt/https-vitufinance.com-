/**
 * 虚拟列表Hook
 * 
 * 功能:
 * - 只渲染可见区域的列表项
 * - 大幅提升大列表渲染性能
 * - 支持动态高度
 * 
 * 使用场景:
 * - 用户列表
 * - 交易记录列表
 * - 日志列表
 * 
 * 创建时间: 2025-12-18
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * 虚拟列表Hook
 * 
 * @param {Object} options - 选项
 * @returns {Object} { visibleData, containerProps, wrapperProps }
 */
export function useVirtualList(options = {}) {
  const {
    list = ref([]), // 完整列表数据
    itemHeight = 50, // 每项高度
    containerHeight = 600, // 容器高度
    buffer = 5 // 缓冲区项数
  } = options;
  
  const scrollTop = ref(0);
  const containerRef = ref(null);
  
  // 计算可见范围
  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight);
    const end = Math.ceil((scrollTop.value + containerHeight) / itemHeight);
    
    return {
      start: Math.max(0, start - buffer),
      end: Math.min(list.value.length, end + buffer)
    };
  });
  
  // 可见数据
  const visibleData = computed(() => {
    const { start, end } = visibleRange.value;
    return list.value.slice(start, end).map((item, index) => ({
      ...item,
      _index: start + index
    }));
  });
  
  // 总高度
  const totalHeight = computed(() => {
    return list.value.length * itemHeight;
  });
  
  // 偏移量
  const offsetY = computed(() => {
    return visibleRange.value.start * itemHeight;
  });
  
  // 滚动处理
  function handleScroll(e) {
    scrollTop.value = e.target.scrollTop;
  }
  
  // 容器属性
  const containerProps = computed(() => ({
    ref: containerRef,
    style: {
      height: `${containerHeight}px`,
      overflow: 'auto'
    },
    onScroll: handleScroll
  }));
  
  // 包装器属性
  const wrapperProps = computed(() => ({
    style: {
      height: `${totalHeight.value}px`,
      position: 'relative'
    }
  }));
  
  // 列表项属性
  const itemProps = computed(() => ({
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: `${itemHeight}px`,
      transform: `translateY(${offsetY.value}px)`
    }
  }));
  
  return {
    visibleData,
    containerProps,
    wrapperProps,
    itemProps,
    scrollTop
  };
}

