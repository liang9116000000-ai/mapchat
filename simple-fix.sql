-- 简化修复：完全禁用 RLS 策略以便匿名用户可以操作
ALTER TABLE map_events DISABLE ROW LEVEL SECURITY;

-- 或者如果你想保留 RLS 但允许所有操作，可以执行：
-- DROP POLICY IF EXISTS "用户可以查看所有事件" ON map_events;
-- CREATE POLICY "允许所有操作" ON map_events FOR ALL USING (true) WITH CHECK (true);