-- 更新事件类型检查约束，支持新的故事类型
ALTER TABLE map_events DROP CONSTRAINT IF EXISTS map_events_type_check;

-- 重新添加约束，包含新的类型
ALTER TABLE map_events 
ADD CONSTRAINT map_events_type_check CHECK (
    type = ANY (
        ARRAY['story'::VARCHAR, 'event'::VARCHAR, 'news'::VARCHAR, 'date'::VARCHAR, 'other'::VARCHAR]
    )
);

-- 验证约束是否添加成功
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'map_events'::regclass AND contype = 'c';