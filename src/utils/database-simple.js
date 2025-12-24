import { supabase, TABLES } from '../supabase.js'

// 简化的数据库操作工具类
export class DatabaseServiceSimple {
  
  // 上传图片到 Supabase Storage
  async uploadImage(file, userId) {
    try {
      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId || 'anonymous'}_${Date.now()}.${fileExt}`
      const filePath = `story-images/${fileName}`
      
      console.log('开始上传图片:', filePath)
      
      // 上传到 Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('上传图片失败:', error)
        throw error
      }
      
      // 获取公开访问 URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)
      
      console.log('图片上传成功，URL:', urlData.publicUrl)
      return urlData.publicUrl
      
    } catch (error) {
      console.error('上传图片失败:', error)
      return null
    }
  }
  
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

      // 获取所有唯一的用户ID
      const userIds = [...new Set((data || []).map(event => event.user_id).filter(Boolean))]

      // 批量获取用户信息并自动创建缺失的用户记录
      let userMap = {}
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', userIds)

        if (!usersError && users) {
          users.forEach(user => {
            userMap[user.id] = user
          })
        }
        
        // 找出缺失的用户ID并创建记录
        const missingUserIds = userIds.filter(id => !userMap[id])
        if (missingUserIds.length > 0) {
          const virtualUserMap = await this.createMissingUsers(missingUserIds)
          
          // 如果成功创建了虚拟用户映射，合并到userMap
          Object.assign(userMap, virtualUserMap)
          
          // 尝试重新获取真实创建的用户信息
          const { data: newUsers, error: newUsersError } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .in('id', missingUserIds)
            
          if (!newUsersError && newUsers) {
            newUsers.forEach(user => {
              userMap[user.id] = user // 真实数据覆盖虚拟数据
            })
          }
        }
      }

      // 为每个事件添加用户信息，保留所有事件
      const eventsWithUsers = (data || []).map(event => {
        const userInfo = userMap[event.user_id]
        let displayName = '匿名用户'
        let userAvatar = null
        
        if (userInfo) {
          // 如果用户存在于用户表，使用真实信息
          displayName = userInfo.display_name || '匿名用户'
          userAvatar = userInfo.avatar_url
        } else if (event.user_id) {
          // 如果用户不存在于用户表，使用用户ID的简短显示
          displayName = `用户${event.user_id.substring(0, 6)}`
        }
        
        return {
          ...event,
          user: event.user_id ? {
            id: event.user_id,
            display_name: displayName,
            avatar_url: userAvatar
          } : null
        }
      })

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
          image: eventData.image || null,
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

  // 批量获取用户信息
  async getUsersByIds(userIds) {
    try {
      if (!userIds || userIds.length === 0) return {}

      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      if (error) throw error

      // 返回用户信息映射
      const userMap = {}
      ;(data || []).forEach(user => {
        userMap[user.id] = user
      })
      return userMap
    } catch (error) {
      console.error('批量获取用户信息失败:', error)
      return {}
    }
  }

  // 获取用户资料（纯数据库表方式，不存在的用户返回基本信息）
  async getUserProfile(userId) {
    try {
      // 完全从users表获取用户信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (userError && userError.code !== 'PGRST116') {
        console.log('从users表获取用户信息失败:', userError)
      }
      
      if (userData) {
        console.log(`从数据库获取用户: ${userData.id} -> ${userData.display_name}`)
        return {
          id: userData.id,
          display_name: userData.display_name || '匿名用户',
          avatar_url: userData.avatar_url || null,
          email: userData.email || '',
          created_at: userData.created_at
        }
      }
      
      // 如果users表中没有该用户，返回匿名用户
      console.log(`用户 ${userId} 不在数据库中，返回匿名用户`)
      return {
        id: userId,
        display_name: '匿名用户',
        avatar_url: null,
        email: '',
        created_at: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return {
        id: userId,
        display_name: '匿名用户',
        avatar_url: null,
        email: '',
        created_at: new Date().toISOString()
      }
    }
  }

  // 更新用户资料
  async updateUserProfile(userId, updates) {
    try {
      // 首先检查users表中是否已有该用户记录
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }
      
      let data, error
      if (existingUser) {
        // 更新现有记录
        const result = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)
          .select()
          .single()
        data = result.data
        error = result.error
      } else {
        // 创建新记录
        const result = await supabase
          .from('users')
          .insert([{
            id: userId,
            ...updates,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()
        data = result.data
        error = result.error
      }
      
      if (error) throw error
      
      // 同时更新auth用户元数据
      await supabase.auth.updateUser({
        data: updates
      })
      
      return data
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return null
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

      console.log('获取到的消息数据:', data)

      // 获取所有发送消息的用户ID，只保留有效的 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const allUserIds = [...new Set((data || []).map(m => m.user_id).filter(Boolean))]
      const validUserIds = allUserIds.filter(id => uuidRegex.test(id))
      
      console.log('所有用户ID:', allUserIds)
      console.log('有效UUID格式的用户ID:', validUserIds)

      // 批量从users表获取用户信息
      let userMap = {}
      if (validUserIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', validUserIds)

        console.log('users表查询结果:', { users, usersError })

        if (!usersError && users) {
          users.forEach(user => {
            userMap[user.id] = user
          })
        }
        
        console.log('构建的用户映射:', userMap)
      }

      // 转换数据格式，用户名完全从users表获取
      return (data || []).map(message => {
        const userInfo = userMap[message.user_id]
        console.log(`消息 ${message.id} 的 user_id: ${message.user_id}, 找到用户:`, userInfo)
        
        // 只使用users表中的display_name
        const displayName = userInfo?.display_name || '匿名用户'
        const userAvatar = userInfo?.avatar_url || null
        
        return {
          id: message.id,
          user_id: message.user_id,
          user_name: displayName,
          user_avatar: userAvatar,
          content: message.content,
          created_at: message.created_at
        }
      })
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
      console.log('sendSimpleGroupMessage 参数:', { groupId, userId, userName, content })

      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .insert([{
          group_id: groupId,
          user_id: userId,
          user_name: userName,
          user_avatar: userAvatar,
          content: content,
          message_type: 'text',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      console.log('supabase 响应:', { data, error })

      if (error) throw error

      // 返回数据
      return data
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
    console.log('订阅群组消息:', groupId)

    // 创建 channel
    const channel = supabase
      .channel(`group-${groupId}-messages`, {
        config: {
          broadcast: { self: true }
        }
      })

    // 监听 INSERT 事件
    channel
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          console.log('收到新消息:', payload)
          callback(payload)
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('订阅失败:', err)
        } else {
          console.log('订阅状态:', status)
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ 订阅成功！')
        } else if (status === 'CLOSED') {
          console.log('❌ 连接关闭')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ 频道错误')
        }
      })

    return channel
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

  // ==================== 评论相关方法 ====================

  // 获取故事的评论
  async getStoryComments(storyId) {
    try {
      const { data: comments, error } = await supabase
        .from('story_comments')
        .select('*')
        .eq('story_id', storyId)
        .is('reply_to', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 获取每个评论的回复
      const commentsWithReplies = await Promise.all(
        (comments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('story_comments')
            .select('*')
            .eq('reply_to', comment.id)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: replies || []
          }
        })
      )

      // 收集所有用户ID
      const allUserIds = new Set()
      commentsWithReplies.forEach(comment => {
        if (comment.user_id) allUserIds.add(comment.user_id)
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (reply.user_id) allUserIds.add(reply.user_id)
          })
        }
      })

      // 批量获取用户信息并自动创建缺失的用户记录
      let userMap = {}
      if (allUserIds.size > 0) {
        const userIdArray = Array.from(allUserIds)
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url')
          .in('id', userIdArray)

        if (!usersError && users) {
          users.forEach(user => {
            userMap[user.id] = user
          })
        }
        
        // 找出缺失的用户ID并创建记录
        const missingUserIds = userIdArray.filter(id => !userMap[id])
        if (missingUserIds.length > 0) {
          const virtualUserMap = await this.createMissingUsers(missingUserIds)
          
          // 如果成功创建了虚拟用户映射，合并到userMap
          Object.assign(userMap, virtualUserMap)
          
          // 尝试重新获取真实创建的用户信息
          const { data: newUsers, error: newUsersError } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .in('id', missingUserIds)
            
          if (!newUsersError && newUsers) {
            newUsers.forEach(user => {
              userMap[user.id] = user // 真实数据覆盖虚拟数据
            })
          }
        }
      }

      // 合并用户信息到评论数据，保留所有评论
      return commentsWithReplies.map(comment => {
        const userInfo = userMap[comment.user_id]
        let displayName = '匿名用户'
        let userAvatar = null
        
        if (userInfo) {
          // 如果用户存在于用户表，使用真实信息
          displayName = userInfo.display_name || '匿名用户'
          userAvatar = userInfo.avatar_url
        } else if (comment.user_id) {
          // 如果用户不存在于用户表，使用用户ID的简短显示
          displayName = `用户${comment.user_id.substring(0, 6)}`
        }
        
        return {
          ...comment,
          user: comment.user_id ? {
            id: comment.user_id,
            display_name: displayName,
            avatar_url: userAvatar
          } : null,
          replies: (comment.replies || []).map(reply => {
            const replyUserInfo = userMap[reply.user_id]
            let replyDisplayName = '匿名用户'
            let replyAvatar = null
            
            if (replyUserInfo) {
              // 如果用户存在于用户表，使用真实信息
              replyDisplayName = replyUserInfo.display_name || '匿名用户'
              replyAvatar = replyUserInfo.avatar_url
            } else if (reply.user_id) {
              // 如果用户不存在于用户表，使用用户ID的简短显示
              replyDisplayName = `用户${reply.user_id.substring(0, 6)}`
            }
            
            return {
              ...reply,
              user: reply.user_id ? {
                id: reply.user_id,
                display_name: replyDisplayName,
                avatar_url: replyAvatar
              } : null
            }
          })
        }
      })
    } catch (error) {
      console.error('获取评论失败:', error)
      return []
    }
  }

  // 添加评论
  async addComment(storyId, userId, content, replyToId = null) {
    try {
      const { data, error } = await supabase
        .from('story_comments')
        .insert([{
          story_id: storyId,
          user_id: userId,
          content: content,
          reply_to: replyToId
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('添加评论失败:', error)
      return null
    }
  }

  // 删除评论
  async deleteComment(commentId) {
    try {
      const { error } = await supabase
        .from('story_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('删除评论失败:', error)
      return false
    }
  }

  // 更新评论点赞数
  async updateCommentLikes(commentId, increment) {
    try {
      // 先获取当前点赞数
      const { data: currentComment, error: fetchError } = await supabase
        .from('story_comments')
        .select('likes')
        .eq('id', commentId)
        .single()

      if (fetchError) throw fetchError

      // 计算新的点赞数
      const newLikes = Math.max(0, (currentComment?.likes || 0) + increment)

      // 更新点赞数
      const { data, error } = await supabase
        .from('story_comments')
        .update({ likes: newLikes })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('更新点赞数失败:', error)
      return null
    }
  }

  // 检查用户是否已点赞评论
  async checkUserLikedComment(commentId, userId) {
    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('检查点赞状态失败:', error)
      return false
    }
  }

  // 添加点赞
  async addCommentLike(commentId, userId) {
    try {
      // 检查是否已点赞
      const alreadyLiked = await this.checkUserLikedComment(commentId, userId)
      if (alreadyLiked) return null

      // 添加点赞记录
      const { error: likeError } = await supabase
        .from('comment_likes')
        .insert([{
          comment_id: commentId,
          user_id: userId
        }])

      if (likeError) throw likeError

      // 更新点赞数
      return await this.updateCommentLikes(commentId, 1)
    } catch (error) {
      console.error('添加点赞失败:', error)
      return null
    }
  }

  // 取消点赞
  async removeCommentLike(commentId, userId) {
    try {
      // 删除点赞记录
      const { error: unlikeError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId)

      if (unlikeError) throw unlikeError

      // 更新点赞数
      return await this.updateCommentLikes(commentId, -1)
    } catch (error) {
      console.error('取消点赞失败:', error)
      return null
    }
  }

  // 获取评论的点赞用户列表
  async getCommentLikers(commentId) {
    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('user_id, created_at')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('获取点赞用户失败:', error)
      return []
    }
  }

  // 批量检查用户对评论的点赞状态
  async batchCheckUserLikedComments(commentIds, userId) {
    try {
      if (!commentIds || commentIds.length === 0) return {}

      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', commentIds)

      if (error) throw error

      // 返回点赞状态映射
      const likedMap = {}
      ;(data || []).forEach(like => {
        likedMap[like.comment_id] = true
      })
      return likedMap
    } catch (error) {
      console.error('批量检查点赞状态失败:', error)
      return {}
    }
  }

  // 查询现有用户（不创建任何新记录）
  async createMissingUsers(userIds) {
    try {
      if (!userIds || userIds.length === 0) return {}
      
      // 只从users表查询现有的用户信息
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', userIds)
      
      if (!checkError && existingUsers) {
        const userMap = {}
        existingUsers.forEach(user => {
          userMap[user.id] = user
          console.log(`从数据库找到用户: ${user.id} -> ${user.display_name}`)
        })
        
        // 找出缺失的用户ID（不创建记录）
        const missingIds = userIds.filter(id => !userMap[id])
        
        if (missingIds.length > 0) {
          console.log(`以下 ${missingIds.length} 个用户不在数据库中，将被过滤掉:`)
          missingIds.forEach(id => {
            console.log(`- ${id}`)
          })
        }
        
        console.log(`返回 ${Object.keys(userMap).length} 个有效用户的映射`)
        return userMap
      }
      
      // 如果查询失败，返回空映射
      console.log('查询users表失败，返回空用户映射')
      return {}
    } catch (error) {
      console.error('查询用户表失败:', error)
      return {}
    }
  }

  // 订阅评论变化
  subscribeToComments(storyId, callback) {
    return supabase
      .channel(`story-${storyId}-comments`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_comments',
          filter: `story_id=eq.${storyId}`
        },
        callback
      )
      .subscribe()
  }
}

// 创建单例实例
export const dbServiceSimple = new DatabaseServiceSimple()