-- 更新用户表结构以符合新的设计
-- 首先删除现有的表和策略
DROP TABLE IF EXISTS users CASCADE;

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建用户表（独立认证系统）
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    session_token TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 重新创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户可以查看所有用户的基本信息
CREATE POLICY "允许查看用户基本信息" ON users
    FOR SELECT USING (true);

-- 创建策略：用户只能更新自己的信息
CREATE POLICY "用户只能管理自己的信息" ON users
    FOR ALL USING (session_token IS NOT NULL AND id = (
        SELECT id FROM users WHERE session_token = current_setting('app.session_token', '')::text
    ));

-- 重新创建事件表（确保外键正确）
DROP TABLE IF EXISTS map_events;

CREATE TABLE map_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    location JSONB NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建事件表的更新触发器
CREATE TRIGGER update_map_events_updated_at 
    BEFORE UPDATE ON map_events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建事件表索引
CREATE INDEX IF NOT EXISTS idx_map_events_user_id ON map_events(user_id);
CREATE INDEX IF NOT EXISTS idx_map_events_created_at ON map_events(created_at);
CREATE INDEX IF NOT EXISTS idx_map_events_type ON map_events(type);

-- 启用行级安全策略
ALTER TABLE map_events ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能管理自己的事件
CREATE POLICY "用户只能管理自己的事件" ON map_events
    FOR ALL USING (user_id = current_setting('app.user_id', '')::uuid);

-- 创建策略：允许查看所有事件（用于地图显示）
CREATE POLICY "允许查看所有事件" ON map_events
    FOR SELECT USING (true);

-- 插入一些示例数据（可选）
-- INSERT INTO users (id, email, display_name) 
-- SELECT 
--     gen_random_uuid(),
--     'demo@example.com',
--     'Demo User'
-- WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo@example.com');

COMMIT;