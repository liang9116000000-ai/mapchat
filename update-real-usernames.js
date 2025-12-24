const { supabase } = require('./src/supabase.js');

async function updateRealUsernames() {
  try {
    console.log('=== 更新用户显示名称为真实姓名 ===\n');
    
    // 1. 查看当前用户
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.log('❌ 查询用户失败:', usersError.message);
      return;
    }
    
    console.log(`📊 当前用户表中有 ${users?.length || 0} 个用户:\n`);
    
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   当前显示名: ${user.display_name}`);
        console.log('');
      });
    }
    
    // 2. 示例：如何更新用户显示名称
    console.log('=== 更新示例 ===\n');
    console.log('你可以使用以下方式更新用户显示名称:');
    console.log(`
// 示例1：更新特定用户的显示名称
await supabase
  .from('users')
  .update({ display_name: '张三' })
  .eq('id', 'cafc38d9-d5de-4067-b72d-98e72b5e6e78');

// 示例2：批量更新多个用户
const updates = [
  { id: 'user-id-1', display_name: '张三' },
  { id: 'user-id-2', display_name: '李四' },
  { id: 'user-id-3', display_name: '王五' }
];

for (const update of updates) {
  await supabase
    .from('users')
    .update({ display_name: update.display_name })
    .eq('id', update.id);
}
    `);
    
    // 3. 如果需要，可以在这里直接执行更新
    console.log('\n=== 直接更新操作 ===\n');
    
    // 这里你可以添加实际的用户ID和对应的真实姓名
    const userUpdates = [
      // 取消注释并填入真实的用户ID和姓名：
      // { id: 'cafc38d9-d5de-4067-b72d-98e72b5e6e78', name: '张三' },
      // { id: 'cd6f948d-e757-46d6-abe5-4f2418cff5e3', name: '李四' },
    ];
    
    if (userUpdates.length > 0) {
      console.log('正在更新用户显示名称...');
      
      for (const update of userUpdates) {
        const { error } = await supabase
          .from('users')
          .update({ display_name: update.name })
          .eq('id', update.id);
        
        if (error) {
          console.log(`❌ 更新用户 ${update.id} 失败:`, error.message);
        } else {
          console.log(`✅ 更新用户 ${update.id} -> ${update.name}`);
        }
      }
    } else {
      console.log('⚠️  没有配置用户更新，请编辑此脚本并添加真实的用户ID和姓名');
    }
    
    // 4. 验证更新结果
    console.log('\n=== 验证更新结果 ===\n');
    const { data: updatedUsers, error: updatedError } = await supabase
      .from('users')
      .select('id, display_name')
      .order('created_at', { ascending: false });
    
    if (!updatedError && updatedUsers) {
      console.log('更新后的用户列表:');
      updatedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.id} -> ${user.display_name}`);
      });
    }
    
  } catch (err) {
    console.log('❌ 执行错误:', err.message);
  }
}

updateRealUsernames();