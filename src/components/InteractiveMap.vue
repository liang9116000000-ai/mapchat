<template>
  <div class="map-container">
    <div id="map" class="map"></div>
    
    <!-- 事件输入模态框 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h3>📍 添加新事件</h3>
        <form @submit.prevent="addEvent">
          <div class="form-group">
            <label for="eventTitle">事件标题</label>
            <input 
              id="eventTitle"
              v-model="newEvent.title" 
              type="text" 
              placeholder="请输入事件标题" 
              required
            />
          </div>
          
          <div class="form-group">
            <label for="eventDescription">事件描述</label>
            <textarea 
              id="eventDescription"
              v-model="newEvent.description" 
              placeholder="请输入事件描述" 
              rows="3"
              required
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="eventType">事件类型</label>
            <select id="eventType" v-model="newEvent.type" required>
              <option value="">请选择类型</option>
              <option value="accident">事故</option>
              <option value="event">活动</option>
              <option value="news">新闻</option>
              <option value="other">其他</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-submit">添加事件</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 事件列表侧边栏 -->
    <div class="sidebar" :class="{ 'open': showSidebar }">
      <div class="sidebar-header">
        <h3>📋 事件列表 ({{ events.length }})</h3>
        <button class="close-btn" @click="toggleSidebar">×</button>
      </div>
      
      <div class="sidebar-content">
        <div v-if="events.length === 0" class="empty-state">
          <p>暂无事件记录</p>
          <p>点击地图添加第一个事件</p>
        </div>
        
        <div v-else class="event-list">
          <div 
            v-for="event in events" 
            :key="event.id" 
            class="event-item"
            @click="focusOnEvent(event)"
          >
            <div class="event-header">
              <span class="event-type" :class="event.type">{{ getEventTypeName(event.type) }}</span>
              <button class="delete-btn" @click.stop="deleteEvent(event.id)">🗑️</button>
            </div>
            <h4>{{ event.title }}</h4>
            <p>{{ event.description }}</p>
            <small class="event-time">{{ formatDate(event.timestamp) }}</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 云同步控制按钮 -->
    <div class="sync-controls">
      <button 
        class="sync-btn" 
        @click="toggleSync" 
        :class="{ 'active': syncEnabled }"
        title="云数据库同步"
      >
        ☁️ 云同步已启用
      </button>
    </div>
    
    <!-- 定位按钮 -->
    <button class="location-btn" @click="getCurrentLocation" :disabled="locating">
      📍 {{ locating ? '定位中...' : '我的位置' }}
    </button>
    
    <!-- 切换侧边栏按钮 -->
    <button class="toggle-sidebar" @click="toggleSidebar">
      📋 {{ showSidebar ? '隐藏' : '显示' }}列表
    </button>
    

  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { dbService } from '../utils/database.js'
import { isCloudConfigured } from '../supabase.js'

