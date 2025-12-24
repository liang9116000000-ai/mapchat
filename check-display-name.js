const { supabase } = require('./src/supabase.js');

async function checkUsers() {
  try {
    console.log('正在查询用户表...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (error) {
      console.log('查询用户表错误:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`找到 ${data.length} 个用户:`);
      data.forEach(user => {
        console.log(`- ID: ${user.id}`);
        console.log(`  Display Name: ${user.display_name}`);
        console.log(`  Avatar: ${user.avatar_url || 'null'}`);
        console.log(`  Created: ${user.created_at}`);
        console.log('---');
      });
    } else {
      console.log('用户表中没有数据');
    }
    
    // 也检查一下事件表中的用户ID
    console.log('\n正在查询事件表中的用户ID...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('user_id')
      .limit(5);
    
    if (eventsError) {
      console.log('查询事件表错误:', eventsError);
    } else if (events && events.length > 0) {
      console.log('事件中的用户ID:');
      events.forEach(event => {
        console.log(`- ${event.user_id}`);
      });
    }
    
  } catch (err) {
    console.log('执行错误:', err.message);
  }
}

checkUsers();