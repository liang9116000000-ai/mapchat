const { supabase } = require('./src/supabase.js');

async function checkUsers() {
  console.log('=== 检查用户表状态 ===');
  
  // 检查public.users表
  try {
    const { data: publicUsers, error } = await supabase
      .from('users')
      .select('id, display_name, created_at')
      .limit(5);
    
    if (error) {
      console.log('❌ 查询public.users表失败:', error.message);
    } else {
      console.log('✅ public.users表记录数:', publicUsers?.length || 0);
      console.log('示例记录:', publicUsers);
    }
  } catch (e) {
    console.log('❌ 查询public.users失败:', e.message);
  }
  
  // 检查当前认证状态
  const { data: { user } } = await supabase.auth.getUser();
  console.log('\\n=== 当前认证状态 ===');
  console.log('当前用户:', user ? user.id : '未登录');
  if (user) {
    console.log('用户邮箱:', user.email);
    console.log('用户元数据:', user.user_metadata);
  }
}

checkUsers();