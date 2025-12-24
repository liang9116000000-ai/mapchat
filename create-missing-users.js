const { supabase } = require('./src/supabase.js');

async function createMissingUsers() {
  try {
    console.log('=== 查找并创建缺失的用户 ===\n');
    
    // 1. 获取用户表中现有的用户
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id');
    
    if (usersError) {
      console.log('❌ 查询现有用户失败:', usersError.message);
      return;
    }
    
    const existingUserIds = existingUsers?.map(u => u.id) || [];
    console.log(`✅ 用户表中现有 ${existingUserIds.length} 个用户`);
    
    // 2. 获取事件表中的用户ID
    const { data: eventUserIds, error: eventsError } = await supabase
      .from('events')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (eventsError) {
      console.log('❌ 查询事件用户失败:', eventsError.message);
      return;
    }
    
    const eventIds = [...new Set(eventUserIds?.map(e => e.user_id) || [])];
    console.log(`📝 事件表中有 ${eventIds.length} 个用户`);
    
    // 3. 获取评论表中的用户ID
    const { data: commentUserIds, error: commentsError } = await supabase
      .from('story_comments')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (commentsError) {
      console.log('❌ 查询评论用户失败:', commentsError.message);
      return;
    }
    
    const commentIds = [...new Set(commentUserIds?.map(c => c.user_id) || [])];
    console.log(`💬 评论表中有 ${commentIds.length} 个用户`);
    
    // 4. 获取聊天消息表中的用户ID
    const { data: messageUserIds, error: messagesError } = await supabase
      .from('chat_messages')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (messagesError) {
      console.log('❌ 查询消息用户失败:', messagesError.message);
      return;
    }
    
    const messageIds = [...new Set(messageUserIds?.map(m => m.user_id) || [])];
    console.log(`💭 消息表中有 ${messageIds.length} 个用户`);
    
    // 5. 找出所有需要的用户ID
    const allRequiredUserIds = [...new Set([...eventIds, ...commentIds, ...messageIds])];
    console.log(`\n🔍 总共需要 ${allRequiredUserIds.length} 个用户`);
    
    // 6. 找出缺失的用户
    const missingUserIds = allRequiredUserIds.filter(id => !existingUserIds.includes(id));
    
    if (missingUserIds.length === 0) {
      console.log('\n🎉 所有用户都已存在！无需创建新用户。');
      return;
    }
    
    console.log(`\n⚠️  需要创建 ${missingUserIds.length} 个缺失的用户:`);
    missingUserIds.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });
    
    // 7. 创建缺失的用户
    console.log('\n📝 正在创建缺失的用户...');
    
    const newUsers = missingUserIds.map(userId => ({
      id: userId,
      display_name: `用户${userId.substring(0, 6)}`, // 使用ID前6位作为显示名
      avatar_url: null,
      created_at: new Date().toISOString()
    }));
    
    const { data: insertedUsers, error: insertError } = await supabase
      .from('users')
      .insert(newUsers)
      .select();
    
    if (insertError) {
      console.log('❌ 创建用户失败:', insertError.message);
      return;
    }
    
    console.log(`✅ 成功创建 ${insertedUsers?.length || 0} 个用户:`);
    insertedUsers?.forEach(user => {
      console.log(`  - ${user.id} -> ${user.display_name}`);
    });
    
    console.log('\n🎉 用户数据修复完成！');
    
  } catch (err) {
    console.log('❌ 执行错误:', err.message);
  }
}

createMissingUsers();