-- 添加用户名和头像字段到聊天消息表
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS user_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS user_avatar TEXT;

-- 为现有数据填充默认值
UPDATE chat_messages
SET user_name = '用户' || SUBSTRING(user_id::text, LENGTH(user_id::text) - 3, 4)
WHERE user_name IS NULL OR user_name = '';