// 修复Leaflet默认图标问题
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default {
  name: 'InteractiveMap',
  data() {
    return {
      map: null,
      markers: [],
      events: [],
      showModal: false,
      showSidebar: false,
      selectedLocation: null,
      locating: false,
      currentLocationMarker: null,
      syncEnabled: true,
      newEvent: {
        title: '',
        description: '',
        type: ''
      }
    }
  },
  mounted() {
    this.initMap()
    this.loadEvents()
  },

  beforeUnmount() {
    if (this.subscription) {
      dbService.unsubscribe(this.subscription)
    }
  },
  methods: {
    initMap() {
      // 初始化地图，默认显示北京
      this.map = L.map('map').setView([39.9042, 116.4074], 10)
      
      // 添加地图图层
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map)
      
      // 点击地图事件
      this.map.on('click', (e) => {
        this.selectedLocation = e.latlng
        this.showModal = true
      })
    },
    
    async addEvent() {
      if (!this.selectedLocation || !this.newEvent.title || !this.newEvent.description || !this.newEvent.type) {
        return
      }
      
      const event = {
        ...this.newEvent,
        location: {
          lat: this.selectedLocation.lat,
          lng: this.selectedLocation.lng
        },
        timestamp: new Date().toISOString()
      }
      
      // 直接保存到云数据库
      const savedEvent = await dbService.addEvent(event)
      if (!savedEvent) {
        alert('保存失败，请检查网络连接')
        return
      }
      
      // 使用云返回的事件数据
      this.events.unshift(savedEvent)
      
      // 创建地图标记
      const marker = L.marker([savedEvent.location.lat, savedEvent.location.lng])
        .addTo(this.map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h4>${savedEvent.title}</h4>
            <p>${savedEvent.description}</p>
            <small>类型: ${this.getEventTypeName(savedEvent.type)}</small><br>
            <small>时间: ${this.formatDate(savedEvent.timestamp)}</small>
          </div>
        `)
      
      this.markers.push({ id: savedEvent.id, marker })
      
      // 重置表单和关闭模态框
      this.resetForm()
      this.showModal = false
    },
    
    async deleteEvent(eventId) {
      // 从云数据库删除
      const success = await dbService.deleteEvent(eventId)
      if (!success) {
        alert('删除失败，请检查网络连接')
        return
      }
      
      // 从事件列表中删除
      this.events = this.events.filter(event => event.id !== eventId)
      
      // 从地图中删除标记
      const markerIndex = this.markers.findIndex(m => m.id === eventId)
      if (markerIndex !== -1) {
        this.map.removeLayer(this.markers[markerIndex].marker)
        this.markers.splice(markerIndex, 1)
      }
    },
    
    focusOnEvent(event) {
      // 移动地图到事件位置
      this.map.setView([event.location.lat, event.location.lng], 15)
      
      // 打开对应的标记弹窗
      const markerObj = this.markers.find(m => m.id === event.id)
      if (markerObj) {
        markerObj.marker.openPopup()
      }
    },
    
    closeModal() {
      this.showModal = false
      this.resetForm()
    },
    
    toggleSidebar() {
      this.showSidebar = !this.showSidebar
    },
    
    resetForm() {
      this.newEvent = {
        title: '',
        description: '',
        type: ''
      }
      this.selectedLocation = null
    },
    
    getEventTypeName(type) {
      const types = {
        accident: '🚗 事故',
        event: '🎉 活动',
        news: '📰 新闻',
        other: '📌 其他'
      }
      return types[type] || '📌 其他'
    },
    
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN')
    },
    

    
    getCurrentLocation() {
      if (!navigator.geolocation) {
        alert('您的浏览器不支持地理定位功能')
        return
      }

      this.locating = true

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          
          // 移动地图到当前位置
          this.map.setView([latitude, longitude], 15)
          
          // 移除之前的当前位置标记
          if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker)
          }
          
          // 创建当前位置标记
          const currentLocationIcon = L.divIcon({
            html: '<div style="background: #4285f4; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            className: 'current-location-marker'
          })
          
          this.currentLocationMarker = L.marker([latitude, longitude], { icon: currentLocationIcon })
            .addTo(this.map)
            .bindPopup(`
              <div style="min-width: 200px;">
                <h4>📍 您的当前位置</h4>
                <p>纬度: ${latitude.toFixed(6)}</p>
                <p>经度: ${longitude.toFixed(6)}</p>
                <small>定位时间: ${new Date().toLocaleString('zh-CN')}</small>
              </div>
            `)
            .openPopup()
          
          // 3秒后自动关闭弹窗
          setTimeout(() => {
            this.currentLocationMarker.closePopup()
          }, 3000)
          
          this.locating = false
        },
        (error) => {
          this.locating = false
          let errorMessage = '获取位置失败: '
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += '用户拒绝了位置请求'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage += '位置信息不可用'
              break
            case error.TIMEOUT:
              errorMessage += '请求位置超时'
              break
            default:
              errorMessage += '未知错误'
              break
          }
          
          alert(errorMessage)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分钟内的缓存位置
        }
      )
    },

    async loadEvents() {
      if (!isCloudConfigured) {
        console.log('云数据库未配置')
        return
      }
      
      try {
        // 从云数据库加载事件
        this.events = await dbService.getAllEvents()
        
        // 清除现有标记
        this.markers.forEach(m => this.map.removeLayer(m.marker))
        this.markers = []
        
        // 重新创建地图标记
        this.events.forEach(event => {
          const marker = L.marker([event.location.lat, event.location.lng])
            .addTo(this.map)
            .bindPopup(`
              <div style="min-width: 200px;">
                <h4>${event.title}</h4>
                <p>${event.description}</p>
                <small>类型: ${this.getEventTypeName(event.type)}</small><br>
                <small>时间: ${this.formatDate(event.timestamp)}</small>
              </div>
            `)
          
          this.markers.push({ id: event.id, marker })
        })
        
        // 设置实时监听
        this.setupRealtimeSync()
      } catch (e) {
        console.error('加载云端数据失败:', e)
        alert('加载数据失败，请检查网络连接')
      }
    },
    

    
    setupRealtimeSync() {
      if (this.subscription) {
        dbService.unsubscribe(this.subscription)
      }
      
      this.subscription = dbService.subscribeToEvents((payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        switch (eventType) {
          case 'INSERT':
            this.handleRemoteInsert(newRecord)
            break
          case 'UPDATE':
            this.handleRemoteUpdate(oldRecord, newRecord)
            break
          case 'DELETE':
            this.handleRemoteDelete(oldRecord)
            break
        }
      })
    },
    
    handleRemoteInsert(event) {
      this.events.unshift(event)
      
      const marker = L.marker([event.location.lat, event.location.lng])
        .addTo(this.map)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h4>${event.title}</h4>
            <p>${event.description}</p>
            <small>类型: ${this.getEventTypeName(event.type)}</small><br>
            <small>时间: ${this.formatDate(event.timestamp)}</small>
          </div>
        `)
      
      this.markers.push({ id: event.id, marker })
    },
    
    handleRemoteUpdate(_oldRecord, newRecord) {
      const index = this.events.findIndex(e => e.id === newRecord.id)
      if (index !== -1) {
        this.events[index] = newRecord
        
        // 更新对应的标记
        const markerObj = this.markers.find(m => m.id === newRecord.id)
        if (markerObj) {
          markerObj.marker.setPopupContent(`
            <div style="min-width: 200px;">
              <h4>${newRecord.title}</h4>
              <p>${newRecord.description}</p>
              <small>类型: ${this.getEventTypeName(newRecord.type)}</small><br>
              <small>时间: ${this.formatDate(newRecord.timestamp)}</small>
            </div>
          `)
        }
      }
    },
    
    handleRemoteDelete(payload) {
      const { old: event } = payload
      const index = this.events.findIndex(e => e.id === event.id)
      if (index !== -1) {
        this.events.splice(index, 1)
        
        // 删除对应的标记
        const markerIndex = this.markers.findIndex(m => m.id === event.id)
        if (markerIndex !== -1) {
          this.map.removeLayer(this.markers[markerIndex].marker)
          this.markers.splice(markerIndex, 1)
        }
      }
    },
    
    async initializeDatabase() {
      try {
        const initialized = await dbService.initializeTables()
        if (initialized) {
          console.log('数据库初始化成功')
          this.clearAllMarkers()
          this.loadEvents()
        } else {
          console.log('数据库初始化失败，使用基础功能')
        }
      } catch (error) {
        console.error('数据库初始化错误:', error)
      }
    },
    
    toggleSync() {
      if (!isCloudConfigured) {
        alert('云数据库未配置，请先配置Supabase')
        return
      }
      
      // 强制启用云同步
      this.syncEnabled = true
      this.clearAllMarkers()
      this.loadEvents()
    },
    
    clearAllMarkers() {
      this.markers.forEach(m => this.map.removeLayer(m.marker))
      this.markers = []
    }
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  height: 100%;
  width: 100%;
}

