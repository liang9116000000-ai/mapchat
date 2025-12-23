-- 创建聊天功能表结构

-- 第一步：创建群组表
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar TEXT,
    creator_id TEXT,
    member_count INTEGER DEFAULT 1,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 第二步：插入测试数据到群组表
INSERT INTO chat_groups (name, description, creator_id, member_count) VALUES 
('附近美食分享', '分享身边的美食，一起探店', 'user1', 234),
('本地跑步团', '晨跑夜跑，健康生活', 'user2', 89),
('宠物交流群', '分享养宠心得，线下聚会', 'user3', 156),
('周末活动组', '组织周末出游、聚会活动', 'user4', 67);

-- 第三步：创建群组成员表
CREATE TABLE IF NOT EXISTS group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id TEXT,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 第四步：插入测试成员数据
INSERT INTO group_members (group_id, user_id) VALUES 
((SELECT id FROM chat_groups WHERE name = '附近美食分享'), 'current_user'),
((SELECT id FROM chat_groups WHERE name = '本地跑步团'), 'current_user'),
((SELECT id FROM chat_groups WHERE name = '宠物交流群'), 'current_user');

-- 第五步：创建聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id TEXT,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_withdrawn BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 第六步：插入测试消息数据
INSERT INTO chat_messages (group_id, user_id, content) VALUES 
((SELECT id FROM chat_groups WHERE name = '附近美食分享'), '美食达人', '今天发现了一家超棒的日料店！'),
((SELECT id FROM chat_groups WHERE name = '附近美食分享'), '吃货小王', '在哪里？地址分享一下呗'),
((SELECT id FROM chat_groups WHERE name = '本地跑步团'), '跑步教练', '明天早上6点公园集合，有人一起吗？'),
((SELECT id FROM chat_groups WHERE name = '宠物交流群'), '猫奴', '我家猫咪今天学会握手了！');