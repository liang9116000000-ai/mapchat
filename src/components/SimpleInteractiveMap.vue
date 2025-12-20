<template>
  <div class="map-container">
    <div id="map" class="map"></div>
    
    <!-- 事件输入模态框 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h3>📝 添加新故事</h3>
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
            <button type="submit" class="btn-submit">添加故事</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 事件列表侧边栏 -->
    <div class="sidebar" :class="{ 'open': showSidebar }">
      <div class="sidebar-header">
        <h3>📚 故事列表 (<span class="event-count">{{ events.length }}</span>)</h3>
        <button class="close-btn" @click="toggleSidebar">×</button>
      </div>
      
      <div class="sidebar-content">
        <div v-if="events.length === 0" class="empty-state">
          <p>暂无事件记录</p>
          <p>点击地图添加第一个故事</p>
        </div>
        
        <div v-else class="event-list">
          <div 
            v-for="event in events" 
            :key="event.id" 
            class="event-item"
            @click="focusOnEvent(event)"
          >
            <div class="event-header">
              <button class="delete-btn" @click.stop="deleteEvent(event.id)">
                <span>🗑️</span>
                <span>删除</span>
              </button>
            </div>
            <h4>{{ event.title }}</h4>
            <p>{{ event.description }}</p>
            <div class="event-meta">
              <span class="event-time">
                <span>🕒</span>
                <span>{{ formatDate(event.timestamp) }}</span>
              </span>
              <span class="event-location">
                <span>📍</span>
                <span>{{ event.location.lat.toFixed(4) }}, {{ event.location.lng.toFixed(4) }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 定位按钮 -->
    <button class="location-btn" @click="getCurrentLocation" :disabled="locating">
      📍 {{ locating ? '定位中...' : '我的位置' }}
    </button>
    
    <!-- 切换侧边栏按钮 -->
    <button class="toggle-sidebar" @click="toggleSidebar">
      📚 {{ showSidebar ? '隐藏' : '显示' }}故事
    </button>
    

  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { dbService } from '../utils/database.js'
import { isCloudConfigured } from '../supabase.js'

export default {
  name: 'SimpleInteractiveMap',
  props: {
    user: {
      type: Object,
      default: null
    }
  },
  emits: ['update-events'],
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
      switchingView: false,
      is3DView: false,
      newEvent: {
        title: '',
        description: '',
        type: ''
      },
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initMap()
      this.loadEvents()
    })
  },
  
  beforeUnmount() {
    if (this.subscription) {
      dbService.unsubscribe(this.subscription)
    }
  },
  
  methods: {
    initMap() {
      this.map = L.map('map').setView([39.9042, 116.4074], 10)
      
      L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}', {
        attribution: '© 高德地图'
      }).addTo(this.map)
      
      this.map.on('click', (e) => {
        this.selectedLocation = e.latlng
        this.showModal = true
      })
    },
    
    async init3DView() {
      try {
        console.log('正在初始化Cesium 3D地球...')
        
        // CesiumEarth组件已经通过Vue模板自动加载
        console.log('Cesium 3D地球初始化成功')
        
      } catch (error) {
        console.error('Cesium 3D地球初始化失败:', error)
        this.switchingView = false
        alert('3D地球加载失败，已切换回2D模式')
      }
    },
    
    async toggle3DView() {
      if (this.switchingView) return
      
      this.switchingView = true
      
      try {
        if (this.is3DView) {
          // 切换到2D地图
          await this.$nextTick()
          // 确保地图容器存在
          if (document.getElementById('map')) {
            this.initMap()
            this.recreateMarkers()
            this.is3DView = !this.is3DView
          } else {
            console.error('地图容器未找到')
          }
        } else {
          // 切换到3D地球
          if (this.map) {
            this.map.remove()
            this.map = null
          }
          
          await this.$nextTick()
          await this.init3DView()
          this.is3DView = !this.is3DView
        }
      } catch (error) {
        console.error('切换视图失败:', error)
        alert('切换视图失败，请刷新页面重试')
      } finally {
        this.switchingView = false
      }
    },
    
    recreateMarkers() {
      this.clearAllMarkers()
      this.events.forEach(event => {
        const marker = L.marker([event.location.lat, event.location.lng], {
          icon: this.createCustomIcon(event.type)
        })
          .addTo(this.map)
          .bindPopup(`
                  <div style="min-width: 220px; padding: 8px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">${event.title}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #8a919f; line-height: 1.5;">${event.description}</p>
                    ${event.user ? `
                      <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f1f1f2;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <div style="width: 24px; height: 24px; border-radius: 50%; background: #f1f1f2; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                            ${(event.user.display_name || event.user.email).charAt(0).toUpperCase()}
                          </div>
                          <span style="font-size: 12px; color: #667eea; font-weight: 500;">
                            ${event.user.display_name || event.user.email}
                          </span>
                        </div>
                      </div>
                    ` : ''}
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                      <span style="font-size: 12px; color: #8a919f;">
                        🕒 ${this.formatDate(event.created_at)}
                      </span>
                    </div>
                  </div>
          `)
        
        this.markers.push({ id: event.id, marker })
      })
    },
    
    get3DIconUrl(type) {
      const icons = {
        accident: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#ff4d4f" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12">🚗</text>
          </svg>
        `),
        event: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#52c41a" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12">🎉</text>
          </svg>
        `),
        news: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#1890ff" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12">📰</text>
          </svg>
        `),
        other: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#8c8c8c" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12">📍</text>
          </svg>
        `)
      }
      return icons[type] || icons.other
    },
    
    async addEvent() {
      if (!this.selectedLocation || !this.newEvent.title || !this.newEvent.description || !this.newEvent.type) {
        return
      }
      
      // 检查用户是否登录
      if (!this.user) {
        alert('请先登录后再添加故事')
        return
      }
      
      const event = {
        title: this.newEvent.title,
        description: this.newEvent.description,
        type: this.newEvent.type,
        location: {
          lat: this.selectedLocation.lat,
          lng: this.selectedLocation.lng
        },
        user_id: this.user.id
      }
      
      const savedEvent = await dbService.addEvent(event)
      if (!savedEvent) {
        alert('保存失败，请检查网络连接')
        return
      }
      
      this.events.unshift(savedEvent)
      this.$emit('update-events', this.events)
      
      if (this.map) {
        const marker = L.marker([savedEvent.location.lat, savedEvent.location.lng], {
          icon: this.createCustomIcon(savedEvent.type)
        })
          .addTo(this.map)
          .bindPopup(`
            <div style="min-width: 220px; padding: 8px;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">${savedEvent.title}</h4>
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #8a919f; line-height: 1.5;">${savedEvent.description}</p>
              ${savedEvent.user ? `
                <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f1f1f2;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #f1f1f2; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                      ${(savedEvent.user.display_name || savedEvent.user.email).charAt(0).toUpperCase()}
                    </div>
                    <span style="font-size: 12px; color: #667eea; font-weight: 500;">
                      ${savedEvent.user.display_name || savedEvent.user.email}
                    </span>
                  </div>
                </div>
              ` : ''}
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                <span style="font-size: 12px; color: #8a919f;">
                  🕒 ${this.formatDate(savedEvent.created_at)}
                </span>
              </div>
            </div>
          `)
        
        this.markers.push({ id: savedEvent.id, marker })
      }
      
      this.resetForm()
      this.showModal = false
    },
    
    async deleteEvent(eventId) {
      const success = await dbService.deleteEvent(eventId)
      if (!success) {
        alert('删除失败，请检查网络连接')
        return
      }
      
      this.events = this.events.filter(event => event.id !== eventId)
      
      const markerIndex = this.markers.findIndex(m => m.id === eventId)
      if (markerIndex !== -1) {
        if (this.is3DView) {
          // Cesium组件会自动响应事件变化
          console.log('在3D地球中删除事件标记')
        } else if (this.map && this.markers[markerIndex].marker) {
          this.map.removeLayer(this.markers[markerIndex].marker)
        }
        this.markers.splice(markerIndex, 1)
      }
    },
    
    focusOnEvent(event) {
      if (this.is3DView) {
        // Cesium组件会自动处理事件聚焦
        console.log(`在3D地球中聚焦到事件: ${event.title}`)
      } else if (this.map) {
        this.map.setView([event.location.lat, event.location.lng], 15)
        
        const markerObj = this.markers.find(m => m.id === event.id)
        if (markerObj && markerObj.marker) {
          markerObj.marker.openPopup()
        }
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
        accident: '事故',
        event: '活动',
        news: '新闻',
        other: '其他'
      }
      return types[type] || '其他'
    },
    
    getTypeBackground(type) {
      const backgrounds = {
        accident: '#ffebe9',
        event: '#e6f7e6',
        news: '#e6f4ff',
        other: '#f5f5f5'
      }
      return backgrounds[type] || '#f5f5f5'
    },
    
    getTypeColor(type) {
      const colors = {
        accident: '#cf1322',
        event: '#389e0d',
        news: '#0958d9',
        other: '#595959'
      }
      return colors[type] || '#595959'
    },
    
    getMapPinIcon(type) {
      const pinIcons = {
        accident: {
          emoji: '🚗',
          color: '#ff4d4f',
          backgroundColor: '#fff1f0'
        },
        event: {
          emoji: '🎉',
          color: '#52c41a',
          backgroundColor: '#f6ffed'
        },
        news: {
          emoji: '📰',
          color: '#1890ff',
          backgroundColor: '#e6f7ff'
        },
        other: {
          emoji: '📍',
          color: '#8c8c8c',
          backgroundColor: '#f5f5f5'
        }
      }
      return pinIcons[type] || pinIcons.other
    },
    
    createCustomIcon(type) {
      const iconConfig = this.getMapPinIcon(type)
      
      return L.divIcon({
        html: `
          <div style="
            background: ${iconConfig.backgroundColor};
            border: 3px solid ${iconConfig.color};
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            position: relative;
            animation: bounce 2s infinite;
          ">
            <div style="font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); animation: pulse 1.5s infinite;">${iconConfig.emoji}</div>
            <div style="
              position: absolute;
              bottom: -12px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 10px solid transparent;
              border-right: 10px solid transparent;
              border-top: 14px solid ${iconConfig.color};
            "></div>
          </div>
          <style>
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>
        `,
        iconSize: [44, 58],
        iconAnchor: [22, 58],
        popupAnchor: [0, -58],
        className: 'custom-map-pin'
      })
    },
    
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN')
    },
    
    async getCurrentLocation() {
      if (!navigator.geolocation) {
        alert('您的浏览器不支持地理定位功能')
        return
      }

      this.locating = true

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          
          if (this.is3DView) {
            // Cesium组件会自动处理定位
            console.log('在3D地球中定位到:', latitude, longitude)
          } else if (this.map) {
            this.map.setView([latitude, longitude], 15)
            
            if (this.currentLocationMarker && this.currentLocationMarker.marker) {
              this.map.removeLayer(this.currentLocationMarker.marker)
            }
            
            const currentLocationIcon = L.divIcon({
              html: '<div style="background: #4285f4; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              className: 'current-location-marker'
            })
            
            this.currentLocationMarker = L.marker([latitude, longitude], { icon: currentLocationIcon })
              .addTo(this.map)
              .bindPopup(`
                <div style="min-width: 200px; padding: 4px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">📍 您的当前位置</h4>
                  <p style="margin: 4px 0; font-size: 14px; color: #8a919f;">纬度: ${latitude.toFixed(6)}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #8a919f;">经度: ${longitude.toFixed(6)}</p>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                    <span style="font-size: 12px; color: #8a919f;">定位时间: ${new Date().toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              `)
              .openPopup()
            
            setTimeout(() => {
              this.currentLocationMarker.closePopup()
            }, 3000)
          }
          
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
          maximumAge: 300000
        }
      )
    },
    
    async loadEvents() {
      try {
        if (isCloudConfigured) {
          this.events = await dbService.getAllEvents()
          console.log('加载的事件数据:', this.events)
          
          if (this.map) {
            this.events.forEach(event => {
              const marker = L.marker([event.location.lat, event.location.lng], {
                icon: this.createCustomIcon(event.type)
              })
                .addTo(this.map)
                .bindPopup(`
                  <div style="min-width: 220px; padding: 8px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">${event.title}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #8a919f; line-height: 1.5;">${event.description}</p>
                    ${event.user ? `
                      <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f1f1f2;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <div style="width: 24px; height: 24px; border-radius: 50%; background: #f1f1f2; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                            ${(event.user.display_name || event.user.email).charAt(0).toUpperCase()}
                          </div>
                          <span style="font-size: 12px; color: #667eea; font-weight: 500;">
                            ${event.user.display_name || event.user.email}
                          </span>
                        </div>
                      </div>
                    ` : ''}
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                      <span style="font-size: 12px; color: #8a919f;">
                        🕒 ${this.formatDate(event.created_at)}
                      </span>
                      <span style="font-size: 12px; color: #8a919f; margin-left: 8px;">
                        📍 ${event.location.lat.toFixed(3)}, ${event.location.lng.toFixed(3)}
                      </span>
                    </div>
                  </div>
                `)
              
              this.markers.push({ id: event.id, marker })
            })
            
            this.setupRealtimeSync()
          }
        } else {
          console.log('云数据库未配置，使用空地图')
        }
      } catch (e) {
        console.error('加载数据失败:', e)
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
      
      if (this.map) {
        const marker = L.marker([event.location.lat, event.location.lng], {
          icon: this.createCustomIcon(event.type)
        })
          .addTo(this.map)
          .bindPopup(`
                  <div style="min-width: 220px; padding: 8px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">${event.title}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #8a919f; line-height: 1.5;">${event.description}</p>
                    ${event.user ? `
                      <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f1f1f2;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <div style="width: 24px; height: 24px; border-radius: 50%; background: #f1f1f2; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                            ${(event.user.display_name || event.user.email).charAt(0).toUpperCase()}
                          </div>
                          <span style="font-size: 12px; color: #667eea; font-weight: 500;">
                            ${event.user.display_name || event.user.email}
                          </span>
                        </div>
                      </div>
                    ` : ''}
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                      <span style="font-size: 12px; color: #8a919f;">
                        🕒 ${this.formatDate(event.created_at)}
                      </span>
                    </div>
                  </div>
          `)
        
        this.markers.push({ id: event.id, marker })
      }
    },
    
    handleRemoteUpdate(_oldRecord, newRecord) {
      const index = this.events.findIndex(e => e.id === newRecord.id)
      if (index !== -1) {
        this.events[index] = newRecord
        
        if (this.map) {
          const markerObj = this.markers.find(m => m.id === newRecord.id)
          if (markerObj) {
            markerObj.marker.setPopupContent(`
              <div style="min-width: 220px; padding: 8px;">
                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e2022;">${newRecord.title}</h4>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #8a919f; line-height: 1.5;">${newRecord.description}</p>
                ${newRecord.user ? `
                  <div style="margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid #f1f1f2;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="width: 24px; height: 24px; border-radius: 50%; background: #f1f1f2; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                        ${(newRecord.user.display_name || newRecord.user.email).charAt(0).toUpperCase()}
                      </div>
                      <span style="font-size: 12px; color: #667eea; font-weight: 500;">
                        ${newRecord.user.display_name || newRecord.user.email}
                      </span>
                    </div>
                  </div>
                ` : ''}
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f1f2;">
                  <span style="font-size: 12px; color: #8a919f;">
                    🕒 ${this.formatDate(newRecord.created_at)}
                  </span>
                </div>
              </div>
            `)
          }
        }
      }
    },
    
    handleRemoteDelete(_event) {
      const { old: event } = _event
      const index = this.events.findIndex(e => e.id === event.id)
      if (index !== -1) {
        this.events.splice(index, 1)
        
        const markerIndex = this.markers.findIndex(m => m.id === event.id)
        if (markerIndex !== -1) {
          if (this.map) {
            this.map.removeLayer(this.markers[markerIndex].marker)
          }
          this.markers.splice(markerIndex, 1)
        }
      }
    },
    
    clearAllMarkers() {
      this.markers.forEach(m => {
        if (m.marker && this.map) {
          this.map.removeLayer(m.marker)
        }
      })
      this.markers = []
    }
  }
}
</script>

