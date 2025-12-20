-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建用户表（与 auth.users 关联）
CREATE TABLE IF NOT EXISTS users (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 创建更新触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建事件表（增加用户关联）
CREATE TABLE IF NOT EXISTS map_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    location JSONB NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_map_events_user_id ON map_events(user_id);
CREATE INDEX IF NOT EXISTS idx_map_events_created_at ON map_events(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_events ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户可以查看所有用户（简化示例）
CREATE POLICY "允许查看所有用户" ON users
    FOR SELECT USING (true);

-- 创建策略：用户只能管理自己的事件
CREATE POLICY "用户只能管理自己的事件" ON map_events
    FOR ALL USING (auth.uid() = user_id);

-- 创建策略：允许查看所有事件（用于地图显示）
CREATE POLICY "允许查看所有事件" ON map_events
    FOR SELECT USING (true);