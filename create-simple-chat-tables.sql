-- 创建群组表（最简版本）
CREATE TABLE IF NOT EXISTS chat_groups (
    id TEXT PRIMARY KEY, -- 简化ID为TEXT
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar TEXT,
    creator_id TEXT,
    member_count INTEGER DEFAULT 1,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建聊天消息表（最简版本）
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY, -- 简化ID为TEXT
    group_id TEXT REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name VARCHAR(100), -- 直接存储用户名
    user_avatar TEXT, -- 直接存储头像
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入测试群组
INSERT INTO chat_groups (id, name, description, creator_id, member_count) VALUES 
('group1', '附近美食分享', '分享身边的美食，一起探店', 'creator1', 234),
('group2', '本地跑步团', '晨跑夜跑，健康生活', 'creator2', 89),
('group3', '宠物交流群', '分享养宠心得，线下聚会', 'creator3', 156),
('group4', '周末活动组', '组织周末出游、聚会活动', 'creator4', 67)
ON CONFLICT (id) DO NOTHING;

-- 插入测试消息
INSERT INTO chat_messages (id, group_id, user_id, user_name, content) VALUES 
('msg1', 'group1', 'user1', '美食达人', '今天发现了一家超棒的日料店！'),
('msg2', 'group1', 'user2', '吃货小王', '在哪里？地址分享一下呗'),
('msg3', 'group1', 'user1', '美食达人', '在市中心商场三楼，叫樱花小厨'),
('msg4', 'group2', 'user3', '跑步教练', '明天早上6点公园集合，有人一起吗？'),
('msg5', 'group3', 'user4', '猫奴', '我家猫咪今天学会握手了！')
ON CONFLICT (id) DO NOTHING;