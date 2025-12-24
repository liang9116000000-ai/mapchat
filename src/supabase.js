import { createClient } from '@supabase/supabase-js'

// Supabase配置 - 请替换为您的实际配置
const supabaseUrl = 'https://fbrqauquyskbyvemdfrv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnFhdXF1eXNrYnl2ZW1kZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzQ4OTIsImV4cCI6MjA4MTYxMDg5Mn0._NgF6EnIdaGnMNao7K8G1fzqYrFE2_afbDML3kd1cXE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
export const isCloudConfigured = true

// 数据库表名
export const TABLES = {
  EVENTS: 'map_events',
  USERS: 'users',
  GROUPS: 'chat_groups',
  MESSAGES: 'chat_messages',
  GROUP_MEMBERS: 'group_members'
}

// 事件类型枚举
export const EVENT_TYPES = {
  ACCIDENT: 'accident',
  EVENT: 'event',
  NEWS: 'news',
  OTHER: 'other'
}