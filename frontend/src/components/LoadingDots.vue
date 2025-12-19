<template>
  <div class="loading-dots">
    <div class="dot dot-1"></div>
    <div class="dot dot-2"></div>
    <div class="dot dot-3"></div>
    <div class="dot dot-4"></div>
  </div>
</template>

<style scoped>
.loading-dots {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  animation: expand-contract 1.5s infinite ease-in-out;
}

.dot-1 {
  background-color: #f87171; /* Red */
  top: 0;
  left: 0;
}

.dot-2 {
  background-color: #fbbf24; /* Orange/Yellow */
  top: 0;
  right: 0;
}

.dot-3 {
  background-color: #4ade80; /* Green */
  bottom: 0;
  left: 0;
}

.dot-4 {
  background-color: #60a5fa; /* Blue */
  bottom: 0;
  right: 0;
}

@keyframes expand-contract {
  0%, 100% {
    transform: translate(0, 0);
  }
  50% {
    /* 向外扩散 */
  }
}

/* 
  重新设计动画：
  初始状态：四个点聚在一起（或者稍微分开）
  动画过程：向四个斜角方向扩散，然后收回
*/

.dot-1 {
  /* 左上 */
  animation-name: move-tl;
}
.dot-2 {
  /* 右上 */
  animation-name: move-tr;
}
.dot-3 {
  /* 左下 */
  animation-name: move-bl;
}
.dot-4 {
  /* 右下 */
  animation-name: move-br;
}

@keyframes move-tl {
  0%, 100% { transform: translate(6px, 6px); } /* 聚集中心 */
  50% { transform: translate(0, 0); } /* 向左上扩散 */
}

@keyframes move-tr {
  0%, 100% { transform: translate(-6px, 6px); }
  50% { transform: translate(0, 0); }
}

@keyframes move-bl {
  0%, 100% { transform: translate(6px, -6px); }
  50% { transform: translate(0, 0); }
}

@keyframes move-br {
  0%, 100% { transform: translate(-6px, -6px); }
  50% { transform: translate(0, 0); }
}
</style>
