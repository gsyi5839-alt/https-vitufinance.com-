<template>
  <div class="task-item" :class="{ 'task-completed': completed }" @click="handleClick">
    <div class="task-icon">
      <img :src="icon" :alt="title" />
    </div>
    <div class="task-info">
      <!-- 任务标题 -->
      <div class="task-title">{{ title }}</div>
      <!-- 奖励显示 -->
      <div v-if="reward" class="task-reward">
        <span class="reward-icon">≡</span>
        <span class="reward-text">{{ reward }}</span>
      </div>
    </div>
    <!-- 完成状态显示复选框，否则显示箭头 -->
    <div v-if="completed" class="task-check">✓</div>
    <div v-else class="task-arrow">›</div>
  </div>
</template>

<script setup>
// 组件属性定义
const props = defineProps({
  // 任务标题（必填）
  title: {
    type: String,
    required: true
  },
  // 任务图标（必填）
  icon: {
    type: String,
    required: true
  },
  // 点击跳转链接（可选）
  link: {
    type: String,
    default: ''
  },
  // 奖励文本（可选，如 "+2 WLD"）
  reward: {
    type: String,
    default: ''
  },
  // 是否已完成
  completed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
  if (props.link) {
    window.open(props.link, '_blank')
  }
}
</script>

<style scoped>
/* 任务项容器 - PC端尺寸与币种卡片一致：380×85 */
.task-item {
  width: 380px;
  height: 85px;
  background: var(--UI-CARD-BG, #2A2A30);
  border-radius: 12px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.03);
  margin: 0 auto 8px; /* 居中，间距与币种卡片一致 */
}

.task-item:hover {
  background: var(--UI-CARD-BG, #2A2A30);
  border-color: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
}

/* 任务图标 - 与币种卡片图标尺寸一致 */
.task-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 任务信息区域 */
.task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

/* 任务标题 */
.task-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 0;
}

/* 奖励显示 */
.task-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.reward-icon {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.reward-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

/* 箭头图标 */
.task-arrow {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.4);
}

/* 完成状态复选框 */
.task-check {
  width: 26px;
  height: 26px;
  background: #22c55e;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: bold;
}

/* 已完成状态 */
.task-completed {
  opacity: 0.8;
}

/* 移动端适配 - 使用响应式宽度 */
@media (max-width: 768px) {
  .task-item {
    width: 100%;           /* 响应式宽度 */
    max-width: 360px;      /* 最大宽度限制 */
    height: 80px;
    padding: 0 12px;
    gap: 8px;
  }

  .task-icon {
    width: 40px;
    height: 40px;
  }

  .task-title {
    font-size: 14px;
  }

  .reward-icon,
  .reward-text {
    font-size: 12px;
  }

  .task-arrow {
    font-size: 20px;
  }

  .task-check {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 400px) {
  .task-item {
    width: 100%;
    max-width: none;       /* 移除最大宽度限制，完全填充 */
    height: 75px;
    padding: 0 10px;
    gap: 6px;
  }

  .task-icon {
    width: 36px;
    height: 36px;
  }

  .task-title {
    font-size: 13px;
  }

  .reward-icon,
  .reward-text {
    font-size: 11px;
  }

  .task-arrow {
    font-size: 18px;
  }

  .task-check {
    width: 22px;
    height: 22px;
    font-size: 13px;
  }
}
</style>
