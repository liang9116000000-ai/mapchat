<template>
  <div class="app">
    <!-- 登录按钮 - 当用户未登录时显示 -->
    <div v-if="!user" class="login-container">
      <button @click="showLogin = true" class="login-btn">
        🔐 登录/注册
      </button>
    </div>
    
    <!-- 用户信息按钮 - 当用户已登录时显示 -->
    <div v-else class="user-container">
      <button @click="showProfile = true" class="profile-btn">
        👤 {{ user.display_name || user.email }}
      </button>
    </div>
    
    <main class="main">
      <SimpleInteractiveMap ref="mapComponent" :user="user" @update-events="updateEvents" />
    </main>
  </div>
  
  <!-- 登录模态框 - 移到app容器外 -->
  <Teleport to="body">
    <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <div class="modal login-modal" @click.stop>
        <Login @login-success="handleLoginSuccess" @close="showLogin = false" />
      </div>
    </div>
    
    <!-- 用户资料模态框 - 移到app容器外 -->
    <div v-if="showProfile" class="modal-overlay" @click="showProfile = false">
      <div class="modal login-modal" @click.stop>
        <UserProfile 
          :user="user" 
          :events="events" 
          @logout="handleLogout" 
          @close="showProfile = false"
          @focus-event="handleFocusEvent"
          @delete-event="handleDeleteEvent"
        />
      </div>
    </div>
  </Teleport>
</template>

<script>
import { supabase } from './supabase.js'
import { dbServiceSimple } from './utils/database-simple.js'
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
      const userData = await dbServiceSimple.getUserProfile(userId)
      if (userData) {
        this.user = { ...this.user, ...userData }
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
  position: relative;
}

/* 登录和用户按钮容器 */
.login-container, .user-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.login-btn:hover {
  background: #0958d9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(17, 113, 238, 0.3);
}

.profile-btn {
  background: #ffffff;
  border: 1px solid #e1e2e3;
  color: #1e2022;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.profile-btn:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  z-index: 3000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 专门用于登录的模态框样式 */
.modal.login-modal {
  background: transparent;
  border-radius: 10px;
  box-shadow: none;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 为模态框内的Login组件调整样式 */
.login-modal .login-container {
  min-height: auto;
  background: none;
  padding: 0;
  width: 100%;
}

.login-modal .login-form {
  box-shadow: none;
  margin: 0;
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
  .login-container, .user-container {
    top: 10px;
    left: 10px;
  }
  
  .login-btn, .profile-btn {
    padding: 0.6rem 1rem;
    font-size: 0.85rem;
  }
}
</style>