import { supabase } from './src/supabase.js';

async function updateTypeConstraint() {
  try {
    console.log('正在更新故事类型约束...');
    
    // 执行SQL来更新约束
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE map_events 
        DROP CONSTRAINT IF EXISTS map_events_type_check;
        
        ALTER TABLE map_events 
        ADD CONSTRAINT map_events_type_check CHECK (
          type = ANY (
            ARRAY['story', 'event', 'news', 'date', 'other']
          )
        );
      `
    });

    if (error) {
      console.error('更新约束失败:', error);
      
      // 如果上面的方法不行，尝试直接修改现有数据
      console.log('尝试直接修改现有数据...');
      
      // 将现有的 'accident' 类型改为 'story'
      const { error: updateError } = await supabase
        .from('map_events')
        .update({ type: 'story' })
        .eq('type', 'accident');
        
      if (updateError) {
        console.error('更新数据失败:', updateError);
      } else {
        console.log('成功将现有 accident 类型更新为 story');
      }
    } else {
      console.log('约束更新成功！');
    }
    
  } catch (error) {
    console.error('执行失败:', error);
  }
}

updateTypeConstraint();