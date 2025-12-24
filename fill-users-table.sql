-- 为现有用户创建用户记录
-- 在Supabase SQL编辑器中执行

-- 临时禁用RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 清理可能存在的重复数据
DELETE FROM users WHERE id IN (
  'cafc38d9-d5de-4067-b72d-98e72b5e6e78'
);

-- 插入用户记录，使用合适的显示名称
INSERT INTO users (id, display_name, created_at) VALUES
('cafc38d9-d5de-4067-b72d-98e72b5e6e78', '故事创作者', NOW()),
('cd6f948d-e757-46d6-abe5-4f2418cff5e3', '评论达人', NOW())
ON CONFLICT (id) DO UPDATE SET 
display_name = EXCLUDED.display_name;

-- 重新启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 验证插入结果
SELECT id, display_name, created_at FROM users;