const { supabase } = require('./src/supabase.js');

async function updateDisplayNames() {
  try {
    // 更新张三
    const { error: error1 } = await supabase
      .from('users')
      .update({ display_name: '张三' })
      .eq('id', 'cafc38d9-d5de-4067-b72d-98e72b5e6e78');
    
    if (error1) {
      console.log('更新张三失败:', error1);
    } else {
      console.log('✅ 张三的显示名称已更新');
    }
    
    // 更新李四
    const { error: error2 } = await supabase
      .from('users')
      .update({ display_name: '李四' })
      .eq('id', 'cd6f948d-e757-46d6-abe5-4f2418cff5e3');
    
    if (error2) {
      console.log('更新李四失败:', error2);
    } else {
      console.log('✅ 李四的显示名称已更新');
    }
    
    // 查看结果
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, created_at')
      .in('id', ['cafc38d9-d5de-4067-b72d-98e72b5e6e78', 'cd6f948d-e757-46d6-abe5-4f2418cff5e3']);
    
    if (error) {
      console.log('查询结果失败:', error);
    } else {
      console.log('\n更新后的用户数据:');
      console.table(data);
    }
    
  } catch (err) {
    console.log('执行错误:', err.message);
  }
}

updateDisplayNames();