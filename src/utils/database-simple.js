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
      return data || []
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
          type: 'event', // 临时使用event类型，避免数据库约束错误
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
      // 先从auth.users获取邮箱
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError) throw authError

      // 再从users表获取扩展信息
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError && userError.code !== 'PGRST116') {
        throw userError
      }

      // 合并用户信息
      const mergedUser = {
        ...authData.user_metadata,
        ...userData,
        email: authData.email
      }

      return mergedUser
    } catch (error) {
      console.error('获取用户资料失败:', error)
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

  // 取消订阅
  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription)
    }
  }
}

// 创建单例实例
export const dbServiceSimple = new DatabaseServiceSimple()