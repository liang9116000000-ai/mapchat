<template>
  <div class="app">
    <!-- 左侧边栏导航 -->
    <aside class="sidebar-nav">
      <div class="nav-logo">
        <span class="logo-icon">📍</span>
        <span class="logo-text">附近故事</span>
      </div>
      
      <nav class="nav-menu">
        <div class="nav-item" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">首页</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'discover' }" @click="activeTab = 'discover'">
          <span class="nav-icon">🔍</span>
          <span class="nav-label">发现</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'message' }" @click="handleNavClick('message')">
          <span class="nav-icon">💬</span>
          <span class="nav-label">消息</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'collect' }" @click="handleNavClick('collect')">
          <span class="nav-icon">⭐</span>
          <span class="nav-label">收藏</span>
        </div>
        
        <div class="nav-publish" @click="activeTab = 'home'">
          <span class="publish-icon">+</span>
          <span class="publish-text">发布</span>
        </div>
      </nav>
      
      <!-- 用户信息 -->
      <div class="nav-user" v-if="user" @click="activeTab = 'profile'">
        <div class="user-avatar">
          <img v-if="user.avatar_url" :src="user.avatar_url" />
          <span v-else>{{ getUserDisplayName().charAt(0) }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ getUserDisplayName() }}</span>
        </div>
      </div>
      <div class="nav-user login-btn-wrap" v-else @click="showLogin = true">
        <span class="login-text">登录</span>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 首页/地图 -->
      <div v-show="activeTab === 'home'" class="tab-content">
        <SimpleInteractiveMap ref="mapComponent" :user="user" @update-events="updateEvents" @open-private-chat="openPrivateChat" />
      </div>
      
      <!-- 发现页 -->
      <div v-show="activeTab === 'discover'" class="tab-content discover-page">
        <div class="page-header">
          <h1>发现</h1>
        </div>
        <div class="story-grid">
          <div v-for="event in events" :key="event.id" class="story-card" @click="openStory(event)">
            <div class="story-card-image">
              <img v-if="getFirstImage(event)" :src="getFirstImage(event)" />
              <div v-else class="story-card-placeholder">📖</div>
            </div>
            <div class="story-card-content">
              <h3>{{ event.title }}</h3>
              <div class="story-card-author">
                <span class="author-avatar">{{ (event.user?.display_name || '匿名').charAt(0) }}</span>
                <span class="author-name">{{ event.user?.display_name || '匿名用户' }}</span>
              </div>
              <div class="story-card-stats">
                <span>❤️ {{ event.likes || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 消息页 -->
      <div v-show="activeTab === 'message'" class="tab-content message-page">
        <PrivateChat v-if="user" :user="user" :target-user="chatTargetUser" />
      </div>
      
      <!-- 收藏页 -->
      <div v-show="activeTab === 'collect'" class="tab-content collect-page">
        <div class="page-header">
          <h1>我的收藏</h1>
        </div>
        <div class="empty-state">
          <span class="empty-icon">⭐</span>
          <p>暂无收藏</p>
        </div>
      </div>
      
      <!-- 我的页面 -->
      <div v-show="activeTab === 'profile'" class="tab-content profile-page">
        <div v-if="user" class="profile-content">
          <div class="profile-header-card">
            <div class="profile-cover"></div>
            <div class="profile-info">
              <div class="profile-avatar">
                <img v-if="user.avatar_url" :src="user.avatar_url" />
                <span v-else>{{ getUserDisplayName().charAt(0) }}</span>
              </div>
              <h2>{{ getUserDisplayName() }}</h2>
              <p class="profile-id">ID: {{ user.id?.substring(0, 8) }}</p>
            </div>
          </div>
          <div class="profile-stats-card">
            <div class="stat-item" @click="activeTab = 'discover'">
              <span class="stat-num">{{ myEvents.length }}</span>
              <span class="stat-label">笔记</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">0</span>
              <span class="stat-label">关注</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">0</span>
              <span class="stat-label">粉丝</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">0</span>
              <span class="stat-label">获赞与收藏</span>
            </div>
          </div>
          <div class="profile-actions">
            <button class="edit-btn" @click="showProfile = true">编辑资料</button>
            <button class="settings-btn">⚙️</button>
          </div>
          <div class="profile-tabs">
            <span class="profile-tab active">笔记</span>
            <span class="profile-tab">收藏</span>
            <span class="profile-tab">赞过</span>
          </div>
          <div class="my-story-grid">
            <div v-for="event in myEvents" :key="event.id" class="story-card" @click="openStory(event)">
              <div class="story-card-image">
                <img v-if="getFirstImage(event)" :src="getFirstImage(event)" />
                <div v-else class="story-card-placeholder">📖</div>
              </div>
              <div class="story-card-content">
                <h3>{{ event.title }}</h3>
                <div class="story-card-stats">
                  <span>❤️ {{ event.likes || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
        <div v-else class="login-prompt">
          <span class="empty-icon">👤</span>
          <p>登录后查看个人主页</p>
          <button class="login-btn" @click="showLogin = true">立即登录</button>
        </div>
      </div>
    </main>
  </div>
  
  <!-- 登录模态框 -->
  <Teleport to="body">
    <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <div class="modal login-modal" @click.stop>
        <Login @login-success="handleLoginSuccess" @close="showLogin = false" />
      </div>
    </div>
    
    <!-- 用户资料模态框 -->
    <div v-if="showProfile" class="modal-overlay" @click="showProfile = false">
      <div class="modal login-modal" @click.stop>
        <UserProfile
          :user="user"
          :events="events"
          @logout="handleLogout"
          @close="showProfile = false"
          @focus-event="handleFocusEvent"
          @delete-event="handleDeleteEvent"
          @update-user="handleUserUpdate"
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
import PrivateChat from './components/PrivateChat.vue'

export default {
  name: 'App',
  components: {
    SimpleInteractiveMap,
    Login,
    UserProfile,
    PrivateChat
  },
  
  data() {
    return {
      user: null,
      events: [],
      showLogin: false,
      showProfile: false,
      activeTab: 'home',
      chatTargetUser: null
    }
  },
  
  computed: {
    myEvents() {
      if (!this.user) return []
      return this.events.filter(e => e.user_id === this.user.id)
    }
  },
  
  async mounted() {
    // 先检查当前登录状态
    const { data: { session } } = await supabase.auth.getSession()
    console.log('初始 session:', session)
    
    if (session?.user) {
      this.user = session.user
      await this.fetchUserProfile(session.user.id)
      console.log('初始化后的 user:', this.user)
    }
    
    // 监听认证状态变化
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event, session?.user?.id)
      
      // 跳过 INITIAL_SESSION，因为上面已经处理过了
      if (event === 'INITIAL_SESSION') {
        return
      }
      
      if (event === 'SIGNED_IN' && session) {
        // 保留已有的 display_name
        const currentDisplayName = this.user?.display_name
        this.user = session.user
        if (currentDisplayName) {
          this.user.display_name = currentDisplayName
        } else {
          await this.fetchUserProfile(session.user.id)
        }
        this.showLogin = false
      } else if (event === 'SIGNED_OUT') {
        this.user = null
        this.showProfile = false
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const currentDisplayName = this.user?.display_name
        this.user = { ...session.user, display_name: currentDisplayName }
      }
    })
  },
  
  methods: {
    handleNavClick(tab) {
      if (!this.user && (tab === 'message' || tab === 'collect')) {
        this.showLogin = true
        return
      }
      this.activeTab = tab
    },
    
    getUserDisplayName() {
      if (this.user?.display_name) {
        return this.user.display_name
      }
      return '匿名用户'
    },
    
    getFirstImage(event) {
      if (event.image) {
        return event.image.split(',')[0]
      }
      return null
    },
    
    openStory(event) {
      this.activeTab = 'home'
      this.$nextTick(() => {
        this.$refs.mapComponent?.showStoryById(event)
      })
    },
    
    async fetchUserProfile(userId) {
      const userData = await dbServiceSimple.getUserProfile(userId)
      if (userData) {
        this.user = { ...this.user, ...userData }
      }
    },
    
    async handleLoginSuccess(user) {
      this.user = user
      this.showLogin = false
      await this.fetchUserProfile(user.id)
    },
    
    handleLogout() {
      supabase.auth.signOut()
      this.user = null
      this.showProfile = false
      this.activeTab = 'home'
    },
    
    updateEvents(events) {
      this.events = events
    },
    
    handleFocusEvent(event) {
      this.showProfile = false
      this.activeTab = 'home'
      this.$refs.mapComponent?.focusOnEvent(event)
    },
    
    handleUserUpdate(updatedUser) {
      this.user = { ...this.user, ...updatedUser }
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
    },
    
    openPrivateChat(targetUser) {
      this.chatTargetUser = targetUser
      this.activeTab = 'message'
      // 重置后让 PrivateChat 组件重新初始化
      this.$nextTick(() => {
        this.chatTargetUser = targetUser
      })
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app {
  height: 100vh;
  display: flex;
  background: #f5f5f5;
}

/* 左侧边栏导航 - 小红书PC风格 */
.sidebar-nav {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.nav-logo {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.nav-menu {
  flex: 1;
  padding: 8px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: #f5f5f5;
  color: #333;
}

.nav-item.active {
  background: #fff0f0;
  color: #ff2442;
}

.nav-icon {
  font-size: 20px;
}

.nav-label {
  font-size: 15px;
  font-weight: 500;
}

.nav-publish {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 16px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #ff6b9d, #ff2442);
  color: white;
  border-radius: 24px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.nav-publish:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 36, 66, 0.3);
}

.publish-icon {
  font-size: 20px;
  font-weight: 300;
}

.publish-text {
  font-size: 15px;
  font-weight: 500;
}

.nav-user {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.nav-user:hover {
  background: #f9f9f9;
}

.nav-user .user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
}

.nav-user .user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.login-btn-wrap {
  justify-content: center;
}

.login-text {
  color: #ff2442;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  margin-left: 220px;
  height: 100vh;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: auto;
}

/* 页面头部 */
.page-header {
  padding: 24px 32px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

/* 发现页 */
.discover-page {
  background: #f5f5f5;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  padding: 24px 32px;
}

.story-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.story-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.story-card-image {
  aspect-ratio: 4/3;
  background: #f0f0f0;
  overflow: hidden;
}

.story-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.story-card:hover .story-card-image img {
  transform: scale(1.05);
}

.story-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
}

.story-card-content {
  padding: 14px 16px;
}

.story-card-content h3 {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.5;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: white;
}

.author-name {
  font-size: 13px;
  color: #666;
}

.story-card-stats {
  font-size: 13px;
  color: #999;
}

/* 消息页 & 收藏页 */
.message-page {
  background: #fff;
  height: 100%;
}

.collect-page {
  background: #f5f5f5;
  height: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 15px;
}

/* 个人主页 */
.profile-page {
  background: #f5f5f5;
  height: 100%;
}

.profile-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.profile-header-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
}

.profile-cover {
  height: 120px;
  background: linear-gradient(135deg, #ff6b9d, #ff2442);
}

.profile-info {
  padding: 0 24px 24px;
  text-align: center;
  margin-top: -50px;
}

.profile-info .profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: white;
  font-weight: 600;
  border: 4px solid white;
  overflow: hidden;
}

.profile-info .profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info h2 {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.profile-id {
  font-size: 13px;
  color: #999;
}

.profile-stats-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.stat-item {
  text-align: center;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
}

.stat-item:hover {
  background: #f5f5f5;
}

.stat-num {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.edit-btn {
  background: white;
  border: 1px solid #ddd;
  padding: 10px 32px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  border-color: #ff2442;
  color: #ff2442;
}

.settings-btn {
  background: white;
  border: 1px solid #ddd;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  border-color: #ff2442;
}

.profile-tabs {
  display: flex;
  gap: 32px;
  justify-content: center;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
  background: white;
  border-radius: 16px 16px 0 0;
  margin-bottom: -1px;
}

.profile-tab {
  font-size: 15px;
  color: #666;
  cursor: pointer;
  padding: 8px 0;
  position: relative;
}

.profile-tab.active {
  color: #333;
  font-weight: 600;
}

.profile-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #ff2442;
  border-radius: 1px;
}

.my-story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 0 0 16px 16px;
  min-height: 200px;
}

.my-story-grid .story-card {
  box-shadow: none;
  border: 1px solid #eee;
}

.logout-btn {
  display: block;
  width: 100%;
  max-width: 200px;
  margin: 24px auto 0;
  background: #f5f5f5;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  color: #ff2442;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #ffebee;
}

.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.login-prompt .empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.login-prompt p {
  font-size: 16px;
  margin-bottom: 20px;
}

.login-btn {
  background: linear-gradient(135deg, #ff6b9d, #ff2442);
  color: white;
  border: none;
  padding: 12px 40px;
  border-radius: 24px;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 36, 66, 0.3);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal.login-modal {
  background: transparent;
  max-width: 95%;
  max-height: 90vh;
  overflow: hidden;
}

/* 响应式 - 小屏幕隐藏侧边栏文字 */
@media (max-width: 1024px) {
  .sidebar-nav {
    width: 72px;
    min-width: 72px;
  }
  
  .nav-logo {
    justify-content: center;
    padding: 20px 12px;
  }
  
  .logo-text {
    display: none;
  }
  
  .nav-item {
    justify-content: center;
    padding: 14px;
  }
  
  .nav-label {
    display: none;
  }
  
  .nav-publish {
    padding: 12px;
    margin: 16px 8px;
  }
  
  .publish-text {
    display: none;
  }
  
  .nav-user {
    justify-content: center;
    padding: 16px 12px;
  }
  
  .user-info {
    display: none;
  }
  
  .main-content {
    margin-left: 72px;
  }
}
</style>