import { supabase, TABLES } from '../supabase.js'

// 简化的数据库操作工具类
export class DatabaseServiceSimple {
  
  // 获取所有事件（简单版本）
  async getAllEvents() {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select('*')
        .order('timestamp', { ascending: false })
      
      if (error) {
        console.log('获取事件失败:', error)
        return []
      }
      
      // 为每个事件添加基本用户信息
      const eventsWithUsers = (data || []).map(event => ({
        ...event,
        user: event.user_id ? {
          id: event.user_id,
          display_name: '用户' + event.user_id.slice(-4),
          email: 'user@example.com'
        } : null
      }))
      
      return eventsWithUsers
    } catch (error) {
      console.error('获取事件失败:', error)
      return []
    }
  }

  // 添加新事件
  async addEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .insert([{
          title: eventData.title,
          description: eventData.description,
          type: eventData.type || 'other',
          location: eventData.location,
          user_id: eventData.user_id,
          timestamp: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('添加事件失败:', error)
      return null
    }
  }

  // 删除事件
  async deleteEvent(eventId) {
    try {
      const { error } = await supabase
        .from(TABLES.EVENTS)
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('删除事件失败:', error)
      return false
    }
  }

  // 获取用户资料（简单版本）
  async getUserProfile(userId) {
    try {
      // 从users表获取用户信息（不包含email）
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', userId)
        .maybeSingle()
      
      if (userError && userError.code !== 'PGRST116') {
        console.log('从users表获取用户信息失败:', userError)
      }
      
      if (userData) {
        // 从auth获取邮箱
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.id === userId) {
          return {
            ...userData,
            email: user.email || ''
          }
        }
        return {
          ...userData,
          email: ''
        }
      }
      
      // 如果users表中没有数据，返回基于auth用户的信息
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.id === userId) {
        return {
          id: userId,
          email: user.email || '',
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '用户',
          avatar_url: user.user_metadata?.avatar_url || null
        }
      }
      
      // 最后的后备方案
      return {
        id: userId,
        email: '',
        display_name: '用户' + userId.slice(-4),
        avatar_url: null
      }
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return {
        id: userId,
        email: '',
        display_name: '用户' + userId.slice(-4),
        avatar_url: null
      }
    }
  }

  // 获取附近群组
  async getNearbyGroups(lat, lng, radius = 10) {
    try {
      const { data, error } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .order('member_count', { ascending: false })
      
      if (error) {
        console.log('获取群组失败:', error)
        return []
      }
      
      // 转换数据格式以匹配前端期望
      const groups = (data || []).map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
        memberCount: group.member_count,
        lastActivity: this.formatRelativeTime(group.updated_at || group.created_at),
        joined: false // 默认未加入，后续会检查
      }))
      
      return groups
    } catch (error) {
      console.error('获取附近群组失败:', error)
      // 返回一些默认群组数据
      return [
        {
          id: 'default1',
          name: '附近美食分享',
          description: '分享身边的美食，一起探店',
          avatar: null,
          memberCount: 234,
          lastActivity: '2分钟前',
          joined: false
        }
      ]
    }
  }

  // 创建群组
  async createGroup(groupData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.GROUPS)
        .insert([{
          name: groupData.name,
          description: groupData.description,
          avatar: groupData.avatar,
          member_count: 1,
          creator_id: groupData.creator_id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('创建群组失败:', error)
      return null
    }
  }

  // 加入群组
  async joinGroup(groupId, userId) {
    try {
      // 先检查是否已加入
      const { data: existingMembership, error: checkError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single()
      
      if (existingMembership && !checkError) {
        return existingMembership // 已加入
      }
      
      // 添加群组成员关系
      const { data, error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          role: 'member',
          joined_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      
      // 更新群组成员数量
      await supabase
        .from(TABLES.GROUPS)
        .update({ member_count: supabase.raw('member_count + 1') })
        .eq('id', groupId)
      
      return data
    } catch (error) {
      console.error('加入群组失败:', error)
      return null
    }
  }

  // 检查用户是否已加入群组
  async checkUserGroupMembership(userId, groupIds) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .in('group_id', groupIds)
      
      if (error) throw error
      
      return (data || []).map(membership => membership.group_id)
    } catch (error) {
      console.error('检查群组成员关系失败:', error)
      return []
    }
  }

  // 获取群组聊天消息
  async getGroupMessages(groupId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.log('获取群组消息失败:', error)
        return []
      }
      
      // 转换数据格式
      return (data || []).map(message => ({
        id: message.id,
        user_id: message.user_id,
        user_name: message.user_id, // 暂时用user_id作为用户名
        user_avatar: null,
        content: message.content,
        created_at: message.created_at
      }))
    } catch (error) {
      console.error('获取群组消息失败:', error)
      return []
    }
  }

  // 发送群组消息
  async sendGroupMessage(groupId, userId, content) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .insert([{
          group_id: groupId,
          user_id: userId,
          content: content,
          message_type: 'text',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('发送消息失败:', error)
      return null
    }
  }

  // 简化的发送消息（带用户名和头像）
  async sendSimpleGroupMessage(groupId, userId, userName, userAvatar, content) {
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .insert([{
          group_id: groupId,
          user_id: userId,
          content: content,
          message_type: 'text',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      
      // 添加用户信息到返回数据
      return {
        ...data,
        user_name: userName,
        user_avatar: userAvatar
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      return null
    }
  }

  // 监听事件变化（实时同步）
  subscribeToEvents(callback) {
    return supabase
      .channel('events-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLES.EVENTS }, 
        callback
      )
      .subscribe()
  }

  // 监听群组消息
  subscribeToGroupMessages(groupId, callback) {
    return supabase
      .channel(`group-${groupId}-messages`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.MESSAGES,
          filter: `group_id=eq.${groupId}`
        }, 
        callback
      )
      .subscribe()
  }

  // 退出群组
  async leaveGroup(groupId, userId) {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
      
      if (error) throw error
      
      // 更新群组成员数量
      await supabase
        .from(TABLES.GROUPS)
        .update({ member_count: supabase.raw('member_count - 1') })
        .eq('id', groupId)
      
      return true
    } catch (error) {
      console.error('退出群组失败:', error)
      return false
    }
  }

  // 取消订阅
  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription)
    }
  }

  // 格式化相对时间
  formatRelativeTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffMinutes < 5) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}小时前`
    return `${Math.floor(diffMinutes / 1440)}天前`
  }
}

// 创建单例实例
export const dbServiceSimple = new DatabaseServiceSimple()