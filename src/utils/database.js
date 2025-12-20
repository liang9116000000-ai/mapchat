import { supabase, TABLES } from '../supabase.js'

// 数据库操作工具类
export class DatabaseService {
  
  // 初始化数据库表
  static async initializeTables() {
    try {
      console.log('检查数据库表...')
      
      // 尝试查询表是否存在
      const { error } = await supabase
        .from('map_events')
        .select('id')
        .limit(1)
      
      if (error) {
        console.log('表不存在或权限问题，尝试使用内置SQL...')
        
        // 使用原生SQL创建表
        const { error: createError } = await supabase
          .from('map_events')
          .insert({
            id: 1,
            title: 'temp',
            description: 'temp',
            type: 'other',
            location: { lat: 0, lng: 0 }
          })
          .select()
        
        if (createError && createError.code !== 'PGRST116') {
          console.log('表结构正常')
          return true
        }
        
        console.log('需要手动创建表')
        return false
      } else {
        console.log('表已存在')
        return true
      }
    } catch (error) {
      console.error('初始化失败:', error)
      return false
    }
  }

  // 获取所有事件（关联用户信息）
  async getAllEvents() {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          user:users(
            id,
            email,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.log('获取事件失败，可能是表不存在:', error)
        return [] // 返回空数组而不是抛出错误
      }
      return data || []
    } catch (error) {
      console.error('获取事件失败:', error)
      return [] // 返回空数组而不是抛出错误
    }
  }

  // 获取指定用户的事件
  async getUserEvents(userId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          user:users(
            id,
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.log('获取用户事件失败:', error)
        return [] // 返回空数组而不是抛出错误
      }
      return data || []
    } catch (error) {
      console.error('获取用户事件失败:', error)
      return [] // 返回空数组而不是抛出错误
    }
  }

  // 获取单个事件（关联用户）
  async getEvent(eventId) {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .select(`
          *,
          user:users(
            id,
            email,
            display_name,
            avatar_url
          )
        `)
        .eq('id', eventId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('获取单个事件失败:', error)
      return null
    }
  }

  // 添加新事件（关联用户信息）
  async addEvent(eventData) {
    try {
      // 首先插入事件数据
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .insert([eventData])
        .select()
      
      if (error) throw error
      
      // 然后获取完整的事件信息（包含用户数据）
      const fullEvent = await this.getEvent(data[0].id)
      return fullEvent
    } catch (error) {
      console.error('添加事件失败:', error)
      return null
    }
  }

  // 更新事件
  async updateEvent(eventId, eventData) {
    try {
      const { data, error } = await supabase
        .from(TABLES.EVENTS)
        .update(eventData)
        .eq('id', eventId)
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('更新事件失败:', error)
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

  // 取消订阅
  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription)
    }
  }

  // ==================== 用户相关操作 ====================
  
  // 获取用户资料（不包含敏感信息）
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, created_at, last_login')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('获取用户资料失败:', error)
      return null
    }
  }

  // 更新用户资料
  async updateUserProfile(userId, userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('更新用户资料失败:', error)
      return null
    }
  }

  // 获取所有用户（列表用）
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('获取用户列表失败:', error)
      return []
    }
  }

  // 搜索用户
  async searchUsers(query) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('搜索用户失败:', error)
      return []
    }
  }
}

// 创建单例实例
export const dbService = new DatabaseService()