<template>
  <div class="login-container">
    <div class="login-form">
      <button class="close-btn" @click="$emit('close')">✖️</button>
      <h2>{{ isLogin ? '登录' : '注册' }}</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入邮箱"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            required
            minlength="6"
          />
        </div>
        
        <div v-if="!isLogin" class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>
        
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
        </button>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>
      
      <div class="switch-mode">
        <span>{{ isLogin ? '没有账号？' : '已有账号？' }}</span>
        <button type="button" class="switch-btn" @click="toggleMode">
          {{ isLogin ? '注册' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase.js'

export default {
  name: 'Login',
  emits: ['login-success', 'close'],
  
  data() {
    return {
      isLogin: true,
      loading: false,
      error: '',
      form: {
        email: '',
        password: '',
        username: ''
      }
    }
  },
  
  methods: {
    toggleMode() {
      this.isLogin = !this.isLogin
      this.error = ''
      this.form.password = ''
    },
    
    async handleSubmit() {
      this.loading = true
      this.error = ''
      
      try {
        if (this.isLogin) {
          await this.handleLogin()
        } else {
          await this.handleSignup()
        }
      } catch (error) {
        this.error = error.message || '操作失败，请重试'
      } finally {
        this.loading = false
      }
    },
    
    async handleLogin() {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: this.form.email,
        password: this.form.password
      })
      
      if (error) throw error
      
      this.$emit('login-success', data.user)
    },
    
    async handleSignup() {
      // 1. 注册用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: this.form.email,
        password: this.form.password
      })
      
      if (authError) throw authError
      
      // 2. 在users表中创建用户记录
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: this.form.email,
            display_name: this.form.username,
            created_at: new Date().toISOString()
          }
        ])
      
      if (profileError) {
        console.error('创建用户记录失败:', profileError)
        // 继续执行，因为认证已经成功
      }
      
      // 返回包含 display_name 的用户对象
      const userWithProfile = {
        ...authData.user,
        display_name: this.form.username
      }
      
      this.$emit('login-success', userWithProfile)
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-form {
  background: white;
  padding: 2.5rem 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 560px;
  min-width: 480px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 0.2rem;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 5px;
  color: #c33;
  text-align: center;
}

.switch-mode {
  margin-top: 1rem;
  text-align: center;
  color: #666;
}

.switch-btn {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
}

.switch-btn:hover {
  color: #5a6fd8;
}
</style>