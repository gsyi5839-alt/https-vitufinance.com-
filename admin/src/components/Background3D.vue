<template>
  <!-- 低性能设备显示简单背景 -->
  <div 
    v-if="!shouldRender3D" 
    class="fallback-container" 
    :class="{ 'is-dark': isDark }"
  >
    <div class="gradient-bg"></div>
    <div class="particles-static">
      <div v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)"></div>
    </div>
  </div>
  
  <!-- 高性能设备显示3D背景 -->
  <div 
    v-else 
    ref="container" 
    class="three-container" 
    :style="containerStyle"
  ></div>
</template>

<script setup>
/**
 * 3D背景组件 - 带Safari/iOS降级模式
 * 在低性能设备上自动切换为静态CSS背景
 */
import * as THREE from 'three'
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { 
  shouldUse3DEffects, 
  getOptimalPixelRatio,
  getOptimalParticleCount,
  isLowPerformanceDevice
} from '@/utils/deviceDetect'

const themeStore = useThemeStore()
const container = ref(null)

// 检测是否应该渲染3D效果
const shouldRender3D = ref(shouldUse3DEffects())

// 主题状态
const isDark = computed(() => themeStore.theme === 'dark')

// 容器样式（3D模式）
const containerStyle = computed(() => {
  return {
    background: isDark.value 
      ? 'radial-gradient(circle at center, #1b2735 0%, #090a0f 100%)' 
      : 'radial-gradient(circle at center, #e6f7ff 0%, #f0f2f5 100%)'
  }
})

/**
 * 生成静态粒子样式（降级模式用）
 */
const getParticleStyle = (index) => {
  const seed = index * 137.508
  return {
    left: `${(seed % 100)}%`,
    top: `${((seed * 1.618) % 100)}%`,
    animationDelay: `${(index * 0.3)}s`,
    opacity: 0.3 + (index % 5) * 0.1
  }
}

let scene, camera, renderer
let waveParticles, rainParticles, explosionParticles
let count = 0
let mouseX = 0
let mouseY = 0
let windowHalfX = window.innerWidth / 2
let windowHalfY = window.innerHeight / 2
let animationFrameId = null
let isAnimating = false

// 粒子系统参数 - 根据设备性能调整
const isLowPerf = isLowPerformanceDevice()
const WAVE_COUNT_X = isLowPerf ? 25 : 50
const WAVE_COUNT_Y = isLowPerf ? 25 : 50
const RAIN_COUNT = getOptimalParticleCount(200)
const EXPLOSION_COUNT = getOptimalParticleCount(200)
const EXPLOSION_POOL_SIZE = isLowPerf ? 30 : 100

// 爆炸对象池
const explosions = []

// 监听主题变化，更新场景背景和粒子颜色
watch(() => themeStore.theme, (newTheme) => {
  updateThemeColors(newTheme)
})

const updateThemeColors = (theme) => {
  if (!scene || !waveParticles || !rainParticles) return
  
  const isDark = theme === 'dark'
  
  // 更新背景雾
  scene.fog.color.setHex(isDark ? 0x050505 : 0xf0f2f5)
  scene.fog.density = 0.002
  
  // 更新波浪颜色
  waveParticles.material.color.setHex(isDark ? 0x409EFF : 0x1890ff)
  waveParticles.material.opacity = isDark ? 0.8 : 0.6
  
  // 更新雨滴颜色
  rainParticles.material.color.setHex(isDark ? 0xA6C8FF : 0x409EFF)
  
  // 更新爆炸粒子基础颜色(在触发时也会动态设置，这里设置默认)
  explosionParticles.material.opacity = 1
}

const init = () => {
  // 如果不应该渲染3D，直接返回
  if (!shouldRender3D.value || !container.value) {
    console.log('[Background3D] 使用降级模式（CSS背景）')
    return
  }
  
  console.log('[Background3D] 初始化3D背景')
  const isDarkTheme = themeStore.theme === 'dark'
  
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(isDarkTheme ? 0x050505 : 0xf0f2f5, 0.002)

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000)
  camera.position.z = 1000
  camera.position.y = 200

  // 性能优化：禁用抗锯齿、限制像素比
  renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: !isLowPerf, // 低性能设备禁用抗锯齿
    powerPreference: 'low-power' // 优先使用集成显卡，减少功耗
  })
  
  // 使用优化后的像素比
  renderer.setPixelRatio(getOptimalPixelRatio())
  renderer.setSize(window.innerWidth, window.innerHeight)
  container.value.appendChild(renderer.domElement)

  // 1. 初始化波浪粒子
  initWave()
  
  // 2. 初始化雨滴粒子
  initRain()
  
  // 3. 初始化爆炸粒子池
  initExplosions()
  
  // 初始设置颜色
  updateThemeColors(themeStore.theme)

  document.addEventListener('mousemove', onDocumentMouseMove)
  window.addEventListener('resize', onWindowResize)
}

