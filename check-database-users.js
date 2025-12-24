const { supabase } = require('./src/supabase.js');

async function checkDatabaseUsers() {
  try {
    console.log('=== 检查用户表数据 ===\n');
    
    // 1. 查看用户表中的所有数据
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.log('❌ 查询用户表失败:', usersError.message);
      return;
    }
    
    console.log(`📊 用户表中共有 ${users?.length || 0} 个用户:\n`);
    
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. 用户ID: ${user.id}`);
        console.log(`   显示名称: ${user.display_name || '(未设置)'}`);
        console.log(`   头像: ${user.avatar_url || '无'}`);
        console.log(`   邮箱: ${user.email || '未设置'}`);
        console.log(`   创建时间: ${user.created_at}`);
        console.log('');
      });
    }
    
    // 2. 查看事件表使用了哪些用户ID
    console.log('\n=== 检查事件表中的用户引用 ===\n');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (!eventsError && events) {
      const eventUserIds = [...new Set(events.map(e => e.user_id))];
      console.log(`📝 事件表中使用了 ${eventUserIds.length} 个不同的用户ID:\n`);
      
      eventUserIds.forEach(userId => {
        const user = users?.find(u => u.id === userId);
        if (user) {
          console.log(`✅ ${userId} -> ${user.display_name}`);
        } else {
          console.log(`❌ ${userId} -> (在用户表中未找到)`);
        }
      });
    }
    
    // 3. 查看评论表使用了哪些用户ID
    console.log('\n=== 检查评论表中的用户引用 ===\n');
    const { data: comments, error: commentsError } = await supabase
      .from('story_comments')
      .select('user_id')
      .not('user_id', 'is', null);
    
    if (!commentsError && comments) {
      const commentUserIds = [...new Set(comments.map(c => c.user_id))];
      console.log(`💬 评论表中使用了 ${commentUserIds.length} 个不同的用户ID:\n`);
      
      commentUserIds.forEach(userId => {
        const user = users?.find(u => u.id === userId);
        if (user) {
          console.log(`✅ ${userId} -> ${user.display_name}`);
        } else {
          console.log(`❌ ${userId} -> (在用户表中未找到)`);
        }
      });
    }
    
    // 4. 提供修复建议
    console.log('\n=== 修复建议 ===\n');
    console.log('如果有些用户ID在事件/评论表中存在，但在用户表中不存在，可以运行以下命令创建:');
    console.log(`
    // 为缺失的用户创建记录
    const missingUserIds = ['用户ID1', '用户ID2', ...]; // 填入实际的缺失用户ID
    const newUsers = missingUserIds.map(id => ({
      id: id,
      display_name: \`用户\${id.substring(0, 6)}\`,
      created_at: new Date().toISOString()
    }));
    
    await supabase.from('users').insert(newUsers);
    `);
    
  } catch (err) {
    console.log('❌ 执行错误:', err.message);
  }
}

checkDatabaseUsers();