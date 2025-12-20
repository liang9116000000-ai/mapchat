<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1>📍 我们的故事</h1>
          <p>点击地图任意位置添加故事记录</p>
        </div>
      </div>
    </header>
    
    <main class="main">
      <SimpleInteractiveMap />
    </main>
  </div>
</template>

<script>
import SimpleInteractiveMap from './components/SimpleInteractiveMap.vue'

export default {
  name: 'App',
  components: {
    SimpleInteractiveMap
  }
}
</script>

<style>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #ffffff;
  color: #1e2022;
  padding: 1.2rem 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-bottom: 1px solid #f1f1f2;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.header-left {
  text-align: left;
}

.header-left h1 {
  font-size: 1.6rem;
  margin-bottom: 0.3rem;
  font-weight: 600;
  color: #1e2022;
}

.header-left p {
  color: #8a919f;
  font-size: 0.9rem;
  font-weight: 400;
}



.main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-left {
    text-align: center;
  }
}
</style>