const initWave = () => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(WAVE_COUNT_X * WAVE_COUNT_Y * 3)
  
  let i = 0
  for (let ix = 0; ix < WAVE_COUNT_X; ix++) {
    for (let iy = 0; iy < WAVE_COUNT_Y; iy++) {
      positions[i] = ix * 80 - 2000
      positions[i + 1] = 0
      positions[i + 2] = iy * 80 - 2000
      i += 3
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: 0x409EFF,
    size: 4,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
  
  waveParticles = new THREE.Points(geometry, material)
  scene.add(waveParticles)
}

const initRain = () => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(RAIN_COUNT * 3)
  const velocities = new Float32Array(RAIN_COUNT) // 下落速度
  
  for (let i = 0; i < RAIN_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 4000 // x
    positions[i * 3 + 1] = Math.random() * 2000 + 500 // y (起始高度)
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4000 // z
    velocities[i] = Math.random() * 10 + 20 // 速度 20-30
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1))
  
  const material = new THREE.PointsMaterial({
    color: 0xA6C8FF, // 浅蓝色雨滴
    size: 3,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  })
  
  rainParticles = new THREE.Points(geometry, material)
  scene.add(rainParticles)
}

const initExplosions = () => {
  const geometry = new THREE.BufferGeometry()
  const particleCount = EXPLOSION_COUNT * EXPLOSION_POOL_SIZE
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  
  // 初始隐藏所有爆炸粒子，并设置默认颜色为白色
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3 + 1] = -10000 
    colors[i * 3] = 1.0
    colors[i * 3 + 1] = 1.0
    colors[i * 3 + 2] = 1.0
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  const material = new THREE.PointsMaterial({
    size: 4, // 增大爆炸粒子尺寸
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending
  })
  
  explosionParticles = new THREE.Points(geometry, material)
  scene.add(explosionParticles)
  
  // 初始化爆炸对象池逻辑
  for (let i = 0; i < EXPLOSION_POOL_SIZE; i++) {
    explosions.push({
      active: false,
      startIndex: i * EXPLOSION_COUNT,
      age: 0,
      positions: [], // 本地存储相对位置
      velocities: []
    })
  }
}

const triggerExplosion = (x, y, z) => {
  // 找一个空闲的爆炸对象
  const explosion = explosions.find(e => !e.active)
  if (!explosion) return

  explosion.active = true
  explosion.age = 0
  
  const positions = explosionParticles.geometry.attributes.position.array
  const colors = explosionParticles.geometry.attributes.color.array
  
  for (let i = 0; i < EXPLOSION_COUNT; i++) {
    const index = explosion.startIndex + i
    
    // 重置位置到碰撞点
    positions[index * 3] = x
    positions[index * 3 + 1] = y // 使用精确的碰撞高度
    positions[index * 3 + 2] = z
    
    // 随机向上的溅射速度，增大扩散范围
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 8 + 4 
    const vy = Math.random() * 12 + 8 
    
    explosion.velocities[i] = {
      x: Math.cos(angle) * speed,
      y: vy,
      z: Math.sin(angle) * speed
    }
    
    // 随机颜色 (蓝绿色系)
    colors[index * 3] = 0.4 + Math.random() * 0.4 
    colors[index * 3 + 1] = 0.8 + Math.random() * 0.2 
    colors[index * 3 + 2] = 1.0 
  }
  
  explosionParticles.geometry.attributes.position.needsUpdate = true
  explosionParticles.geometry.attributes.color.needsUpdate = true
}

const onDocumentMouseMove = (event) => {
  mouseX = event.clientX - windowHalfX
  mouseY = event.clientY - windowHalfY
}

