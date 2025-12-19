<template>
  <div class="notfound-page">
    <div class="notfound-container">
      <h1 class="error-code">404</h1>
      <h2>页面未找到</h2>
      <p>抱歉，您访问的页面不存在</p>
      <router-link to="/" class="back-home">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.notfound-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.notfound-container {
  text-align: center;
  color: #fff;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3);
}

h2 {
  font-size: 32px;
  margin-bottom: 16px;
}

p {
  font-size: 18px;
  margin-bottom: 32px;
  opacity: 0.9;
}

.back-home {
  display: inline-block;
  padding: 14px 32px;
  background: #fff;
  color: #667eea;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.back-home:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.3);
}
</style>
