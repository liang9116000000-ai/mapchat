const { supabase } = require('./src/supabase.js');

async function manageUserDisplayNames() {
  try {
    console.log('=== 查看用户表中的真实数据 ===\n');
    
    // 1. 查看当前用户表
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('查询用户表错误:', usersError);
      return;
    }
    
    if (users && users.length > 0) {
      console.log(`用户表中有 ${users.length} 个用户:`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Display Name: ${user.display_name || '(未设置)'}`);
        console.log(`   Email: ${user.email || '(未设置)'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    } else {
      console.log('用户表中没有数据');
    }
    
    // 2. 查看事件表中的用户ID，了解实际使用的用户
    console.log('\n=== 查看事件表中的用户ID ===\n');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('user_id')
      .is('user_id', 'not null');
    
    if (!eventsError && events) {
      const eventUserIds = [...new Set(events.map(e => e.user_id))];
      console.log('事件表中使用的用户ID:', eventUserIds.length);
      eventUserIds.forEach(id => {
        const user = users?.find(u => u.id === id);
        const displayName = user?.display_name || '(未在用户表中找到)';
        console.log(`- ${id}: ${displayName}`);
      });
    }
    
    // 3. 提供更新建议
    console.log('\n=== 更新建议 ===\n');
    console.log('如果你要更新用户的显示名称，可以使用以下格式:');
    console.log('await supabase.from("users").update({ display_name: "新名称" }).eq("id", "用户ID");');
    console.log('');
    console.log('例如:');
    console.log('await supabase.from("users").update({ display_name: "张三" }).eq("id", "cafc38d9-d5de-4067-b72d-98e72b5e6e78");');
    
  } catch (err) {
    console.log('执行错误:', err.message);
  }
}

manageUserDisplayNames();