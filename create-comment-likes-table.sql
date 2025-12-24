-- 创建评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES story_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 启用行级安全
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看点赞
CREATE POLICY "允许查看所有点赞" ON comment_likes
    FOR SELECT USING (true);

-- 允许已认证用户点赞
CREATE POLICY "允许点赞" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 允许用户取消自己的点赞
CREATE POLICY "允许取消点赞" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);