<style scoped>
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.cesium-earth {
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 保持原有的样式不变 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #ffffff;
  border-radius: 0px;
  padding: 0;
  max-width: 480px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e2e3;
  position: relative;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
}

.modal h3 {
  margin: 0;
  padding: 1.5rem 1.5rem 0;
  color: #1e2022;
  text-align: left;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid #f1f1f2;
  padding-bottom: 1rem;
}

.form-group {
  margin-bottom: 0;
  position: relative;
  border-bottom: 1px solid #f1f1f2;
}

.form-group:last-of-type {
  border-bottom: none;
}

.form-group label {
  display: block;
  padding: 1rem 1.5rem 0.5rem;
  color: #8a919f;
  font-weight: 500;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem 1.5rem 1rem;
  border: none;
  border-radius: 0;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: transparent;
  color: #1e2022;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  background: #f8f8f9;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  line-height: 1.5;
}

.form-group select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238a919f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 1.5rem center;
  background-repeat: no-repeat;
  background-size: 1em 1em;
  padding-right: 2.5rem;
}

.form-actions {
  display: flex;
  gap: 0;
  margin-top: 1rem;
  border-top: 1px solid #f1f1f2;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 0;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-cancel {
  background: #ffffff;
  color: #8a919f;
  border-right: 1px solid #f1f1f2;
}

