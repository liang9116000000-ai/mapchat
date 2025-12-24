const { dbServiceSimple } = require('./src/utils/database-simple.js');

async function testStoryDisplay() {
  try {
    console.log('=== 测试故事数据显示 ===\n');
    
    // 1. 测试获取所有事件
    console.log('📍 测试获取事件数据...');
    const events = await dbServiceSimple.getAllEvents();
    
    if (events && events.length > 0) {
      console.log(`✅ 成功获取 ${events.length} 个事件:\n`);
      
      events.forEach((event, index) => {
        console.log(`${index + 1}. 事件标题: ${event.title || '(无标题)'}`);
        console.log(`   事件描述: ${event.description?.substring(0, 50) || '(无描述)'}${event.description?.length > 50 ? '...' : ''}`);
        console.log(`   用户ID: ${event.user?.id || '无'}`);
        console.log(`   用户名: ${event.user?.display_name || '无用户信息'}`);
        console.log(`   时间: ${event.timestamp || event.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ 没有获取到任何事件数据');
    }
    
    // 2. 测试获取评论数据（如果有事件）
    if (events && events.length > 0) {
      const firstEvent = events[0];
      console.log(`💬 测试获取第一个事件的评论 (事件ID: ${firstEvent.id})...`);
      
      const comments = await dbServiceSimple.getStoryComments(firstEvent.id);
      
      if (comments && comments.length > 0) {
        console.log(`✅ 成功获取 ${comments.length} 条评论:\n`);
        
        comments.forEach((comment, index) => {
          console.log(`${index + 1}. 评论内容: ${comment.content?.substring(0, 50) || '(无内容)'}${comment.content?.length > 50 ? '...' : ''}`);
          console.log(`   用户ID: ${comment.user?.id || '无'}`);
          console.log(`   用户名: ${comment.user?.display_name || '无用户信息'}`);
          
          if (comment.replies && comment.replies.length > 0) {
            console.log(`   回复数量: ${comment.replies.length}`);
            comment.replies.forEach((reply, replyIndex) => {
              console.log(`     ${replyIndex + 1}. ${reply.content?.substring(0, 30) || '(无内容)'} - ${reply.user?.display_name || '无用户信息'}`);
            });
          }
          console.log('');
        });
      } else {
        console.log('ℹ️  该事件没有评论');
      }
    }
    
    // 3. 测试群组消息
    console.log('💭 测试获取群组消息...');
    const messages = await dbServiceSimple.getGroupMessages('test-group-id');
    
    if (messages && messages.length > 0) {
      console.log(`✅ 成功获取 ${messages.length} 条消息:\n`);
      
      messages.slice(0, 3).forEach((message, index) => {
        console.log(`${index + 1}. 消息: ${message.content?.substring(0, 30) || '(无内容)'}...`);
        console.log(`   用户ID: ${message.user_id || '无'}`);
        console.log(`   用户名: ${message.user_name || '无用户信息'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  测试群组没有消息（这是正常的）');
    }
    
    console.log('🎉 故事数据测试完成！');
    
  } catch (err) {
    console.log('❌ 测试失败:', err.message);
  }
}

testStoryDisplay();