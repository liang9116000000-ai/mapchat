-- 私信会话表
CREATE TABLE IF NOT EXISTS private_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- 私信消息表
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_private_conversations_user1 ON private_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_user2 ON private_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);

-- RLS 策略
ALTER TABLE private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- 会话表策略：用户只能看到自己参与的会话
CREATE POLICY "users_view_own_conversations" ON private_conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "users_create_conversations" ON private_conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "users_update_own_conversations" ON private_conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 消息表策略：用户只能看到自己会话中的消息
CREATE POLICY "users_view_conversation_messages" ON private_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM private_conversations 
      WHERE id = conversation_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "users_send_messages" ON private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "users_update_messages" ON private_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM private_conversations 
      WHERE id = conversation_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
