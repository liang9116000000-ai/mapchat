-- 启用 chat_messages 表的实时复制
-- 这个脚本会启用 Realtime 功能，让消息可以实时同步

-- 启用表的实时复制
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 验证是否成功
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
