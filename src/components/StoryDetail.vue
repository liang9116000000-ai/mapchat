<template>
  <div class="xiaohongshu-container">
    <div class="xiaohongshu-main">
      <!-- 左侧内容区 -->
      <div class="content-area">
        <!-- 作者信息 -->
        <div class="author-section">
          <div class="author-avatar">
            <img v-if="story.user?.avatar_url" :src="story.user.avatar_url" :alt="story.user?.display_name" />
            <span v-else>{{ (story.user?.display_name || '匿名').charAt(0).toUpperCase() }}</span>
          </div>
          <div class="author-info">
            <div class="author-name">{{ story.user?.display_name || '匿名用户' }}</div>
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
          <div v-if="recommendations.length === 0" class="no-recommendations">
            暂无推荐内容
          </div>
          <div v-else class="recommend-list">
            <div v-for="item in recommendations" :key="item.id" class="recommend-item">
              <img v-if="item.image" :src="item.image" class="recommend-image" />
              <div v-else class="recommend-image-placeholder">📖</div>
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

          <!-- 加载状态 -->
          <div v-if="loading.comments" class="loading-container">
            <div class="loading-spinner"></div>
            <span>加载评论中...</span>
          </div>

          <!-- 评论列表 -->
          <div v-else class="comments-list">
            <!-- 无评论提示 -->
            <div v-if="comments.length === 0" class="no-comments">
              <span>📝</span>
              <p>暂无评论，快来发表第一条评论吧~</p>
            </div>
            
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-item">
              <div class="comment-avatar">
                <img v-if="comment.user?.avatar_url" :src="comment.user.avatar_url" />
                <span v-else>{{ (comment.user?.display_name || '匿名').charAt(0) }}</span>
              </div>
              <div class="comment-content">
                <div class="comment-user">
                  {{ comment.user?.display_name || '匿名用户' }}
                  <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                </div>
                <div class="comment-text">{{ comment.content }}</div>
                <div class="comment-actions">
                  <button
                    class="comment-action like-comment"
                    :class="{ 'liked': comment.isLiked }"
                    @click="likeComment(comment)"
                    @mousedown="showCommentLikers(comment)"
                  >
                    {{ comment.isLiked ? '❤️' : '🤍' }} {{ comment.likes || 0 }}
                  </button>
                  <button class="comment-action reply-comment" @click="replyToComment(comment)">
                    回复
                  </button>
                </div>

                <!-- 点赞用户列表 -->
                <div v-if="showLikers === comment.id" class="likers-list">
                  <div class="likers-header">
                    <span>点赞用户</span>
                    <button class="close-likers" @click="hideLikers">×</button>
                  </div>
                  <div class="likers-content">
                    <div v-if="likersList.length === 0" class="no-likers">暂无点赞</div>
                    <div v-else class="liker-item" v-for="liker in likersList" :key="liker.user_id">
                      <div class="liker-avatar">
                        <span>{{ liker.display_name ? liker.display_name.charAt(0).toUpperCase() : '匿' }}</span>
                      </div>
                      <span class="liker-name">{{ liker.display_name || '匿名用户' }}</span>
                      <span class="liker-time">{{ formatCommentTime(liker.created_at) }}</span>
                    </div>
                  </div>
                </div>

                <!-- 子评论 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <div class="reply-avatar">
                      <img v-if="reply.user?.avatar_url" :src="reply.user.avatar_url" />
                      <span v-else>{{ (reply.user?.display_name || '匿名').charAt(0) }}</span>
                    </div>
                    <div class="reply-content">
                      <div class="reply-user">
                        {{ reply.user?.display_name || '匿名用户' }}
                        <span class="reply-time">{{ formatCommentTime(reply.created_at) }}</span>
                      </div>
                      <div class="reply-text">@{{ comment.user?.display_name }} {{ reply.content }}</div>
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
                <span v-else>{{ (user?.display_name || '我').charAt(0).toUpperCase() }}</span>
              </div>
              <textarea
                class="comment-input"
                v-model="newComment"
                placeholder="发表你的评论..."
                rows="2"
                @keydown.ctrl.enter="submitComment"
              ></textarea>
              <button
                class="submit-comment-btn"
                @click="submitComment"
                :disabled="!newComment.trim() || loading.submittingComment"
              >
                {{ loading.submittingComment ? '发送中...' : '发送' }}
              </button>
            </div>
            <div class="emoji-toolbar">
              <span class="emoji-btn" v-for="emoji in commonEmojis" :key="emoji" @click="insertEmoji(emoji)">
                {{ emoji }}
              </span>
            </div>
          </div>
        </div>



        <!-- 附近群聊 -->
        <div class="chat-section" v-if="!showChatRoom">
          <h4>附近群聊</h4>

          <!-- 加载状态 -->
          <div v-if="loading.groups" class="loading-container">
            <div class="loading-spinner"></div>
            <span>加载群组中...</span>
          </div>

          <div v-else class="groups-list">
            <div v-for="group in nearbyGroups" :key="group.id" class="group-item" @click="enterGroupChat(group)">
              <div class="group-avatar" :style="{ background: getGroupAvatarColor(group.name) }">
                <img v-if="group.avatar" :src="group.avatar" />
                <span v-else>{{ group.name.charAt(0) }}</span>
              </div>
              <div class="group-info">
                <div class="group-name">{{ group.name }}</div>
                <div class="group-desc">{{ group.description }}</div>
                <div class="group-stats">
                  <span class="member-count">{{ group.memberCount }}人</span>
                  <span class="activity">{{ group.lastActivity }}</span>
                </div>
              </div>
              <button class="join-btn" :class="{ 'joined': group.joined }" @click.stop="joinGroup(group)">
                {{ group.joined ? '已加入' : '加入' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 群组聊天室 -->
        <div class="chat-section" v-if="showChatRoom">
          <div class="chat-room-header">
            <button class="back-btn" @click="exitChatRoom">← 返回</button>
            <h4>{{ selectedGroup?.name }}</h4>
            <span class="group-member-count">{{ selectedGroup?.memberCount }}人</span>
          </div>
          <div class="chat-container">
            <div class="chat-messages" ref="chatMessages">
              <div v-for="message in chatMessages" :key="message.id" class="message-item">
                <div class="message-avatar" :style="{ background: getAvatarColor(message.user?.display_name || '匿名') }">
                  <img v-if="message.user_avatar" :src="message.user_avatar" />
                  <span v-else>{{ (message.user_name || '匿名').charAt(0) }}</span>
                </div>
                <div class="message-content">
                  <div class="message-user">
                    {{ message.user_name || '匿名用户' }}
                    <span class="message-time">{{ formatChatTime(message.created_at) }}</span>
                  </div>
                  <div class="message-text">{{ message.content }}</div>
                </div>
              </div>
            </div>
            
            <div class="chat-input">
              <input 
                v-model="newChatMessage"
                @keyup.enter="sendChatMessage"
                placeholder="说点什么..."
                class="chat-input-field"
              />
              <button 
                @click="sendChatMessage" 
                :disabled="!newChatMessage.trim()"
                class="send-btn"
              >
                发送
              </button>
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
import { dbServiceSimple } from '../utils/database-simple.js'
import { supabase } from '../supabase.js'

// 全局缓存对象
const DATA_CACHE = {
  comments: {}, // { storyId: comments }
  groups: [], // nearby groups
  groupsTimestamp: 0 // groups cache timestamp
}

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
      comments: [],
      commonEmojis: ['😊', '😍', '🤔', '😂', '❤️', '👍', '🎉', '🔥'],
      recommendations: [],
      hotTopics: ['美食探店', '日常穿搭', '旅行日记', '生活记录', '美妆分享', '学习笔记'],
      detailedAddress: '',
      nearbyGroups: [],
      selectedGroup: null,
      chatMessages: [],
      newChatMessage: '',
      showChatRoom: false,
      messageSubscription: null,
      commentSubscription: null,
      showLikers: null, // 显示点赞用户列表的评论ID
      likersList: [], // 点赞用户列表
      // 加载状态
      loading: {
        comments: false,
        groups: false,
        address: false,
        submittingComment: false
      }
    }
  },
  
  async mounted() {
    console.log('StoryDetail mounted, story id:', this.story?.id)

    // 初始化数据
    await this.initializeData()
  },

  beforeUnmount() {
    console.log('StoryDetail beforeUnmount')

    // 组件卸载时取消订阅并重置状态
    if (this.messageSubscription) {
      dbServiceSimple.unsubscribe(this.messageSubscription)
      this.messageSubscription = null
    }
    if (this.commentSubscription) {
      dbServiceSimple.unsubscribe(this.commentSubscription)
      this.commentSubscription = null
    }
  },

  watch: {
    'story.id': {
      immediate: true,
      async handler(newId, oldId) {
        console.log('StoryDetail watch: story.id 变化', { newId, oldId })
        if (newId && newId !== oldId) {
          await this.initializeData()
        }
      }
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
    async initializeData() {
      console.log('初始化故事详情数据, story id:', this.story?.id, 'type:', typeof this.story?.id)

      // 重置数据状态
      this.showChatRoom = false
      this.selectedGroup = null
      this.chatMessages = []

      // 清除评论缓存，强制从数据库重新加载
      const cacheKey = String(this.story?.id)
      console.log('清除缓存 key:', cacheKey)
      delete DATA_CACHE.comments[cacheKey]

      // 异步加载详细地址
      if (this.story?.location) {
        this.loading.address = true
        try {
          this.detailedAddress = await this.getDetailedLocation(
            this.story.location.lat,
            this.story.location.lng
          )
        } finally {
          this.loading.address = false
        }
      }

      // 异步加载评论（强制从数据库）
      console.log('开始加载评论...')
      await this.loadComments(true) // 传入 true 强制重新加载
      console.log('评论加载完成, 数量:', this.comments.length)

      // 异步加载附近群组（使用缓存）
      console.log('开始加载附近群组...')
      await this.loadNearbyGroups()
      console.log('群组加载完成, 数量:', this.nearbyGroups.length)

      // 加载推荐内容
      await this.loadRecommendations()

      // 订阅评论变化
      if (this.story?.id) {
        this.subscribeToComments()
      }
    },

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
      alert(`正在给 ${this.story.user?.display_name || '匿名用户'} 发送私信...`)
      
      // 这里可以扩展为真正的私信功能
      // this.$emit('open-private-message', {
      //   recipient: this.story.user,
      //   story: this.story
      // })
    },

    async likeComment(comment) {
      if (!this.currentUser) {
        alert('请先登录后再点赞')
        return
      }

      try {
        let result
        if (comment.isLiked) {
          // 取消点赞
          result = await dbServiceSimple.removeCommentLike(comment.id, this.currentUser.id)
          if (result) {
            comment.isLiked = false
            comment.likes = result.likes
          }
        } else {
          // 添加点赞
          result = await dbServiceSimple.addCommentLike(comment.id, this.currentUser.id)
          if (result) {
            comment.isLiked = true
            comment.likes = result.likes
          }
        }
      } catch (error) {
        console.error('点赞失败:', error)
        alert('操作失败，请重试')
      }
    },

    async showCommentLikers(comment) {
      if (comment.likes === 0) {
        this.showLikers = null
        this.likersList = []
        return
      }

      try {
        const likers = await dbServiceSimple.getCommentLikers(comment.id)
        // 获取点赞用户的用户信息
        const userIds = likers.map(l => l.user_id).filter(Boolean)
        const userMap = await dbServiceSimple.getUsersByIds(userIds)
        // 合并用户信息
        this.likersList = likers.map(liker => ({
          ...liker,
          display_name: userMap[liker.user_id]?.display_name || null
        }))
        this.showLikers = comment.id
      } catch (error) {
        console.error('获取点赞用户失败:', error)
      }
    },

    hideLikers() {
      this.showLikers = null
      this.likersList = []
    },
    
    replyToComment(comment) {
      this.newComment = `@${comment.user?.display_name || '匿名用户'} `
    },

    async loadComments(forceReload = false) {
      try {
        const storyId = this.story?.id
        console.log('loadComments 开始, story id:', storyId, 'type:', typeof storyId, 'forceReload:', forceReload)

        if (!storyId) return

        // 检查缓存（使用字符串形式的key）
        const cacheKey = String(storyId)
        if (DATA_CACHE.comments[cacheKey] && !forceReload) {
          console.log('从缓存读取评论:', DATA_CACHE.comments[cacheKey].length, '条')
          this.comments = DATA_CACHE.comments[cacheKey]
          return
        }

        // 从数据库获取（显示加载状态）
        console.log('从数据库获取评论...')
        this.loading.comments = true
        try {
          const comments = await dbServiceSimple.getStoryComments(storyId)
          console.log('从数据库获取的评论:', comments)

          // 转换评论数据格式（数据库已返回用户信息）
          this.comments = comments.map(comment => ({
            id: comment.id,
            user: {
              name: comment.user?.display_name || '匿名用户',
              id: comment.user?.id || comment.user_id,
              display_name: comment.user?.display_name,
              avatar_url: comment.user?.avatar_url
            },
            content: comment.content,
            created_at: comment.created_at,
            likes: comment.likes || 0,
            isLiked: false,
            replies: (comment.replies || []).map(reply => ({
              id: reply.id,
              user: {
                name: reply.user?.display_name || '匿名用户',
                id: reply.user?.id || reply.user_id,
                display_name: reply.user?.display_name,
                avatar_url: reply.user?.avatar_url
              },
              content: reply.content,
              created_at: reply.created_at,
              likes: reply.likes || 0,
              isLiked: false
            }))
          }))
          console.log('从数据库获取的评论:', this.comments)
        } finally {
          this.loading.comments = false
        }

        // 检查当前用户的点赞状态
        if (this.currentUser) {
          const allCommentIds = [
            ...this.comments.map(c => c.id),
            ...this.comments.flatMap(c => c.replies.map(r => r.id))
          ]
          const likedMap = await dbServiceSimple.batchCheckUserLikedComments(allCommentIds, this.currentUser.id)

          // 更新点赞状态
          this.comments.forEach(comment => {
            comment.isLiked = !!likedMap[comment.id]
            comment.replies.forEach(reply => {
              reply.isLiked = !!likedMap[reply.id]
            })
          })
        }

        // 存入缓存（使用字符串key）
        DATA_CACHE.comments[cacheKey] = this.comments
        console.log('评论已缓存, storyId:', storyId, '数量:', this.comments.length)
      } catch (error) {
        console.error('加载评论失败:', error)
        // 失败时使用模拟数据
        this.comments = this.generateMockComments()
      }
    },

    subscribeToComments() {
      if (this.commentSubscription) {
        dbServiceSimple.unsubscribe(this.commentSubscription)
      }

      this.commentSubscription = dbServiceSimple.subscribeToComments(this.story.id, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new
          // 获取新评论的用户信息
          const userMap = await dbServiceSimple.getUsersByIds([newComment.user_id])
          const userInfo = userMap[newComment.user_id]
          // 添加新评论到本地（避免重新加载）
          const formattedComment = {
            id: newComment.id,
            user: {
              name: userInfo?.display_name || '匿名用户',
              id: newComment.user_id,
              display_name: userInfo?.display_name,
              avatar_url: userInfo?.avatar_url
            },
            content: newComment.content,
            created_at: newComment.created_at,
            likes: newComment.likes || 0,
            isLiked: false,
            replies: []
          }

          // 避免重复添加自己发送的评论
          const isOwnComment = newComment.user_id === this.currentUser?.id
          if (!isOwnComment) {
            this.comments.unshift(formattedComment)
            // 更新缓存
            if (this.story?.id) {
              DATA_CACHE.comments[String(this.story.id)] = this.comments
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          this.comments = this.comments.filter(c => c.id !== deletedId)
          // 更新缓存
          if (this.story?.id) {
            DATA_CACHE.comments[String(this.story.id)] = this.comments
          }
        }
      })
    },

    async submitComment() {
      if (!this.newComment.trim() || !this.currentUser) {
        if (!this.currentUser) {
          alert('请先登录后再评论')
        }
        return
      }

      this.loading.submittingComment = true
      try {
        const comment = await dbServiceSimple.addComment(
          this.story.id,
          this.currentUser.id,
          this.newComment.trim()
        )

        if (comment) {
          // 本地添加评论
          this.comments.unshift({
            id: comment.id,
            user: {
              name: this.currentUser?.display_name || '匿名用户',
              id: this.currentUser.id,
              display_name: this.currentUser?.display_name,
              avatar_url: this.currentUser?.avatar_url
            },
            content: comment.content,
            created_at: comment.created_at,
            likes: 0,
            isLiked: false,
            replies: []
          })
          this.newComment = ''

          // 更新缓存（使用字符串key）
          if (this.story?.id) {
            DATA_CACHE.comments[String(this.story.id)] = this.comments
            console.log('提交评论后更新缓存')
          }
        }
      } catch (error) {
        console.error('提交评论失败:', error)
        alert('评论失败，请重试')
      } finally {
        this.loading.submittingComment = false
      }
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
    
    async loadRecommendations() {
      try {
        // 从数据库获取推荐故事（排除当前故事）
        const allEvents = await dbServiceSimple.getAllEvents()
        this.recommendations = allEvents
          .filter(event => event.id !== this.story?.id)
          .slice(0, 4)
          .map(event => ({
            id: event.id,
            title: event.title,
            image: event.image || null,
            likes: event.likes || 0,
            comments: event.comments_count || 0
          }))
      } catch (error) {
        console.error('加载推荐内容失败:', error)
        this.recommendations = []
      }
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
    },

    // ==================== 聊天相关方法 ====================
    
    async loadNearbyGroups() {
      try {
        console.log('loadNearbyGroups 开始, location:', this.story?.location)

        // 检查缓存（5分钟有效期）
        const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟
        const now = Date.now()

        if (DATA_CACHE.groups.length > 0 && (now - DATA_CACHE.groupsTimestamp) < CACHE_EXPIRY) {
          console.log('从缓存读取群组:', DATA_CACHE.groups.length, '个, 距上次加载:', Math.floor((now - DATA_CACHE.groupsTimestamp) / 1000), '秒')
          this.nearbyGroups = DATA_CACHE.groups

          // 检查当前用户已加入的群组
          await this.checkJoinedGroups()
          return
        }

        // 从数据库获取（显示加载状态）
        this.loading.groups = true
        try {
          if (this.story?.location) {
            console.log('从数据库获取群组...')
            this.nearbyGroups = await dbServiceSimple.getNearbyGroups(
              this.story.location.lat,
              this.story.location.lng
            )
            console.log('从数据库获取的群组:', this.nearbyGroups)

            // 检查当前用户已加入的群组
            await this.checkJoinedGroups()
          } else {
            // 如果没有位置信息，使用模拟数据
            console.log('没有位置信息，使用模拟群组数据')
            this.nearbyGroups = this.generateMockGroups()
          }
        } finally {
          this.loading.groups = false
        }

        // 检查当前用户已加入的群组
        await this.checkJoinedGroups()

        // 存入缓存
        DATA_CACHE.groups = this.nearbyGroups
        DATA_CACHE.groupsTimestamp = now
        console.log('群组已缓存, 数量:', this.nearbyGroups.length)

        console.log('群组数据加载完成, 共:', this.nearbyGroups.length, '个群组')
      } catch (error) {
        console.error('加载附近群组失败:', error)
        this.nearbyGroups = this.generateMockGroups() // 备用模拟数据
        console.log('使用备用模拟群组数据, 共:', this.nearbyGroups.length, '个群组')
      }
    },
    
    generateMockGroups() {
      return [
        {
          id: 1,
          name: '附近美食分享',
          description: '分享身边的美食，一起探店',
          avatar: 'https://picsum.photos/50/50?random=food',
          memberCount: 234,
          lastActivity: '2分钟前',
          joined: false
        },
        {
          id: 2,
          name: '本地跑步团',
          description: '晨跑夜跑，健康生活',
          avatar: 'https://picsum.photos/50/50?random=run',
          memberCount: 89,
          lastActivity: '15分钟前',
          joined: false
        },
        {
          id: 3,
          name: '宠物交流群',
          description: '分享养宠心得，线下聚会',
          avatar: 'https://picsum.photos/50/50?random=pet',
          memberCount: 156,
          lastActivity: '1小时前',
          joined: true
        },
        {
          id: 4,
          name: '周末活动组',
          description: '组织周末出游、聚会活动',
          avatar: 'https://picsum.photos/50/50?random=weekend',
          memberCount: 67,
          lastActivity: '3小时前',
          joined: false
        }
      ]
    },
    
    async joinGroup(group) {
      if (!this.currentUser) {
        alert('请先登录后再加入群组')
        return
      }
      
      try {
        if (!group.joined) {
          // 加入群组
          await dbServiceSimple.joinGroup(group.id, this.currentUser.id)
          group.joined = true
          group.memberCount += 1
          console.log('加入群组:', group.name)
        } else {
          // 退出群组
          await dbServiceSimple.leaveGroup(group.id, this.currentUser.id)
          group.joined = false
          group.memberCount -= 1
          console.log('退出群组:', group.name)
        }
      } catch (error) {
        console.error('群组操作失败:', error)
        alert('操作失败，请重试')
      }
    },
    
    async checkJoinedGroups() {
      if (!this.currentUser) return
      
      try {
        // 检查每个群组的加入状态
        const groupIds = this.nearbyGroups.map(g => g.id)
        const joinedGroupIds = await dbServiceSimple.checkUserGroupMembership(
          this.currentUser.id,
          groupIds
        )
        
        // 更新群组的加入状态
        this.nearbyGroups.forEach(group => {
          group.joined = joinedGroupIds.includes(group.id)
        })
      } catch (error) {
        console.error('检查群组状态失败:', error)
      }
    },
    
    enterGroupChat(group) {
      if (!group.joined) {
        // 如果未加入，先自动加入
        group.joined = true
        group.memberCount += 1
      }
      
      this.selectedGroup = group
      this.showChatRoom = true
      this.loadGroupChatMessages(group)
    },
    
    exitChatRoom() {
      this.showChatRoom = false
      this.selectedGroup = null
      this.chatMessages = []
      this.newChatMessage = ''

      // 取消消息订阅
      if (this.messageSubscription) {
        dbServiceSimple.unsubscribe(this.messageSubscription)
        this.messageSubscription = null
      }
    },
    
    async loadGroupChatMessages(group) {
      try {
        // 从数据库加载真实消息
        this.chatMessages = await dbServiceSimple.getGroupMessages(group.id)
        
        // 如果没有消息，添加欢迎消息
        if (this.chatMessages.length === 0) {
          this.chatMessages = [{
            id: 'welcome',
            user_name: '系统',
            user_avatar: null,
            content: `欢迎加入${group.name}！开始聊天吧～`,
            created_at: new Date().toISOString(),
            isSystem: true
          }]
        }
        
        this.scrollToBottom()
        
        // 订阅实时消息
        this.subscribeToMessages(group.id)
      } catch (error) {
        console.error('加载群组消息失败:', error)
        // 备用模拟数据
        this.chatMessages = this.generateMockGroupMessages(group)
        this.scrollToBottom()
      }
    },
    
    subscribeToMessages(groupId) {
      // 取消之前的订阅
      if (this.messageSubscription) {
        console.log('取消之前的订阅')
        dbServiceSimple.unsubscribe(this.messageSubscription)
      }

      // 订阅新消息
      this.messageSubscription = dbServiceSimple.subscribeToGroupMessages(groupId, async (payload) => {
        console.log('订阅回调触发:', payload)

        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new
          console.log('新消息详情:', newMessage)

          // 避免重复添加自己发送的消息
          const isOwnMessage = newMessage.user_id === this.currentUser?.id
          console.log('是否自己的消息:', isOwnMessage)

          if (!isOwnMessage) {
            // 通过user_id从users表获取用户名，不使用消息中存储的user_name
            const userProfile = await dbServiceSimple.getUserProfile(newMessage.user_id)
            newMessage.user_name = userProfile?.display_name || '匿名用户'
            newMessage.user_avatar = userProfile?.avatar_url || null

            console.log('添加新消息到列表:', newMessage)
            this.chatMessages.push(newMessage)
            this.scrollToBottom()
          }
        }
      })
    },
    
    generateMockGroupMessages(group) {
      const messages = {
        1: [ // 美食分享群
          { id: 1, user: { display_name: '美食达人', avatar_url: null }, content: '今天发现了一家超棒的日料店！', created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
          { id: 2, user: { display_name: '吃货小王', avatar_url: null }, content: '在哪里？地址分享一下呗', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
          { id: 3, user: { display_name: '美食达人', avatar_url: null }, content: '在市中心商场三楼，叫樱花小厨', created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
        ],
        2: [ // 本地跑步团
          { id: 1, user: { display_name: '跑步教练', avatar_url: null }, content: '明天早上6点公园集合，有人一起吗？', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
          { id: 2, user: { display_name: '晨跑爱好者', avatar_url: null }, content: '我参加！几点结束？', created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() }
        ],
        3: [ // 宠物交流群
          { id: 1, user: { display_name: '猫奴', avatar_url: null }, content: '我家猫咪今天学会握手了！', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
          { id: 2, user: { display_name: '铲屎官', avatar_url: null }, content: '好可爱！求教程', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
        ],
        4: [ // 周末活动组
          { id: 1, user: { display_name: '活动组织者', avatar_url: null }, content: '这周末有人想一起爬山吗？', created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
          { id: 2, user: { display_name: '户外爱好者', avatar_url: null }, content: '我想去！哪个山？', created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString() }
        ]
      }
      
      return messages[group.id] || []
    },
    
    async sendChatMessage() {
      console.log('sendChatMessage 被调用')
      console.log('newChatMessage:', this.newChatMessage)
      console.log('currentUser:', this.currentUser)
      console.log('selectedGroup:', this.selectedGroup)

      if (!this.newChatMessage.trim() || !this.currentUser) {
        console.log('验证失败: 没有消息或用户未登录')
        return
      }

      try {
        console.log('开始发送消息到数据库...')
        // 发送到数据库
        const message = await dbServiceSimple.sendSimpleGroupMessage(
          this.selectedGroup.id,
          this.currentUser.id,
          this.currentUser.display_name || '用户',
          this.currentUser.avatar_url,
          this.newChatMessage.trim()
        )

        console.log('数据库返回:', message)

        if (message) {
          this.chatMessages.push(message)
          this.newChatMessage = ''
          this.scrollToBottom()

          // 更新群组最后活动时间
          if (this.selectedGroup) {
            this.selectedGroup.lastActivity = '刚刚'
          }
        } else {
          console.error('数据库返回 null')
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        // 备用本地添加
        const localMessage = {
          id: Date.now(),
          user: {
            display_name: this.currentUser.display_name || '我',
            avatar_url: this.currentUser.avatar_url
          },
          content: this.newChatMessage.trim(),
          created_at: new Date().toISOString()
        }

        this.chatMessages.push(localMessage)
        this.newChatMessage = ''
        this.scrollToBottom()
      }
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatMessages) {
          this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight
        }
      })
    },
    
    formatChatTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMinutes = Math.floor((now - date) / (1000 * 60))
      
      if (diffMinutes < 1) return '刚刚'
      if (diffMinutes < 60) return `${diffMinutes}分钟前`
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}小时前`
      return this.formatTime(timestamp)
    },
    
    getAvatarColor(name) {
      // 根据用户名生成一致的颜色
      const colors = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)',
        'linear-gradient(135deg, #30cfd0, #330867)',
        'linear-gradient(135deg, #a8edea, #fed6e3)',
        'linear-gradient(135deg, #ff9a9e, #fecfef)',
        'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
        'linear-gradient(135deg, #fdcbf1, #e6dee9)'
      ]
      
      let hash = 0
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
      }
      
      return colors[Math.abs(hash) % colors.length]
    },
    
    getGroupAvatarColor(groupName) {
      // 为群组头像生成特定的颜色
      const groupColors = [
        'linear-gradient(135deg, #ff6b6b, #ff8e53)',
        'linear-gradient(135deg, #4ecdc4, #44a08d)',
        'linear-gradient(135deg, #6a11cb, #2575fc)',
        'linear-gradient(135deg, #f2994a, #f2c94c)',
        'linear-gradient(135deg, #89f7fe, #66a6ff)',
        'linear-gradient(135deg, #fddb92, #d1fdff)',
        'linear-gradient(135deg, #9890e3, #b1f4cf)',
        'linear-gradient(135deg, #ebc0fd, #d9ded8)'
      ]
      
      let hash = 0
      for (let i = 0; i < groupName.length; i++) {
        hash = groupName.charCodeAt(i) + ((hash << 5) - hash)
      }
      
      return groupColors[Math.abs(hash) % groupColors.length]
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

.no-comments {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-comments span {
  font-size: 40px;
  display: block;
  margin-bottom: 10px;
}

.no-comments p {
  margin: 0;
  font-size: 14px;
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

.like-comment.liked {
  color: #ff2e4d;
}

/* 点赞用户列表 */
.likers-list {
  margin-top: 12px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.likers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.likers-header span {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.close-likers {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.close-likers:hover {
  background: #e0e0e0;
  color: #333;
}

.likers-content {
  max-height: 200px;
  overflow-y: auto;
}

.no-likers {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.liker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.liker-item:hover {
  background: #fff;
}

.liker-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.liker-name {
  flex: 1;
  font-size: 12px;
  color: #333;
}

.liker-time {
  font-size: 11px;
  color: #999;
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

.recommend-section, .topic-section, .chat-section {
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

.recommend-image-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.no-recommendations {
  text-align: center;
  color: #999;
  padding: 20px;
  font-size: 14px;
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

/* 群组区域 */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-item:hover {
  background: #f8f8f8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  overflow: hidden;
}

.group-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-info {
  flex: 1;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.group-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.group-stats {
  display: flex;
  gap: 8px;
}

.member-count {
  font-size: 11px;
  color: #999;
}

.activity {
  font-size: 11px;
  color: #999;
}

.join-btn {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.join-btn:hover {
  background: #5a67d8;
}

.join-btn.joined {
  background: #f0f0f0;
  color: #666;
}

.join-btn.joined:hover {
  background: #e0e0e0;
}

/* 聊天室头部 */
.chat-room-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: #f0f0f0;
}

.chat-room-header h4 {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.group-member-count {
  font-size: 12px;
  color: #999;
}

/* 聊天区域 */
.chat-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
}

.message-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  overflow: hidden;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.message-content {
  flex: 1;
}

.message-user {
  font-size: 11px;
  color: #666;
  margin-bottom: 2px;
}

.message-time {
  font-size: 10px;
  color: #999;
  margin-left: 4px;
}

.message-text {
  font-size: 12px;
  color: #333;
  line-height: 1.4;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f8f8f8;
  border-top: 1px solid #e0e0e0;
}

.chat-input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  font-size: 12px;
  outline: none;
}

.chat-input-field:focus {
  border-color: #667eea;
}

.send-btn {
  padding: 6px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #666;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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

/* 群组区域 */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-item:hover {
  background: #f8f8f8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  overflow: hidden;
}

.group-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-info {
  flex: 1;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.group-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.group-stats {
  display: flex;
  gap: 8px;
}

.member-count {
  font-size: 11px;
  color: #999;
}

.activity {
  font-size: 11px;
  color: #999;
}

.join-btn {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.join-btn:hover {
  background: #5a67d8;
}

.join-btn.joined {
  background: #f0f0f0;
  color: #666;
}

.join-btn.joined:hover {
  background: #e0e0e0;
}

/* 聊天室头部 */
.chat-room-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 12px;
}

.back-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.back-btn:hover {
  background: #f0f0f0;
}

.chat-room-header h4 {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.group-member-count {
  font-size: 12px;
  color: #999;
}

/* 聊天区域 */
.chat-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
}

.message-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
  overflow: hidden;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.message-content {
  flex: 1;
}

.message-user {
  font-size: 11px;
  color: #666;
  margin-bottom: 2px;
}

.message-time {
  font-size: 10px;
  color: #999;
  margin-left: 4px;
}

.message-text {
  font-size: 12px;
  color: #333;
  line-height: 1.4;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f8f8f8;
  border-top: 1px solid #e0e0e0;
}

.chat-input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  font-size: 12px;
  outline: none;
}

.chat-input-field:focus {
  border-color: #667eea;
}

.send-btn {
  padding: 6px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #666;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>