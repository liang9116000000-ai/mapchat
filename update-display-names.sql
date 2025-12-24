-- 更新用户的 display_name 为真实姓名
UPDATE users 
SET display_name = '张三'
WHERE id = 'cafc38d9-d5de-4067-b72d-98e72b5e6e78';

UPDATE users 
SET display_name = '李四'
WHERE id = 'cd6f948d-e757-46d6-abe5-4f2418cff5e3';

-- 查看更新结果
SELECT id, display_name, created_at 
FROM users 
WHERE id IN ('cafc38d9-d5de-4067-b72d-98e72b5e6e78', 'cd6f948d-e757-46d6-abe5-4f2418cff5e3');