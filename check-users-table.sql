-- 检查users表结构
\d users;

-- 查看users表中的数据
SELECT id, email, display_name, created_at 
FROM users 
LIMIT 5;

-- 如果没有display_name字段，添加它
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- 更新现有用户的display_name（如果需要）
-- UPDATE users 
-- SET display_name = split_part(email, '@', 1)
-- WHERE display_name IS NULL OR display_name = '';