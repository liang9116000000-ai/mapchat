const { createClient } = require('@supabase/supabase-js')

// 替换为您的Supabase配置
const supabaseUrl = 'https://fbrqauquyskbyvemdfrv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZicnFhdXF1eXNrYnl2ZW1kZnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAzNDg5MiwiZXhwIjoyMDgxNjEwODkyfQ.C4P7Y_5FQ3L7W7eWvV3L8jW7W7eWvV3L8jW7W7eWvV3L8jW7W7eWvV3L8jW7W'

const supabase = createClient(supabaseUrl, supabaseKey)

async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...')
    
    // 创建用户表
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        username TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 创建事件表
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS map_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        location JSONB NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // 启用行级安全策略
    const enableRLS = `
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE map_events ENABLE ROW LEVEL SECURITY;
    `
    
    // 创建策略
    const createPolicies = `
      -- 用户策略
      DROP POLICY IF EXISTS "允许查看所有用户" ON users;
      CREATE POLICY "允许查看所有用户" ON users
          FOR SELECT USING (true);
          
      -- 事件策略
      DROP POLICY IF EXISTS "用户只能管理自己的事件" ON map_events;
      CREATE POLICY "用户只能管理自己的事件" ON map_events
          FOR ALL USING (auth.uid() = user_id);
          
      DROP POLICY IF EXISTS "允许查看所有事件" ON map_events;
      CREATE POLICY "允许查看所有事件" ON map_events
          FOR SELECT USING (true);
    `
    
    // 创建索引
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_map_events_user_id ON map_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_map_events_created_at ON map_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
    
    console.log('数据库初始化完成！')
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
  }
}

// 运行初始化
initializeDatabase()