.btn-cancel:hover {
  background: #f8f8f9;
  color: #1e2022;
}

.btn-submit {
  background: #1171ee;
  color: white;
}

.btn-submit:hover {
  background: #0958d9;
}

.btn-cancel:active,
.btn-submit:active {
  transform: none;
  opacity: 0.8;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #adb5bd;
  font-style: italic;
}

.modal::-webkit-scrollbar {
  width: 6px;
}

.modal::-webkit-scrollbar-track {
  background: transparent;
}

.modal::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 3px;
}

.modal::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}

.sidebar {
  position: fixed;
  top: 0;
  right: -420px;
  width: 420px;
  height: 100%;
  background: #ffffff;
  box-shadow: -1px 0 0 0 rgba(0, 0, 0, 0.05);
  transition: right 0.3s ease;
  z-index: 999;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #f1f1f2;
}

.sidebar.open {
  right: 0;
}

.sidebar-header {
  padding: 1.5rem;
  background: #ffffff;
  color: #1e2022;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f1f2;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e2022;
}

.event-count {
  background: #f1f1f2;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #8a919f;
}

.close-btn {
  background: #f1f1f2;
  border: none;
  color: #1e2022;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e8e8e9;
  color: #1e2022;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #f8f8f9;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #e1e2e3;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #d2d3d4;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #8a919f;
}

