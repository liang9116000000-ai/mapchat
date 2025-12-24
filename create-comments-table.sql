-- 创建评论表
CREATE TABLE IF NOT EXISTS story_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id BIGINT NOT NULL,
    user_id UUID,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    reply_to UUID REFERENCES story_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON story_comments(reply_to);

-- 启用行级安全
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看评论
CREATE POLICY "允许查看所有评论" ON story_comments
    FOR SELECT USING (true);

-- 允许已认证用户创建评论
CREATE POLICY "允许创建评论" ON story_comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 允许用户更新自己的评论
CREATE POLICY "允许更新自己的评论" ON story_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- 允许用户删除自己的评论
CREATE POLICY "允许删除自己的评论" ON story_comments
    FOR DELETE USING (auth.uid() = user_id);
