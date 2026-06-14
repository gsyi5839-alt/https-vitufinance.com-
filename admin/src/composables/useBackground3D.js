import * as THREE from 'three'
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import {
  shouldUse3DEffects,
  getOptimalPixelRatio,
  getOptimalParticleCount,
  isLowPerformanceDevice
} from '@/utils/deviceDetect'

export function useBackground3D() {
  const themeStore = useThemeStore()
  const container = ref(null)
  const shouldRender3D = ref(shouldUse3DEffects())
  const isDark = computed(() => themeStore.theme === 'dark')
  const containerStyle = computed(() => ({
    background: isDark.value
      ? 'radial-gradient(circle at center, #1b2735 0%, #090a0f 100%)'
      : 'radial-gradient(circle at center, #e6f7ff 0%, #f0f2f5 100%)'
  }))

  let scene, camera, renderer
  let waveParticles, rainParticles, explosionParticles
  let count = 0
  let mouseX = 0
  let mouseY = 0
  let windowHalfX = window.innerWidth / 2
  let windowHalfY = window.innerHeight / 2
  let animationFrameId = null
  let isAnimating = false
  let lastFrameTime = 0

  const isLowPerf = isLowPerformanceDevice()
  const WAVE_COUNT_X = isLowPerf ? 25 : 50
  const WAVE_COUNT_Y = isLowPerf ? 25 : 50
  const RAIN_COUNT = getOptimalParticleCount(200)
  const EXPLOSION_COUNT = getOptimalParticleCount(200)
  const EXPLOSION_POOL_SIZE = isLowPerf ? 30 : 100
  const targetFPS = isLowPerf ? 30 : 60
  const frameInterval = 1000 / targetFPS
  const explosions = []

  const getParticleStyle = (index) => {
    const seed = index * 137.508
    return {
      left: `${seed % 100}%`,
      top: `${(seed * 1.618) % 100}%`,
      animationDelay: `${index * 0.3}s`,
      opacity: 0.3 + (index % 5) * 0.1
    }
  }

  watch(() => themeStore.theme, (newTheme) => {
    updateThemeColors(newTheme)
  })

  const updateThemeColors = (theme) => {
    if (!scene || !waveParticles || !rainParticles) return

    const isDarkTheme = theme === 'dark'
    scene.fog.color.setHex(isDarkTheme ? 0x050505 : 0xf0f2f5)
    scene.fog.density = 0.002
    waveParticles.material.color.setHex(isDarkTheme ? 0x409EFF : 0x1890ff)
    waveParticles.material.opacity = isDarkTheme ? 0.8 : 0.6
    rainParticles.material.color.setHex(isDarkTheme ? 0xA6C8FF : 0x409EFF)
    explosionParticles.material.opacity = 1
  }

  const init = () => {
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

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isLowPerf,
      powerPreference: 'low-power'
    })

    renderer.setPixelRatio(getOptimalPixelRatio())
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.value.appendChild(renderer.domElement)

    initWave()
    initRain()
    initExplosions()
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
    waveParticles = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0x409EFF,
      size: 4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }))
    scene.add(waveParticles)
  }

  const initRain = () => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(RAIN_COUNT * 3)
    const velocities = new Float32Array(RAIN_COUNT)

    for (let i = 0; i < RAIN_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4000
      positions[i * 3 + 1] = Math.random() * 2000 + 500
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4000
      velocities[i] = Math.random() * 10 + 20
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1))
    rainParticles = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xA6C8FF,
      size: 3,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    }))
    scene.add(rainParticles)
  }

  const initExplosions = () => {
    const geometry = new THREE.BufferGeometry()
    const particleCount = EXPLOSION_COUNT * EXPLOSION_POOL_SIZE
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 1] = -10000
      colors[i * 3] = 1.0
      colors[i * 3 + 1] = 1.0
      colors[i * 3 + 2] = 1.0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    explosionParticles = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    }))
    scene.add(explosionParticles)

    for (let i = 0; i < EXPLOSION_POOL_SIZE; i++) {
      explosions.push({
        active: false,
        startIndex: i * EXPLOSION_COUNT,
        age: 0,
        velocities: []
      })
    }
  }

  const triggerExplosion = (x, y, z) => {
    const explosion = explosions.find((item) => !item.active)
    if (!explosion) return

    explosion.active = true
    explosion.age = 0
    const positions = explosionParticles.geometry.attributes.position.array
    const colors = explosionParticles.geometry.attributes.color.array

    for (let i = 0; i < EXPLOSION_COUNT; i++) {
      const index = explosion.startIndex + i
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 8 + 4
      const vy = Math.random() * 12 + 8

      positions[index * 3] = x
      positions[index * 3 + 1] = y
      positions[index * 3 + 2] = z
      explosion.velocities[i] = {
        x: Math.cos(angle) * speed,
        y: vy,
        z: Math.sin(angle) * speed
      }
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
    if (!camera || !renderer) return
    windowHalfX = window.innerWidth / 2
    windowHalfY = window.innerHeight / 2
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const animate = (currentTime) => {
    if (!isAnimating) return

    animationFrameId = requestAnimationFrame(animate)
    const deltaTime = currentTime - lastFrameTime
    if (deltaTime < frameInterval) return

    lastFrameTime = currentTime - (deltaTime % frameInterval)
    render()
  }

  const getWaveHeight = (x, z, time) => {
    const ix = (x + 2000) / 80
    const iy = (z + 2000) / 80
    return (Math.sin((ix + time) * 0.3) * 50) +
      (Math.sin((iy + time) * 0.5) * 50) +
      (Math.sin((ix + iy + time) * 0.2) * 20)
  }

  const render = () => {
    camera.position.x += (mouseX - camera.position.x) * 0.02
    camera.position.y += (-mouseY + 200 - camera.position.y) * 0.02
    camera.lookAt(scene.position)
    renderWave()
    renderRain()
    renderExplosions()
    renderer.render(scene, camera)
  }

  const renderWave = () => {
    const wavePositions = waveParticles.geometry.attributes.position.array
    let i = 0

    for (let ix = 0; ix < WAVE_COUNT_X; ix++) {
      for (let iy = 0; iy < WAVE_COUNT_Y; iy++) {
        wavePositions[i + 1] = (Math.sin((ix + count) * 0.3) * 50) +
          (Math.sin((iy + count) * 0.5) * 50) +
          (Math.sin((ix + iy + count) * 0.2) * 20)
        i += 3
      }
    }

    waveParticles.geometry.attributes.position.needsUpdate = true
    count += 0.05
  }

  const renderRain = () => {
    const rainPos = rainParticles.geometry.attributes.position.array
    const rainVel = rainParticles.geometry.attributes.velocity.array

    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPos[i * 3 + 1] -= rainVel[i]
      const x = rainPos[i * 3]
      const z = rainPos[i * 3 + 2]
      const waveHeight = getWaveHeight(x, z, count)

      if (rainPos[i * 3 + 1] < waveHeight) {
        triggerExplosion(x, waveHeight, z)
        rainPos[i * 3] = (Math.random() - 0.5) * 4000
        rainPos[i * 3 + 1] = Math.random() * 1000 + 1000
        rainPos[i * 3 + 2] = (Math.random() - 0.5) * 4000
      }
    }

    rainParticles.geometry.attributes.position.needsUpdate = true
  }

  const renderExplosions = () => {
    const expPos = explosionParticles.geometry.attributes.position.array

    explosions.forEach((explosion) => {
      if (!explosion.active) return

      explosion.age++
      if (explosion.age > 40) {
        explosion.active = false
        for (let i = 0; i < EXPLOSION_COUNT; i++) {
          expPos[(explosion.startIndex + i) * 3 + 1] = -10000
        }
        return
      }

      for (let i = 0; i < EXPLOSION_COUNT; i++) {
        const idx = explosion.startIndex + i
        const vel = explosion.velocities[i]
        expPos[idx * 3] += vel.x
        expPos[idx * 3 + 1] += vel.y
        expPos[idx * 3 + 2] += vel.z
        vel.y -= 0.5
      }
    })

    explosionParticles.geometry.attributes.position.needsUpdate = true
  }

  const cleanup = () => {
    isAnimating = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    document.removeEventListener('mousemove', onDocumentMouseMove)
    window.removeEventListener('resize', onWindowResize)

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
            object.material.forEach((material) => material.dispose())
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
  }

  onMounted(() => {
    if (shouldRender3D.value) {
      init()
      isAnimating = true
      animate(performance.now())
    }
  })

  onBeforeUnmount(cleanup)

  return {
    container,
    shouldRender3D,
    isDark,
    containerStyle,
    getParticleStyle
  }
}
