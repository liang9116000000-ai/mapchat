<template>
  <div class="app">
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1>📍 我们的故事</h1>
          <p>点击地图任意位置添加故事记录</p>
        </div>
        
        <div class="header-right">
        <div v-if="user" class="user-info">
          <span>欢迎，{{ user.display_name || user.email }}</span>
          <button @click="showProfile = true" class="profile-btn">👤</button>
        </div>
          <button v-else @click="showLogin = true" class="login-btn">
            🔐 登录/注册
          </button>
        </div>
      </div>
    </header>
    
    <main class="main">
      <SimpleInteractiveMap ref="mapComponent" :user="user" @update-events="updateEvents" />
    </main>
    
    <!-- 登录模态框 -->
    <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <div class="modal" @click.stop>
        <Login @login-success="handleLoginSuccess" />
      </div>
    </div>
    
    <!-- 用户资料模态框 -->
    <div v-if="showProfile" class="modal-overlay" @click="showProfile = false">
      <div class="modal" @click.stop>
        <UserProfile 
          :user="user" 
          :events="events" 
          @logout="handleLogout" 
          @focus-event="handleFocusEvent"
          @delete-event="handleDeleteEvent"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from './supabase.js'
import SimpleInteractiveMap from './components/SimpleInteractiveMap.vue'
import Login from './components/Login.vue'
import UserProfile from './components/UserProfile.vue'

export default {
  name: 'App',
  components: {
    SimpleInteractiveMap,
    Login,
    UserProfile
  },
  
  data() {
    return {
      user: null,
      events: [],
      showLogin: false,
      showProfile: false
    }
  },
  
  async mounted() {
    // 检查当前登录状态
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      this.user = user
      await this.fetchUserProfile(user.id)
    }
    
    // 监听认证状态变化
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.user = session.user
        await this.fetchUserProfile(session.user.id)
        this.showLogin = false
      } else if (event === 'SIGNED_OUT') {
        this.user = null
        this.showProfile = false
      }
    })
  },
  
  methods: {
    async fetchUserProfile(userId) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (!error && data) {
        this.user = { ...this.user, ...data }
      }
    },
    
    handleLoginSuccess(user) {
      this.user = user
      this.showLogin = false
      this.fetchUserProfile(user.id)
    },
    
    handleLogout() {
      this.user = null
      this.showProfile = false
    },
    
    updateEvents(events) {
      this.events = events
    },
    
    handleFocusEvent(event) {
      this.showProfile = false
      // 通知地图组件聚焦到指定事件
      this.$refs.mapComponent?.focusOnEvent(event)
    },
    
    async handleDeleteEvent(eventId) {
      try {
        // 通知地图组件删除事件
        if (this.$refs.mapComponent?.deleteEvent) {
          await this.$refs.mapComponent.deleteEvent(eventId)
        }
      } catch (error) {
        console.error('删除事件失败:', error)
        alert('删除失败，请重试')
      }
    }
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
  position: relative;
  z-index: 1000;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  color: #1e2022;
  font-weight: 500;
}

.profile-btn {
  background: #f1f1f2;
  border: 1px solid #e1e2e3;
  color: #1e2022;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.profile-btn:hover {
  background: #e8e8e9;
  transform: translateY(-1px);
}

.login-btn {
  background: #1171ee;
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-btn:hover {
  background: #0958d9;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 113, 238, 0.2);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
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