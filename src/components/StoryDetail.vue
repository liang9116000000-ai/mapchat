<template>
  <div class="xiaohongshu-container">
    <div class="xiaohongshu-main">
      <!-- 左侧内容区 -->
      <div class="content-area">
        <!-- 作者信息 -->
        <div class="author-section">
          <div class="author-avatar">
            <img v-if="story.user?.avatar_url" :src="story.user.avatar_url" :alt="story.user?.display_name" />
            <span v-else>{{ (story.user?.display_name || story.user?.email || '未知').charAt(0).toUpperCase() }}</span>
          </div>
          <div class="author-info">
            <div class="author-name">{{ story.user?.display_name || story.user?.email || '匿名用户' }}</div>
            <div class="post-time">{{ formatTime(story.timestamp || story.created_at) }}</div>
          </div>
          <button class="follow-btn" v-if="!isCurrentUserStory">+ 关注</button>
        </div>

        <!-- 标题 -->
        <h1 class="story-title">{{ story.title }}</h1>
        
        <!-- 正文内容 -->
        <div class="story-content">
          <p class="story-text">{{ story.description }}</p>
        </div>

        <!-- 标签 -->
        <div class="tags-section">
          <span class="tag" v-for="tag in getTags()" :key="tag"># {{ tag }}</span>
        </div>

        <!-- 图片区域 -->
        <div class="image-gallery" v-if="story.image">
          <img :src="story.image" :alt="story.title" class="main-image" />
        </div>

        <!-- 位置信息 -->
        <div class="location-section">
          {{ detailedAddress || '获取位置中...' }}
        </div>

        <!-- 互动统计 -->
        <div class="stats-section">
          <div class="stat-item">
            <span class="count">{{ story.likes || Math.floor(Math.random() * 1000) }}</span>
            <span class="label">喜欢</span>
          </div>
          <div class="stat-item">
            <span class="count">{{ story.favorites || Math.floor(Math.random() * 100) }}</span>
            <span class="label">收藏</span>
          </div>
          <div class="stat-item">
            <span class="count">{{ story.views || Math.floor(Math.random() * 5000) }}</span>
            <span class="label">浏览</span>
          </div>
        </div>

        <!-- 分享栏 -->
        <div class="share-section">
          <button class="share-btn like-btn" @click="toggleLike">
            <span class="icon">{{ isLiked ? '❤️' : '🤍' }}</span>
            <span class="text">喜欢</span>
          </button>
          <button class="share-btn favorite-btn" @click="toggleFavorite">
            <span class="icon">⭐</span>
            <span class="text">收藏</span>
          </button>
          <button class="share-btn comment-btn" @click="scrollToComments">
            <span class="icon">💬</span>
            <span class="text">评论</span>
          </button>
          <button class="share-btn message-btn" @click="openPrivateMessage">
            <span class="icon">✉️</span>
            <span class="text">私信</span>
          </button>
          <button class="share-btn more-btn">
            <span class="icon">⋯</span>
          </button>
        </div>
      </div>

      <!-- 右侧推荐区 -->
      <div class="sidebar">
        <!-- 相关推荐 -->
        <div class="recommend-section">
          <h4>相关推荐</h4>
          <div class="recommend-list">
            <div v-for="item in recommendations" :key="item.id" class="recommend-item">
              <img :src="item.image" class="recommend-image" />
              <div class="recommend-info">
                <div class="recommend-title">{{ item.title }}</div>
                <div class="recommend-stats">
                  <span>❤️ {{ item.likes }}</span>
                  <span>💬 {{ item.comments }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 评论区 -->
        <div class="comments-section" ref="commentsSection">
          <div class="comments-header">
            <h3>评论 ({{ comments.length }})</h3>
            <select class="sort-select" v-model="commentSort">
              <option value="newest">最新</option>
              <option value="hottest">最热</option>
            </select>
          </div>

          <!-- 评论列表 -->
          <div class="comments-list">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">
                <img v-if="comment.user?.avatar_url" :src="comment.user.avatar_url" />
                <span v-else>{{ (comment.user?.name || '匿名').charAt(0) }}</span>
              </div>
              <div class="comment-content">
                <div class="comment-user">
                  {{ comment.user?.name || '匿名用户' }}
                  <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
                <div class="comment-actions">
                  <button class="comment-action like-comment" @click="likeComment(comment)">
                    {{ comment.isLiked ? '已赞' : '赞' }} {{ comment.likes || 0 }}
                  </button>
                  <button class="comment-action reply-comment" @click="replyToComment(comment)">
                    回复
                  </button>
                </div>
                
                <!-- 子评论 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <div class="reply-avatar">
                      <img v-if="reply.user?.avatar_url" :src="reply.user.avatar_url" />
                      <span v-else>{{ (reply.user?.name || '匿名').charAt(0) }}</span>
                    </div>
                    <div class="reply-content">
                      <div class="reply-user">
                        {{ reply.user?.name || '匿名用户' }}
                        <span class="reply-time">{{ formatCommentTime(reply.created_at) }}</span>
                      </div>
                      <div class="reply-text">@{{ comment.user?.name }} {{ reply.content }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 发表评论 -->
          <div class="comment-input-section">
            <div class="comment-input-wrapper">
              <div class="comment-input-avatar">
                <img v-if="user?.avatar_url" :src="user.avatar_url" />
                <span v-else>{{ (user?.display_name || user?.email || '未').charAt(0).toUpperCase() }}</span>
              </div>
              <textarea 
                class="comment-input" 
                v-model="newComment"
                placeholder="发表你的评论..."
                rows="2"
                @keydown.enter.ctrl="submitComment"
              ></textarea>
              <button class="submit-comment-btn" @click="submitComment" :disabled="!newComment.trim()">
                发送
              </button>
            </div>
            <div class="emoji-toolbar">
              <span class="emoji-btn" v-for="emoji in commonEmojis" :key="emoji" @click="insertEmoji(emoji)">
                {{ emoji }}
              </span>
            </div>
          </div>
        </div>

        <!-- 话题推荐 -->
        <div class="topic-section">
          <h4>热门话题</h4>
          <div class="topic-list">
            <span v-for="topic in hotTopics" :key="topic" class="topic-tag"># {{ topic }}</span>
          </div>
        </div>
      </div>
    </div>



    <!-- 关闭按钮 -->
    <button class="close-btn" @click="$emit('close')">×</button>
  </div>
</template>

<script>
export default {
  name: 'StoryDetail',
  props: {
    story: {
      type: Object,
      required: true
    },
    currentUser: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'edit', 'delete'],
  
  data() {
    return {
      isLiked: false,
      isFavorited: false,
      newComment: '',
      commentSort: 'newest',
      comments: this.generateMockComments(),
      commonEmojis: ['😊', '😍', '🤔', '😂', '❤️', '👍', '🎉', '🔥'],
      recommendations: this.generateRecommendations(),
      hotTopics: ['美食探店', '日常穿搭', '旅行日记', '生活记录', '美妆分享', '学习笔记'],
      detailedAddress: ''
    }
  },
  
  async mounted() {
    // 组件挂载时获取详细地址
    if (this.story?.location) {
      this.detailedAddress = await this.getDetailedLocation(
        this.story.location.lat, 
        this.story.location.lng
      )
    }
  },
  
  computed: {
    isCurrentUserStory() {
      return this.currentUser && this.story.user_id === this.currentUser.id
    },
    
    sortedComments() {
      const sorted = [...this.comments]
      if (this.commentSort === 'hottest') {
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
      } else {
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }
    },
    
    user() {
      return this.currentUser
    }
  },
  
  methods: {
    getTags() {
      // 从标题和描述中提取关键词作为标签
      const tags = []
      if (this.story.type === 'event') tags.push('活动')
      if (this.story.type === 'news') tags.push('新闻')
      if (this.story.description.includes('美食')) tags.push('美食')
      if (this.story.description.includes('旅行')) tags.push('旅行')
      if (this.story.description.includes('日常')) tags.push('日常')
      return tags.slice(0, 3)
    },
    

    
    toggleLike() {
      this.isLiked = !this.isLiked
      if (this.isLiked) {
        this.story.likes = (this.story.likes || 0) + 1
      } else {
        this.story.likes = Math.max(0, (this.story.likes || 0) - 1)
      }
    },
    
    toggleFavorite() {
      this.isFavorited = !this.isFavorited
    },
    
    scrollToComments() {
      this.$refs.commentsSection?.scrollIntoView({ behavior: 'smooth' })
    },
    
    openPrivateMessage() {
      if (!this.user) {
        alert('请先登录后再私信')
        return
      }
      
      if (this.isCurrentUserStory) {
        alert('不能给自己发私信')
        return
      }
      
      // 模拟打开私信界面
      alert(`正在给 ${this.story.user?.display_name || '该用户'} 发送私信...`)
      
      // 这里可以扩展为真正的私信功能
      // this.$emit('open-private-message', {
      //   recipient: this.story.user,
      //   story: this.story
      // })
    },
    
    likeComment(comment) {
      comment.isLiked = !comment.isLiked
      if (comment.isLiked) {
        comment.likes = (comment.likes || 0) + 1
      } else {
        comment.likes = Math.max(0, (comment.likes || 0) - 1)
      }
    },
    
    replyToComment(comment) {
      this.newComment = `@${comment.user?.name || '匿名用户'} `
    },
    
    submitComment() {
      if (!this.newComment.trim()) return
      
      const comment = {
        id: Date.now(),
        user: {
          name: this.currentUser?.display_name || '匿名用户',
          avatar_url: this.currentUser?.avatar_url
        },
        content: this.newComment.trim(),
        created_at: new Date().toISOString(),
        likes: 0,
        isLiked: false,
        replies: []
      }
      
      this.comments.unshift(comment)
      this.newComment = ''
    },
    
    insertEmoji(emoji) {
      this.newComment += emoji
    },
    
    generateMockComments() {
      return [
        {
          id: 1,
          user: { name: '小红薯', avatar_url: null },
          content: '哇！这个地方看起来好棒呀，是哪个城市呢？',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: 12,
          isLiked: false,
          replies: [
            {
              id: 11,
              user: { name: '旅行达人', avatar_url: null },
              content: '看起来像是在杭州，风景很美！',
              created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              likes: 5
            }
          ]
        },
        {
          id: 2,
          user: { name: '美食爱好者', avatar_url: null },
          content: '楼主拍照技术真好，求同款相机参数！',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          likes: 8,
          isLiked: false,
          replies: []
        },
        {
          id: 3,
          user: { name: '生活记录者', avatar_url: null },
          content: '这个时间点去人应该不多吧？体验怎么样？',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          likes: 3,
          isLiked: false,
          replies: []
        }
      ]
    },
    
    generateRecommendations() {
      return [
        { id: 1, title: '周末咖啡探店日记', image: 'https://picsum.photos/200/150?random=1', likes: 234, comments: 45 },
        { id: 2, title: '城市夜景拍摄技巧', image: 'https://picsum.photos/200/150?random=2', likes: 567, comments: 89 },
        { id: 3, title: '小众旅行地推荐', image: 'https://picsum.photos/200/150?random=3', likes: 189, comments: 34 },
        { id: 4, title: '日常穿搭分享', image: 'https://picsum.photos/200/150?random=4', likes: 445, comments: 67 }
      ]
    },
    
    getStoryTypeName(type) {
      const types = {
        event: '故事',
        news: '新闻', 
        other: '其他'
      }
      return types[type] || '故事'
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return '今天'
      } else if (diffDays === 2) {
        return '昨天' 
      } else if (diffDays <= 7) {
        return `${diffDays - 1}天前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    },
    
    formatCommentTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffMinutes < 1) return '刚刚'
      if (diffMinutes < 60) return `${diffMinutes}分钟前`
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}小时前`
      return this.formatTime(timestamp)
    },
    
    formatLocation(location) {
      if (!location) return '未知位置'
      return this.getDetailedLocation(location.lat, location.lng)
    },
    
    async getDetailedLocation(lat, lng) {
      // 如果已经有详细的地址信息，直接返回
      if (this.story?.address) {
        return this.story.address
      }
      
      // 使用Nominatim反向地理编码服务获取地址
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN&zoom=10&addressdetails=1`)
        const data = await response.json()
        
        if (data && data.display_name) {
          // 移除postcode并重新组合地址
          let displayName = data.display_name
          if (data.address && data.address.postcode) {
            // 从完整地址中移除postcode
            displayName = displayName.replace(new RegExp(`,?\\s*${data.address.postcode},?`), '').replace(/,\s*$/, '')
          }
          
          // 缓存地址信息到故事对象中
          if (this.story) {
            this.story.address = displayName
          }
          return displayName
        }
      } catch (error) {
        console.log('获取地址失败:', error)
      }
      
      // 如果反向地理编码失败，返回城市信息
      return await this.getCityName(lat, lng) || `${lat.toFixed(3)}, ${lng.toFixed(3)}`
    },
    
    async getCityName(lat, lng) {
      try {
        // 尝试获取城市信息
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN&zoom=10&addressdetails=1`)
        const data = await response.json()
        
        if (data && data.address) {
          const { city, town, village, county, state } = data.address
          const locationParts = []
          
          if (city) locationParts.push(city)
          else if (town) locationParts.push(town)
          else if (village) locationParts.push(village)
          if (county) locationParts.push(county)
          if (state && !locationParts.includes(state)) locationParts.push(state)
          
          return locationParts.join('·')
        }
      } catch (error) {
        console.log('获取城市信息失败:', error)
      }
      
      return null
    }
  }
}
</script>

