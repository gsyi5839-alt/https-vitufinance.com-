<template>
  <div class="ripple-wrapper">
    <!-- 5个扩散波纹层，从中心向外扩散 -->
    <div class="ripple-wave ripple-wave-1"></div>
    <div class="ripple-wave ripple-wave-2"></div>
    <div class="ripple-wave ripple-wave-3"></div>
    <div class="ripple-wave ripple-wave-4"></div>
    <div class="ripple-wave ripple-wave-5"></div>
    
    <!-- 核心层：固定的图标 -->
    <div class="ripple-core">
      <img src="/static/two/zh.png" alt="WLD" class="ripple-core-img" />
    </div>
  </div>
</template>

<script setup>
// 逻辑层保持简洁
</script>

<style scoped>
.ripple-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
  margin: 0 auto;
  overflow: visible;
}

/* 扩散波纹基础样式 */
.ripple-wave {
  position: absolute;
  border-radius: 50%;
  /* 圆形遮罩确保渲染正确 */
  -webkit-background-clip: padding-box;
  background-clip: padding-box;
  -webkit-mask-image: -webkit-radial-gradient(white, black);
  mask-image: radial-gradient(white, black);
  overflow: hidden;
  /* 扩散动画 - 放慢速度 */
  animation: ripple-expand 6s ease-out infinite;
  /* 初始状态 */
  opacity: 0;
}

/* 每一层的起始尺寸和颜色 - 玫瑰紫色调，延迟间隔加大 */
.ripple-wave-1 {
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(145, 60, 106, 0.7) 0%, rgba(145, 60, 106, 0.4) 60%, rgba(145, 60, 106, 0) 100%);
  animation-delay: 0s;
}

.ripple-wave-2 {
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(138, 60, 102, 0.6) 0%, rgba(138, 60, 102, 0.35) 60%, rgba(138, 60, 102, 0) 100%);
  animation-delay: 1.2s;
}

.ripple-wave-3 {
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(121, 57, 102, 0.5) 0%, rgba(121, 57, 102, 0.3) 60%, rgba(121, 57, 102, 0) 100%);
  animation-delay: 2.4s;
}

.ripple-wave-4 {
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(115, 63, 119, 0.4) 0%, rgba(115, 63, 119, 0.2) 60%, rgba(115, 63, 119, 0) 100%);
  animation-delay: 3.6s;
}

.ripple-wave-5 {
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(100, 55, 100, 0.3) 0%, rgba(100, 55, 100, 0.15) 60%, rgba(100, 55, 100, 0) 100%);
  animation-delay: 4.8s;
}

/* 扩散动画：从小到大，透明度逐渐消失，更平滑的过渡 */
@keyframes ripple-expand {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  30% {
    opacity: 0.6;
  }
  60% {
    opacity: 0.35;
  }
  100% {
    transform: scale(5);
    opacity: 0;
  }
}

/* 核心层 - 固定在中心 */
.ripple-core {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20;
}

.ripple-core-img {
  width: 50px;
  height: 50px;
  object-fit: contain;
  position: relative;
  z-index: 21;
}

/* 移动端适配 - 整体尺寸 201x201 */
@media (max-width: 768px) {
  .ripple-wrapper {
    min-height: 220px;
  }

  /* 缩小波纹起始尺寸 */
  .ripple-wave-1,
  .ripple-wave-2,
  .ripple-wave-3,
  .ripple-wave-4,
  .ripple-wave-5 {
    width: 50px;
    height: 50px;
  }

  /* 调整扩散倍数以适应 201px，更平滑的过渡 */
  @keyframes ripple-expand {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    30% {
      opacity: 0.6;
    }
    60% {
      opacity: 0.35;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  /* 缩小核心图标 */
  .ripple-core {
    width: 45px;
    height: 45px;
  }
  .ripple-core-img {
    width: 40px;
    height: 40px;
  }
}
</style>
