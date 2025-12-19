<template>
  <div class="crypto-chart" :style="{ width: width + 'px', height: height + 'px' }">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
      <defs>
        <linearGradient :id="'gradient-' + uniqueId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.5" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        :d="areaPath"
        :fill="`url(#gradient-${uniqueId})`"
        stroke="none"
      />
      <path
        :d="linePath"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps({
  width: {
    type: Number,
    default: 130
  },
  height: {
    type: Number,
    default: 50
  },
  color: {
    type: String,
    default: '#22c55e' // 默认绿色
  },
  isPositive: {
    type: Boolean,
    default: true
  },
  data: {
    type: Array,
    default: () => []
  }
})

const uniqueId = Math.random().toString(36).substr(2, 9)
const dataPoints = ref([])

// 生成模拟数据
const generateData = () => {
  const points = []
  const count = 20
  let y = 50
  
  for (let i = 0; i < count; i++) {
    // 根据涨跌趋势调整随机波动
    const trend = props.isPositive ? -2 : 2 // 这里的坐标系y向下是正，所以涨是y减小
    const random = (Math.random() - 0.5) * 15
    y = y + trend + random
    
    // 限制在 10% 到 90% 高度之间，防止溢出
    y = Math.max(5, Math.min(95, y))
    points.push(y)
  }
  
  // 确保最后一个点符合涨跌趋势
  if (props.isPositive) {
    points[points.length - 1] = Math.min(points[0], points[points.length - 1])
  } else {
    points[points.length - 1] = Math.max(points[0], points[points.length - 1])
  }
  
  return points
}

onMounted(() => {
  if (props.data && props.data.length > 0) {
    dataPoints.value = props.data
  } else {
    dataPoints.value = generateData()
  }
})

watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    dataPoints.value = newData
  }
}, { deep: true })


const linePath = computed(() => {
  if (dataPoints.value.length === 0) return ''
  
  // 找到最大最小值以进行归一化
  const min = Math.min(...dataPoints.value)
  const max = Math.max(...dataPoints.value)
  const range = max - min || 1
  
  // 留出一点边距，防止线条贴边
  const padding = 5
  const availableHeight = props.height - (padding * 2)
  
  const stepX = props.width / (dataPoints.value.length - 1)
  
  // 辅助函数：将数据值映射到 Y 坐标
  const getY = (val) => {
    // Y轴翻转：值越大，Y坐标越小（上方）
    // 归一化：(val - min) / range -> 0~1
    // 映射到高度：availableHeight * (1 - normalized) + padding
    return availableHeight * (1 - (val - min) / range) + padding
  }
  
  let d = `M 0 ${getY(dataPoints.value[0])}`
  
  for (let i = 1; i < dataPoints.value.length; i++) {
    const x = i * stepX
    const y = getY(dataPoints.value[i])
    
    // 使用简单的贝塞尔曲线让线条更平滑
    const prevX = (i - 1) * stepX
    const prevY = getY(dataPoints.value[i - 1])
    const cp1x = prevX + stepX / 2
    const cp1y = prevY
    const cp2x = x - stepX / 2
    const cp2y = y
    
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`
  }
  
  return d
})

const areaPath = computed(() => {
  if (!linePath.value) return ''
  return `${linePath.value} L ${props.width} ${props.height} L 0 ${props.height} Z`
})
</script>

<style scoped>
.crypto-chart {
  position: relative;
  overflow: hidden;
}
</style>
