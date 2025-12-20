import { supabase } from '../supabase.js'

// 自定义认证服务
export class AuthService {
  
  // 密码加密工具
  static async hashPassword(password) {
    // 使用 Web Crypto API 进行密码哈希
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'salt_secret_key')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // 用户注册
  static async register(email, password, displayName) {
    try {
      // 检查邮箱是否已存在
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .limit(1)
      
      if (checkError) throw checkError
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error('该邮箱已被注册')
      }

      // 加密密码
      const hashedPassword = await this.hashPassword(password)
      
      // 创建用户记录
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email,
          password_hash: hashedPassword,
          display_name: displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      
      // 返回用户信息（不包含密码）
      const { password_hash, ...userWithoutPassword } = data
      return userWithoutPassword
      
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    }
  }

  // 用户登录
  static async login(email, password) {
    try {
      // 查询用户
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1)
      
      if (error) throw error
      
      if (!users || users.length === 0) {
        throw new Error('用户不存在或密码错误')
      }

      const user = users[0]
      
      // 验证密码
      const hashedPassword = await this.hashPassword(password)
      if (user.password_hash !== hashedPassword) {
        throw new Error('用户不存在或密码错误')
      }

      // 创建会话token（简单的实现）
      const sessionToken = await this.generateSessionToken(user.id)
      
      // 更新最后登录时间
      await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          session_token: sessionToken
        })
        .eq('id', user.id)

      // 返回用户信息和token
      const { password_hash, session_token, ...userWithoutSensitive } = user
      return {
        user: userWithoutSensitive,
        token: sessionToken
      }
      
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  }

  // 生成会话token
  static async generateSessionToken(userId) {
    const timestamp = Date.now()
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const randomString = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('')
    return `${userId}_${timestamp}_${randomString}`
  }

  // 验证会话token
  static async validateSession(token) {
    try {
      if (!token) return null
      
      // 从token提取用户ID
      const [userId] = token.split('_')
      if (!userId) return null
      
      // 查询用户
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('session_token', token)
        .limit(1)
      
      if (error) throw error
      
      if (!users || users.length === 0) {
        return null
      }

      const user = users[0]
      const { password_hash, session_token, ...userWithoutSensitive } = user
      return userWithoutSensitive
      
    } catch (error) {
      console.error('会话验证失败:', error)
      return null
    }
  }

  // 退出登录
  static async logout(userId) {
    try {
      await supabase
        .from('users')
        .update({ session_token: null })
        .eq('id', userId)
      
      // 清除本地存储
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      
      return true
    } catch (error) {
      console.error('退出登录失败:', error)
      return false
    }
  }

  // 检查当前登录状态
  static async getCurrentUser() {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return null
      
      const user = await this.validateSession(token)
      if (user) {
        // 更新本地存储
        localStorage.setItem('currentUser', JSON.stringify(user))
        return user
      } else {
        // 清除无效的token
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
        return null
      }
    } catch (error) {
      console.error('获取当前用户失败:', error)
      return null
    }
  }

  // 保存登录状态
  static saveAuthState(token, user) {
    localStorage.setItem('authToken', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  // 清除登录状态
  static clearAuthState() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
  }

  // 获取本地存储的用户信息
  static getLocalUser() {
    try {
      const userStr = localStorage.getItem('currentUser')
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('获取本地用户信息失败:', error)
      return null
    }
  }
}

export const authService = new AuthService()