.map {
  height: 100%;
  width: 100%;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin-bottom: 1.5rem;
  color: #333;
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-cancel {
  background: #e1e5e9;
  color: #555;
}

.btn-cancel:hover {
  background: #d1d5d9;
}

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit:hover {
  opacity: 0.9;
}



/* 侧边栏样式 */
.sidebar {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100%;
  background: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  transition: right 0.3s ease;
  z-index: 999;
  display: flex;
  flex-direction: column;
}

.sidebar.open {
  right: 0;
}

.sidebar-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-item {
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.event-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.event-type {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.event-type.accident {
  background: #fee;
  color: #c00;
}

.event-type.event {
  background: #efe;
  color: #060;
}

.event-type.news {
  background: #eef;
  color: #00c;
}

.event-type.other {
  background: #f5f5f5;
  color: #666;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.delete-btn:hover {
  opacity: 1;
}

.event-item h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.event-item p {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.event-time {
  color: #999;
  font-size: 0.8rem;
}

.toggle-sidebar {
  position: fixed;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  z-index: 998;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
}

.toggle-sidebar:hover {
  transform: translateY(-50%) scale(1.05);
}

/* 云同步控制按钮 */
.sync-controls {
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 997;
}

.sync-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.sync-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.sync-btn.active {
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
}

.location-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  cursor: pointer;
  z-index: 997;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.location-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.location-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    right: -100%;
  }
  
  .modal {
    width: 95%;
    padding: 1.5rem;
  }
  
  .toggle-sidebar {
    top: auto;
    bottom: 20px;
    right: 50%;
    transform: translateX(50%);
  }
  
  .toggle-sidebar:hover {
    transform: translateX(50%) scale(1.05);
  }
  
  .location-btn {
    top: 10px;
    right: 10px;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
  
  .sync-controls {
    top: 10px;
    left: 10px;
  }
  
  .sync-btn, .auth-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.75rem;
  }
}
</style>