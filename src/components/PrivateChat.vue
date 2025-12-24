<template>
  <div class="private-chat">
    <!-- 会话列表 -->
    <div class="chat-sidebar" v-if="!currentChat">
      <div class="sidebar-header">
        <h3>私信</h3>
      </div>
      <div class="conversation-list" v-if="conversations.length > 0">
        <div 
          v-for="conv in conversations" 
          :key="conv.id" 
          class="conversation-item"
          @click="openChat(conv)"
        >
          <div class="conv-avatar">
            <img v-if="conv.other_user?.avatar_url" :src="conv.other_user.avatar_url" />
            <span v-else>{{ (conv.other_user?.display_name || '匿名').charAt(0) }}</span>
          </div>
          <div class="conv-info">
            <div class="conv-header">
              <span class="conv-name">{{ conv.other_user?.display_name || '匿名用户' }}</span>
              <span class="conv-time">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <p class="conv-preview">{{ conv.last_message || '暂无消息' }}</p>
          </div>
          <div class="conv-badge" v-if="conv.unread_count > 0">{{ conv.unread_count }}</div>
        </div>
      </div>
      <div class="empty-conversations" v-else>
        <span class="empty-icon">💬</span>
        <p>暂无私信</p>
      </div>
    </div>

    <!-- 聊天界面 -->
    <div class="chat-main" v-if="currentChat">
      <div class="chat-header">
        <button class="back-btn" @click="currentChat = null">←</button>
        <div class="chat-user-info">
          <div class="chat-avatar">
            <img v-if="currentChat.other_user?.avatar_url" :src="currentChat.other_user.avatar_url" />
            <span v-else>{{ (currentChat.other_user?.display_name || '匿名').charAt(0) }}</span>
          </div>
          <span class="chat-name">{{ currentChat.other_user?.display_name || '匿名用户' }}</span>
        </div>
      </div>
      
      <div class="chat-messages" ref="messagesContainer">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="message-item"
          :class="{ 'is-mine': msg.sender_id === user.id }"
        >
          <div class="message-avatar" v-if="msg.sender_id !== user.id">
            <img v-if="currentChat.other_user?.avatar_url" :src="currentChat.other_user.avatar_url" />
            <span v-else>{{ (currentChat.other_user?.display_name || '匿名').charAt(0) }}</span>
          </div>
          <div class="message-content">
            <p>{{ msg.content }}</p>
            <span class="message-time">{{ formatMessageTime(msg.created_at) }}</span>
          </div>
        </div>
      </div>
      
      <div class="chat-input">
        <input 
          v-model="newMessage" 
          placeholder="输入消息..." 
          @keyup.enter="sendMessage"
        />
        <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim()">发送</button>
      </div>
    </div>
  </div>
</template>

<script>
import { dbServiceSimple } from '../utils/database-simple.js'

export default {
  name: 'PrivateChat',
  props: {
    user: {
      type: Object,
      required: true
    },
    targetUser: {
      type: Object,
      default: null
    }
  },
  
  data() {
    return {
      conversations: [],
      currentChat: null,
      messages: [],
      newMessage: '',
      subscription: null
    }
  },
  
  async mounted() {
    await this.loadConversations()
    
    // 如果有目标用户，直接打开聊天
    if (this.targetUser) {
      await this.startChatWith(this.targetUser)
    }
  },
  
  watch: {
    async targetUser(newUser) {
      if (newUser) {
        await this.startChatWith(newUser)
      }
    }
  },
  
  beforeUnmount() {
    if (this.subscription) {
      dbServiceSimple.unsubscribe(this.subscription)
    }
  },
  
  methods: {
    async loadConversations() {
      this.conversations = await dbServiceSimple.getPrivateConversations(this.user.id)
    },
    
    async openChat(conv) {
      this.currentChat = conv
      await this.loadMessages()
      this.subscribeToMessages()
      
      // 标记已读
      await dbServiceSimple.markConversationRead(conv.id, this.user.id)
      conv.unread_count = 0
    },
    
    async startChatWith(targetUser) {
      // 查找或创建会话
      let conv = this.conversations.find(c => c.other_user?.id === targetUser.id)
      
      if (!conv) {
        conv = await dbServiceSimple.createPrivateConversation(this.user.id, targetUser.id)
        if (conv) {
          conv.other_user = targetUser
          this.conversations.unshift(conv)
        }
      }
      
      if (conv) {
        await this.openChat(conv)
      }
    },
    
    async loadMessages() {
      if (!this.currentChat) return
      this.messages = await dbServiceSimple.getPrivateMessages(this.currentChat.id)
      this.$nextTick(() => this.scrollToBottom())
    },
    
    subscribeToMessages() {
      if (this.subscription) {
        dbServiceSimple.unsubscribe(this.subscription)
      }
      
      this.subscription = dbServiceSimple.subscribeToPrivateMessages(
        this.currentChat.id,
        (payload) => {
          if (payload.new) {
            this.messages.push(payload.new)
            this.$nextTick(() => this.scrollToBottom())
          }
        }
      )
    },
    
    async sendMessage() {
      if (!this.newMessage.trim() || !this.currentChat) return
      
      const content = this.newMessage.trim()
      this.newMessage = ''
      
      const msg = await dbServiceSimple.sendPrivateMessage(
        this.currentChat.id,
        this.user.id,
        content
      )
      
      if (msg) {
        // 更新会话列表
        const conv = this.conversations.find(c => c.id === this.currentChat.id)
        if (conv) {
          conv.last_message = content
          conv.last_message_at = new Date().toISOString()
        }
      }
    },
    
    scrollToBottom() {
      const container = this.$refs.messagesContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      
      if (diffMins < 1) return '刚刚'
      if (diffMins < 60) return `${diffMins}分钟前`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
      return date.toLocaleDateString('zh-CN')
    },
    
    formatMessageTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  }
}
</script>

<style scoped>
.private-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  cursor: pointer;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f9f9f9;
}

.conv-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  margin-right: 12px;
  overflow: hidden;
}

.conv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conv-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.conv-time {
  font-size: 12px;
  color: #999;
}

.conv-preview {
  margin: 0;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-badge {
  min-width: 20px;
  height: 20px;
  background: #ff2442;
  color: white;
  border-radius: 10px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  margin-left: 8px;
}

.empty-conversations {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* 聊天界面 */
.chat-main {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background: #fff;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 4px 12px 4px 0;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
}

.message-item.is-mine {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c44569);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  margin-right: 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-item.is-mine .message-avatar {
  margin-right: 0;
  margin-left: 10px;
}

.message-content {
  max-width: 70%;
}

.message-content p {
  margin: 0;
  padding: 10px 14px;
  background: #fff;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.message-item.is-mine .message-content p {
  background: linear-gradient(135deg, #ff6b9d, #ff2442);
  color: white;
}

.message-time {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.message-item.is-mine .message-time {
  text-align: left;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background: #fff;
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input input:focus {
  border-color: #ff2442;
}

.send-btn {
  padding: 0 24px;
  background: linear-gradient(135deg, #ff6b9d, #ff2442);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  opacity: 0.9;
}
</style>