<style scoped>
.xiaohongshu-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5000;
  overflow: hidden;
  padding-left: 100px;
}

.xiaohongshu-main {
  background: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1200px;
  height: 90vh;
  display: flex;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 20px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

/* 左侧内容区 */
.content-area {
  flex: 2;
  padding: 30px 40px;
  overflow-y: auto;
  border-right: 1px solid #f0f0f0;
  max-width: 650px;
}

/* 作者信息 */
.author-section {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.author-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: white;
  margin-right: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-info {
  flex: 1;
}

.author-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.post-time {
  font-size: 14px;
  color: #999;
}

.follow-btn {
  background: #ff2e4d;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.follow-btn:hover {
  background: #e60012;
  transform: scale(1.05);
}

/* 标题 */
.story-title {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1.4;
  margin-bottom: 20px;
}

/* 内容 */
.story-content {
  margin-bottom: 24px;
}

.story-text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
  text-align: justify;
}

/* 标签 */
.tags-section {
  margin-bottom: 24px;
}

.tag {
  display: inline-block;
  background: #fff2f0;
  color: #ff2e4d;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
  margin-bottom: 8px;
}

/* 图片区域 */
.image-gallery {
  margin-bottom: 24px;
  text-align: center;
}

.main-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.main-image:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

/* 位置 */
.location-section {
  margin-bottom: 24px;
  font-size: 14px;
  color: #666;
}

/* 统计 */
.stats-section {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item .count {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.stat-item .label {
  font-size: 12px;
  color: #999;
}

/* 分享栏 */
.share-section {
  display: flex;
  gap: 0;
  margin-bottom: 40px;
  padding-bottom: 20px;
}

.share-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 13px;
  color: #666;
}

.share-btn:hover {
  background: #f8f8f8;
}

.share-btn .icon {
  font-size: 16px;
}

.like-btn:hover {
  color: #ff2e4d;
}

.favorite-btn:hover {
  color: #ffa940;
}

.message-btn:hover {
  color: #667eea;
}

/* 评论区 */
.comments-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 24px;
  margin-bottom: 30px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.comments-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.sort-select {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #666;
}

.comment-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  flex-shrink: 0;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
}

.comment-user {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.comment-time {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  gap: 16px;
}

.comment-action {
  background: none;
  border: none;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  padding: 4px 0;
}

.comment-action:hover {
  color: #333;
}

.like-comment {
  color: #ff2e4d;
}

/* 子评论 */
.replies-section {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 2px solid #f0f0f0;
}

.reply-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.reply-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  flex-shrink: 0;
}

.reply-content {
  flex: 1;
}

.reply-user {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.reply-time {
  font-size: 11px;
  color: #999;
  margin-left: 8px;
}

.reply-text {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

/* 评论输入区 */
.comment-input-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.comment-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.comment-input-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.comment-input-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.comment-input {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  font-family: inherit;
}

.comment-input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-comment-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  align-self: flex-end;
}

.submit-comment-btn:hover {
  background: #5a67d8;
}

.submit-comment-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.emoji-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.emoji-btn {
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.emoji-btn:hover {
  background: #f0f0f0;
}

/* 右侧边栏 */
.sidebar {
  flex: 1;
  padding: 30px 20px;
  background: #fafafa;
  overflow-y: auto;
  min-width: 300px;
}

.recommend-section, .topic-section {
  margin-bottom: 40px;
}

.recommend-section h4, .topic-section h4 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommend-item {
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.recommend-item:hover {
  transform: translateY(-2px);
}

.recommend-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.recommend-info {
  flex: 1;
}

.recommend-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recommend-stats {
  font-size: 12px;
  color: #999;
  display: flex;
  gap: 12px;
}

.topic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-tag {
  background: #fff;
  border: 1px solid #e0e0e0;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
  cursor: pointer;
}

.topic-tag:hover {
  background: #f0f0f0;
  color: #333;
  border-color: #667eea;
}



/* 滚动条样式 */
.content-area::-webkit-scrollbar,
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.content-area::-webkit-scrollbar-track,
.sidebar::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.content-area::-webkit-scrollbar-thumb,
.sidebar::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.content-area::-webkit-scrollbar-thumb:hover,
.sidebar::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>