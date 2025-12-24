-- 添加用户名和头像字段（如果尚未添加）
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS user_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS user_avatar TEXT;

-- 更新现有数据
UPDATE chat_messages
SET user_name = '用户' || SUBSTRING(user_id::text, LENGTH(user_id::text) - 3, 4)
WHERE user_name IS NULL OR user_name = '';

-- 启用行级安全（如果尚未启用）
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "允许查看所有群组" ON chat_groups;
DROP POLICY IF EXISTS "允许查看所有群组成员" ON group_members;
DROP POLICY IF EXISTS "允许查看所有聊天消息" ON chat_messages;

-- 创建群组表策略
CREATE POLICY "允许查看所有群组" ON chat_groups
    FOR SELECT USING (true);

CREATE POLICY "允许创建群组" ON chat_groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 创建群组成员表策略
CREATE POLICY "允许查看所有群组成员" ON group_members
    FOR SELECT USING (true);

CREATE POLICY "允许加入群组" ON group_members
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "允许退出群组" ON group_members
    FOR DELETE USING (auth.uid() = user_id);

-- 创建聊天消息表策略
CREATE POLICY "允许查看所有聊天消息" ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY "允许发送消息" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
