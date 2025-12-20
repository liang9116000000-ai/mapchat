import { createStore } from 'vuex'

// 用户认证模块
const authModule = {
  namespaced: true,
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false
  }),
  mutations: {
    SET_USER(state, user) {
      state.user = user
      state.isAuthenticated = !!user
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    CLEAR_USER(state) {
      state.user = null
      state.isAuthenticated = false
    }
  },
  actions: {
    async setUser({ commit }, userInfo) {
      commit('SET_LOADING', true)
      
      try {
        // 保存到 localStorage
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        commit('SET_USER', userInfo)
        
        // 这里可以添加与后端同步的逻辑
        console.log('用户登录成功:', userInfo)
        
      } catch (error) {
        console.error('保存用户信息失败:', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async logout({ commit }) {
      commit('SET_LOADING', true)
      
      try {
        localStorage.removeItem('userInfo')
        commit('CLEAR_USER')
        console.log('用户已登出')
        
      } catch (error) {
        console.error('登出失败:', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async checkAuth({ commit }) {
      try {
        const userInfo = localStorage.getItem('userInfo')
        if (userInfo) {
          const user = JSON.parse(userInfo)
          commit('SET_USER', user)
        }
      } catch (error) {
        console.error('检查认证状态失败:', error)
        localStorage.removeItem('userInfo')
      }
    }
  },
  getters: {
    currentUser: state => state.user,
    isAuthenticated: state => state.isAuthenticated,
    isLoading: state => state.loading
  }
}

// 主 store
export default createStore({
  modules: {
    auth: authModule
  }
})