const onWindowResize = () => {
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

/**
 * 动画循环 - 带帧率控制
 */
let lastFrameTime = 0
const targetFPS = isLowPerf ? 30 : 60 // 低性能设备限制30fps
const frameInterval = 1000 / targetFPS

const animate = (currentTime) => {
  if (!isAnimating) return
  
  animationFrameId = requestAnimationFrame(animate)
  
  // 帧率控制
  const deltaTime = currentTime - lastFrameTime
  if (deltaTime < frameInterval) return
  
  lastFrameTime = currentTime - (deltaTime % frameInterval)
  
  render()
}

// 计算指定位置的波浪高度
const getWaveHeight = (x, z, time) => {
  // 反推网格索引 (近似)
  const ix = (x + 2000) / 80
  const iy = (z + 2000) / 80
  
  return (Math.sin((ix + time) * 0.3) * 50) + 
         (Math.sin((iy + time) * 0.5) * 50) +
         (Math.sin((ix + iy + time) * 0.2) * 20)
}

const render = () => {
  // 1. 相机移动
  camera.position.x += (mouseX - camera.position.x) * 0.02
  camera.position.y += (-mouseY + 200 - camera.position.y) * 0.02
  camera.lookAt(scene.position)

  // 2. 波浪动画
  const wavePositions = waveParticles.geometry.attributes.position.array
  let i = 0
  for (let ix = 0; ix < WAVE_COUNT_X; ix++) {
    for (let iy = 0; iy < WAVE_COUNT_Y; iy++) {
      const x = wavePositions[i]
      const z = wavePositions[i + 2]
      
      // 使用 x, z 计算波浪高度
      wavePositions[i + 1] = (Math.sin((ix + count) * 0.3) * 50) + 
                             (Math.sin((iy + count) * 0.5) * 50) +
                             (Math.sin((ix + iy + count) * 0.2) * 20)
      i += 3
    }
  }
  waveParticles.geometry.attributes.position.needsUpdate = true
  count += 0.05

  // 3. 雨滴动画 & 碰撞检测
  const rainPos = rainParticles.geometry.attributes.position.array
  const rainVel = rainParticles.geometry.attributes.velocity.array
  
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3 + 1] -= rainVel[i] // 下落
    
    const x = rainPos[i * 3]
    const z = rainPos[i * 3 + 2]
    
    // 实时计算该位置的波浪高度
    const waveHeight = getWaveHeight(x, z, count)
    
    // 精确碰撞检测：雨滴落到波浪表面以下
    if (rainPos[i * 3 + 1] < waveHeight) {
      // 在波浪表面触发爆炸
      triggerExplosion(x, waveHeight, z)
      
      // 重置雨滴到顶部
      rainPos[i * 3] = (Math.random() - 0.5) * 4000
      rainPos[i * 3 + 1] = Math.random() * 1000 + 1000 // 随机新高度
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 4000
    }
  }
  rainParticles.geometry.attributes.position.needsUpdate = true

  // 4. 爆炸动画
  const expPos = explosionParticles.geometry.attributes.position.array
  
  explosions.forEach(explosion => {
    if (!explosion.active) return
    
    explosion.age++
    if (explosion.age > 40) { // 寿命结束
      explosion.active = false
      // 隐藏粒子
      for (let i = 0; i < EXPLOSION_COUNT; i++) {
        expPos[(explosion.startIndex + i) * 3 + 1] = -10000
      }
      return
    }
    
    // 更新每个粒子位置
    for (let i = 0; i < EXPLOSION_COUNT; i++) {
      const idx = explosion.startIndex + i
      const vel = explosion.velocities[i]
      
      expPos[idx * 3] += vel.x
      expPos[idx * 3 + 1] += vel.y
      expPos[idx * 3 + 2] += vel.z
      
      // 重力模拟
      vel.y -= 0.5 
    }
  })
  explosionParticles.geometry.attributes.position.needsUpdate = true

  renderer.render(scene, camera)
}

onMounted(() => {
  if (shouldRender3D.value) {
    init()
    isAnimating = true
    animate(performance.now())
  }
})

onBeforeUnmount(() => {
  // 停止动画循环
  isAnimating = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 移除事件监听
  document.removeEventListener('mousemove', onDocumentMouseMove)
  window.removeEventListener('resize', onWindowResize)
  
  // 清理Three.js资源
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    renderer = null
  }
  
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose()
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    scene = null
  }
  
  camera = null
  waveParticles = null
  rainParticles = null
  explosionParticles = null
})
</script>

<style scoped>
/* 3D容器 */
.three-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transition: background 0.5s ease;
  z-index: 0;
}

/* 降级模式容器 - Safari/iOS优化背景 */
.fallback-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

/* 渐变背景 */
.gradient-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 20%, #e6f7ff 0%, #f0f2f5 50%, #d9ecff 100%);
  transition: background 0.3s ease;
}

.fallback-container.is-dark .gradient-bg {
  background: radial-gradient(circle at 30% 20%, #1b2735 0%, #090a0f 50%, #0d1520 100%);
}

/* 静态粒子效果 */
.particles-static {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: #409EFF;
  border-radius: 50%;
  opacity: 0.3;
  animation: float 8s infinite ease-in-out;
}

.fallback-container.is-dark .particle {
  background: #66b1ff;
  opacity: 0.5;
}

/* 简单的浮动动画 - 仅使用transform和opacity，性能最优 */
@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-20px) scale(1.2);
    opacity: 0.6;
  }
}

/* Safari/iOS 设备下禁用动画 */
@media (prefers-reduced-motion: reduce) {
  .particle {
    animation: none;
  }
}
</style>