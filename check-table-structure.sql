-- 检查当前表结构
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'map_events' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查约束
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'map_events' 
AND tc.table_schema = 'public';

-- 检查索引
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'map_events'
AND schemaname = 'public';