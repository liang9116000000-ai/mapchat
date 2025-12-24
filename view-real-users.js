const { supabase } = require('./src/supabase.js');

async function viewRealUsers() {
  try {
    console.log('查看用户表中的真实数据...');
    
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
      data.forEach((user, index) => {
        console.log(`用户 ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Display Name: ${user.display_name || '(未设置)'}`);
        console.log(`  Email: ${user.email || '(未设置)'}`);
        console.log(`  Avatar: ${user.avatar_url || 'null'}`);
        console.log('---');
      });
    } else {
      console.log('用户表中没有数据');
    }
    
    // 检查auth系统中的用户信息
    console.log('\n尝试获取auth系统用户信息...');
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      if (authUsers && authUsers.users.length > 0) {
        console.log('Auth系统用户:');
        authUsers.users.forEach((user, index) => {
          console.log(`Auth用户 ${index + 1}:`);
          console.log(`  ID: ${user.id}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  Metadata: ${JSON.stringify(user.user_metadata)}`);
          console.log('---');
        });
      }
    } catch (err) {
      console.log('无法访问auth系统:', err.message);
    }
    
  } catch (err) {
    console.log('执行错误:', err.message);
  }
}

viewRealUsers();