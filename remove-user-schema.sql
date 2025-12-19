-- 移除用户相关元素的数据库脚本
-- 在Supabase项目的SQL编辑器中执行以下命令

-- 删除用户表
DROP TABLE IF EXISTS users CASCADE;

-- 从map_events表中删除user_id字段和相关索引
ALTER TABLE map_events DROP COLUMN IF EXISTS user_id;

-- 删除user_id相关的索引
DROP INDEX IF EXISTS idx_map_events_user_id;

-- 删除所有基于user_id的用户策略
DROP POLICY IF EXISTS "用户可以查看所有事件" ON map_events;
DROP POLICY IF EXISTS "用户可以插入自己的事件" ON map_events;
DROP POLICY IF EXISTS "用户只能更新自己的事件" ON map_events;
DROP POLICY IF EXISTS "用户只能删除自己的事件" ON map_events;
DROP POLICY IF EXISTS "用户可以插入事件" ON map_events;
DROP POLICY IF EXISTS "用户可以更新事件" ON map_events;
DROP POLICY IF EXISTS "用户可以删除事件" ON map_events;

-- 创建新的策略，允许所有人操作（匿名访问）
CREATE POLICY "所有人可以查看事件" ON map_events
    FOR SELECT USING (true);

CREATE POLICY "所有人可以插入事件" ON map_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "所有人可以更新事件" ON map_events
    FOR UPDATE USING (true);

CREATE POLICY "所有人可以删除事件" ON map_events
    FOR DELETE USING (true);

-- 删除新用户注册时自动创建用户记录的触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();