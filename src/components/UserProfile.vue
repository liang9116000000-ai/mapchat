<template>
  <div class="user-profile">
    <div class="profile-header">
      <div class="avatar" :style="avatarStyle">
        <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.display_name" class="avatar-img" />
        <span v-else>{{ userInitials }}</span>
      </div>
      <div class="user-info">
        <div v-if="isEditing" class="edit-mode">
          <input
            v-model="editingName"
            ref="nameInput"
            class="name-input"
            placeholder="输入用户名"
            @keyup.enter="saveEdit"
            @keyup.esc="cancelEdit"
          />
          <div class="edit-buttons">
            <button @mousedown="saveEdit" @click="saveEdit" class="save-btn" title="保存">✓</button>
            <button @mousedown="cancelEdit" @click="cancelEdit" class="cancel-btn" title="取消">✕</button>
          </div>
        </div>
        <div v-else class="display-mode">
          <h3>{{ user.display_name || user.email }}</h3>
          <p>{{ user.email }}</p>
          <button @click="startEdit" class="edit-name-btn" title="修改用户名">✎</button>
        </div>
      </div>
    </div>
    
    <div class="profile-stats">
      <div class="stat-item">
        <span class="stat-number">{{ userEventsCount }}</span>
        <span class="stat-label">我的故事</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ totalEventsCount }}</span>
        <span class="stat-label">总故事数</span>
      </div>
    </div>
    
    <!-- 我的故事列表 -->
    <div class="user-stories">
      <div class="stories-header">
        <h4>📚 我的故事</h4>
        <div v-if="userEvents.length === 0" class="empty-stories">
          <p>还没有添加故事</p>
          <p>点击地图创建第一个故事</p>
        </div>
      </div>
      
      <div v-if="userEvents.length > 0" class="stories-list">
        <div 
          v-for="event in userEvents" 
          :key="event.id" 
          class="story-item"
          @click="$emit('focus-event', event)"
        >
          <div class="story-header">
            <div class="story-type-badge" :class="event.type">
              {{ getEventTypeName(event.type) }}
            </div>
            <button 
              class="delete-story-btn" 
              @click.stop="$emit('delete-event', event.id)"
              title="删除故事"
            >
              🗑️
            </button>
          </div>
          
          <div class="story-content">
            <h5>{{ event.title }}</h5>
            <p>{{ event.description }}</p>
          </div>
          
          <div class="story-meta">
            <span class="story-time">
              🕒 {{ formatDate(event.timestamp) }}
            </span>
            <span class="story-location">
              📍 {{ formatLocation(event.location) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    

  </div>
</template>

<script>
import { supabase } from '../supabase.js'

export default {
  name: 'UserProfile',
  props: {
    user: {
      type: Object,
      required: true
    },
    events: {
      type: Array,
      default: () => []
    }
  },
  
  emits: ['logout', 'close', 'update-user'],

  data() {
    return {
      isEditing: false,
      editingName: ''
    }
  },

  computed: {
    userInitials() {
      const name = this.user.display_name || '匿名用户'
      return name.charAt(0).toUpperCase()
    },

    avatarStyle() {
      if (!this.user.avatar_url) {
        const colors = ['#667eea', '#f56565', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac']
        const name = this.user.display_name || '匿名用户'
        const index = name.length % colors.length
        return {
          background: colors[index]
        }
      }
      return {}
    },
    
    userEventsCount() {
      const count = this.events.filter(event => event.user_id === this.user.id).length
      console.log('用户故事数计算:', {
        userId: this.user.id,
        totalEvents: this.events.length,
        userEvents: this.events.filter(event => event.user_id === this.user.id),
        count
      })
      return count
    },
    
    totalEventsCount() {
      console.log('总故事数计算:', this.events.length, this.events)
      return this.events.length
    },
    
    userEvents() {
      return this.events.filter(event => event.user_id === this.user.id)
        .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
    }
  },
  
  methods: {
    startEdit() {
      this.editingName = this.user.display_name || ''
      this.isEditing = true
      this.$nextTick(() => {
        this.$refs.nameInput?.focus()
      })
    },

    cancelEdit() {
      this.isEditing = false
      this.editingName = ''
    },

    async saveEdit() {
      if (!this.editingName.trim()) {
        alert('用户名不能为空')
        return
      }

      const { dbServiceSimple } = await import('../utils/database-simple.js')
      const result = await dbServiceSimple.updateUserProfile(this.user.id, {
        display_name: this.editingName.trim()
      })

      if (result) {
        // 触发更新用户信息事件
        this.$emit('update-user', { ...this.user, display_name: this.editingName.trim() })
        this.isEditing = false
      } else {
        alert('保存失败，请重试')
      }
    },

    async handleLogout() {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        this.$emit('logout')
      } catch (error) {
        console.error('退出登录失败:', error)
        alert('退出登录失败，请重试')
      }
    },
    
    getEventTypeName(type) {
      // 由于数据库约束，所有新保存的都是'event'类型
      // 这里需要根据实际情况显示
      const types = {
        event: '故事', // 将event显示为故事
        news: '新闻',
        other: '其他'
      }
      return types[type] || '故事'
    },
    
    formatDate(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      
      // 重置时间为0点，只比较日期
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      const diffTime = nowOnly - dateOnly
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        return '今天'
      } else if (diffDays === 1) {
        return '昨天'
      } else if (diffDays <= 7) {
        return `${diffDays}天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    },
    
    formatLocation(location) {
      return `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
    }
  }
}
</script>

<style scoped>
.user-profile {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 600px;
  max-width: 95%;
  overflow-x: hidden;
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  margin-right: 1rem;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.user-info p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

/* 编辑模式样式 */
.edit-mode {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.name-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  color: #333;
  outline: none;
  transition: border-color 0.2s;
}

.name-input:focus {
  border-color: #667eea;
}

.edit-buttons {
  display: flex;
  gap: 0.25rem;
}

.save-btn,
.cancel-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.save-btn {
  background: #48bb78;
  color: white;
}

.save-btn:hover {
  background: #38a169;
}

.cancel-btn {
  background: #fc8181;
  color: white;
}

.cancel-btn:hover {
  background: #f56565;
}

/* 显示模式样式 */
.display-mode {
  position: relative;
}

.edit-name-btn {
  position: absolute;
  top: 0;
  right: -30px;
  background: none;
  border: none;
  color: #999;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.user-info:hover .edit-name-btn {
  opacity: 1;
}

.edit-name-btn:hover {
  color: #667eea;
  transform: scale(1.1);
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 1.5rem;
  padding: 1rem 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}





/* 我的故事样式 */
.user-stories {
  margin-bottom: 1.5rem;
}

.stories-header {
  margin-bottom: 1rem;
}

.stories-header h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-stories {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
}

.empty-stories p {
  margin: 0.3rem 0;
  font-size: 0.9rem;
}

.empty-stories p:first-child {
  font-weight: 500;
  color: #333;
}

.stories-list {
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.stories-list::-webkit-scrollbar {
  display: none;
}

.story-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.story-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.8rem;
}

.story-type-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.story-type-badge.accident {
  background: #ffebe9;
  color: #cf1322;
}

.story-type-badge.event {
  background: #e6f7e6;
  color: #389e0d;
}

.story-type-badge.news {
  background: #e6f4ff;
  color: #0958d9;
}

.story-type-badge.other {
  background: #f5f5f5;
  color: #595959;
}

.delete-story-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s ease;
  padding: 0.2rem;
}

.delete-story-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.story-content {
  margin-bottom: 0.8rem;
}

.story-content h5 {
  margin: 0 0 0.3rem 0;
  color: #333;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}

.story-content p {
  margin: 0;
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.6rem;
  border-top: 1px solid #e9ecef;
  font-size: 0.75rem;
  color: #888;
}

.story-time,
.story-location {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
</style>