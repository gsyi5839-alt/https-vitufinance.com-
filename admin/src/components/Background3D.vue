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
import { useBackground3D } from '@/composables/useBackground3D'

const {
  container,
  shouldRender3D,
  isDark,
  containerStyle,
  getParticleStyle
} = useBackground3D()
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