.empty-state p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.empty-state p:first-child {
  font-size: 1.1rem;
  font-weight: 500;
  color: #1e2022;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.event-item {
  background: #ffffff;
  border: 1px solid #f1f1f2;
  border-radius: 8px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.75rem;
}

.event-item:hover {
  border-color: #e1e2e3;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.event-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 0.8rem;
}

.delete-btn {
  background: #ffffff;
  border: 1px solid #f1f1f2;
  color: #8a919f;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.delete-btn:hover {
  background: #fff1f0;
  border-color: #ffccc7;
  color: #cf1322;
  transform: scale(1.05);
}

.event-item h4 {
  margin: 0 0 0.5rem 0;
  color: #1e2022;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.event-item p {
  margin: 0 0 0.8rem 0;
  color: #8a919f;
  font-size: 0.9rem;
  line-height: 1.5;
  font-weight: 400;
}

.event-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.event-time {
  color: #8a919f;
  font-size: 0.75rem;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.event-location {
  color: #8a919f;
  font-size: 0.75rem;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.location-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1171ee;
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  z-index: 997;
  box-shadow: 0 2px 8px rgba(17, 113, 238, 0.2);
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.location-btn:hover:not(:disabled) {
  background: #0958d9;
  box-shadow: 0 4px 12px rgba(17, 113, 238, 0.3);
}

.location-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f1f2;
  color: #8a919f;
}

.toggle-sidebar {
  position: fixed;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  background: #ffffff;
  color: #1e2022;
  border: 1px solid #f1f1f2;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  z-index: 998;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-sidebar:hover {
  background: #f1f1f2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.toggle-sidebar:active {
  transform: translateY(-50%) scale(0.98);
}

.toggle-3d {
  position: fixed;
  top: 80px;
  right: 20px;
  background: #ffffff;
  color: #1e2022;
  border: 1px solid #f1f1f2;
  padding: 0.7rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  z-index: 996;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-3d:hover:not(:disabled) {
  background: #f1f1f2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.toggle-3d:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8f8f9;
  color: #8a919f;
  transform: none;
}

.toggle-3d:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.custom-map-pin {
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.custom-map-pin:hover {
  transform: scale(1.1);
}

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
  
  .toggle-3d {
    top: 60px;
    right: 10px;
    padding: 0.6rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .location-btn {
    top: 10px;
    right: 10px;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
  }
}
</style>