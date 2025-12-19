-- 修改策略以允许匿名用户操作
-- 在Supabase项目的SQL编辑器中执行以下命令

-- 删除现有策略
DROP POLICY IF EXISTS "用户可以插入自己的事件" ON map_events;
DROP POLICY IF EXISTS "用户只能更新自己的事件" ON map_events;
DROP POLICY IF EXISTS "用户只能删除自己的事件" ON map_events;

-- 创建新策略：允许匿名用户插入事件（user_id为NULL）
CREATE POLICY "用户可以插入事件" ON map_events
    FOR INSERT WITH CHECK (
        (auth.uid() IS NULL AND user_id IS NULL) OR 
        (auth.uid() = user_id)
    );

-- 创建新策略：允许匿名用户更新NULL user_id的事件
CREATE POLICY "用户可以更新事件" ON map_events
    FOR UPDATE USING (
        (auth.uid() IS NULL AND user_id IS NULL) OR 
        (auth.uid() = user_id)
    );

-- 创建新策略：允许匿名用户删除NULL user_id的事件
CREATE POLICY "用户可以删除事件" ON map_events
    FOR DELETE USING (
        (auth.uid() IS NULL AND user_id IS NULL) OR 
        (auth.uid() = user_id)
    );

-- 修改表结构，确保user_id可以为NULL
ALTER TABLE map_events ALTER COLUMN user_id DROP NOT NULL;