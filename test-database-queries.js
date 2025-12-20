import { dbService } from './src/utils/database.js'

async function testDatabaseQueries() {
  console.log('🔍 测试数据库关联查询...\n')

  try {
    // 1. 测试获取所有事件（关联用户）
    console.log('📋 获取所有事件（关联用户信息）:')
    const allEvents = await dbService.getAllEvents()
    console.log(`找到 ${allEvents.length} 个事件`)
    
    if (allEvents.length > 0) {
      const sampleEvent = allEvents[0]
      console.log('示例事件:', {
        id: sampleEvent.id,
        title: sampleEvent.title,
        user: sampleEvent.user ? {
          id: sampleEvent.user.id,
          display_name: sampleEvent.user.display_name,
          email: sampleEvent.user.email
        } : null,
        created_at: sampleEvent.created_at
      })
    }
    console.log('')

    // 2. 测试获取用户事件
    if (allEvents.length > 0 && allEvents[0].user_id) {
      console.log('👤 获取特定用户的事件:')
      const userEvents = await dbService.getUserEvents(allEvents[0].user_id)
      console.log(`用户有 ${userEvents.length} 个事件`)
      
      if (userEvents.length > 0) {
        console.log('用户事件示例:', {
          id: userEvents[0].id,
          title: userEvents[0].title,
          user: userEvents[0].user
        })
      }
      console.log('')
    }

    // 3. 测试获取用户资料
    console.log('🔐 测试用户资料查询:')
    const allUsers = await dbService.getAllUsers()
    console.log(`系统中有 ${allUsers.length} 个用户`)
    
    if (allUsers.length > 0) {
      const sampleUser = allUsers[0]
      console.log('示例用户:', {
        id: sampleUser.id,
        display_name: sampleUser.display_name,
        email: sampleUser.email,
        created_at: sampleUser.created_at
      })
    }
    
    console.log('\n✅ 数据库关联查询测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testDatabaseQueries()