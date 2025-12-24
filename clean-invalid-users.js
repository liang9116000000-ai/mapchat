const { supabase } = require('./src/supabase.js');

async function cleanInvalidUsers() {
  try {
    console.log('=== 清理不存在的用户数据 ===\n');
    
    // 1. 获取用户表中存在的用户
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id');
    
    if (usersError) {
      console.log('❌ 查询现有用户失败:', usersError.message);
      return;
    }
    
    const existingUserIds = existingUsers?.map(u => u.id) || [];
    console.log(`✅ 用户表中有 ${existingUserIds.length} 个用户`);
    
    // 2. 检查各表中的无效用户引用
    const tables = [
      { name: 'events', column: 'user_id' },
      { name: 'story_comments', column: 'user_id' },
      { name: 'chat_messages', column: 'user_id' }
    ];
    
    for (const table of tables) {
      console.log(`\n🔍 检查 ${table.name} 表...`);
      
      const { data: records, error: tableError } = await supabase
        .from(table.name)
        .select('id, ' + table.column)
        .not(table.column, 'is', null);
      
      if (tableError) {
        console.log(`❌ 查询 ${table.name} 失败:`, tableError.message);
        continue;
      }
      
      if (records && records.length > 0) {
        const invalidRecords = records.filter(record => 
          !existingUserIds.includes(record[table.column])
        );
        
        if (invalidRecords.length > 0) {
          console.log(`⚠️  ${table.name} 表中有 ${invalidRecords.length} 条记录引用了不存在的用户:`);
          invalidRecords.forEach(record => {
            console.log(`   - ID: ${record.id}, 用户ID: ${record[table.column]}`);
          });
          
          // 询问是否删除这些记录
          console.log(`\n🗑️  建议删除这些无效记录`);
          
          // 如果要删除，可以使用以下代码（注释掉以避免误操作）:
          /*
          const { error: deleteError } = await supabase
            .from(table.name)
            .delete()
            .in(table.column, invalidRecords.map(r => r[table.column]));
          
          if (deleteError) {
            console.log(`❌ 删除 ${table.name} 中的无效记录失败:`, deleteError.message);
          } else {
            console.log(`✅ 成功删除 ${table.name} 中的 ${invalidRecords.length} 条无效记录`);
          }
          */
        } else {
          console.log(`✅ ${table.name} 表中的所有用户引用都有效`);
        }
      } else {
        console.log(`📝 ${table.name} 表中没有数据`);
      }
    }
    
    // 3. 显示当前有效用户
    console.log('\n=== 当前有效用户 ===\n');
    const { data: userInfo, error: userInfoError } = await supabase
      .from('users')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false });
    
    if (!userInfoError && userInfo) {
      console.log(`👥 有效用户列表 (${userInfo.length} 个):`);
      userInfo.forEach((user, index) => {
        console.log(`${index + 1}. ${user.id} -> ${user.display_name}`);
      });
    }
    
    console.log('\n=== 清理建议 ===\n');
    console.log('要完全清理无效用户数据，可以:');
    console.log('1. 手动删除各表中引用不存在用户的记录');
    console.log('2. 或使用提供的删除代码（取消注释后运行）');
    
  } catch (err) {
    console.log('❌ 执行错误:', err.message);
  }
}

cleanInvalidUsers();