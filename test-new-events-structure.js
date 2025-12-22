import { dbService } from './src/utils/database.js'

async function testNewEventsStructure() {
  console.log('🗺️ 测试新的事件表结构...\n')

  try {
    // 1. 测试获取所有事件
    console.log('📋 获取所有事件:')
    const allEvents = await dbService.getAllEvents()
    console.log(`找到 ${allEvents.length} 个事件`)
    
    if (allEvents.length > 0) {
      const sampleEvent = allEvents[0]
      console.log('示例事件:', {
        id: sampleEvent.id, // 现在是数字
        title: sampleEvent.title,
        description: sampleEvent.description,
        type: sampleEvent.type,
        timestamp: sampleEvent.timestamp, // 新的时间字段
        created_at: sampleEvent.created_at,
        user: sampleEvent.user
      })
    }
    console.log('')

    // 2. 测试添加事件
    console.log('➕ 测试添加事件:')
    const testEvent = {
      title: '测试事件',
      description: '这是一个测试事件描述',
      type: 'event',
      location: { lat: 39.9042, lng: 116.4074 },
      user_id: '00000000-0000-0000-0000-000000000000' // 测试用户ID
    }
    
    const addedEvent = await dbService.addEvent(testEvent)
    if (addedEvent) {
      console.log('✅ 添加成功:', {
        id: addedEvent.id, // 自增ID
        timestamp: addedEvent.timestamp,
        type: addedEvent.type
      })
    } else {
      console.log('❌ 添加失败')
    }
    console.log('')

    // 3. 测试类型约束
    console.log('🔍 测试类型约束:')
    const validTypes = ['accident', 'event', 'news', 'other']
    const typesCheck = allEvents.every(event => validTypes.includes(event.type))
    console.log(`类型约束检查: ${typesCheck ? '✅ 通过' : '❌ 失败'}`)
    
    // 4. 测试用户关联
    console.log('👤 测试用户关联:')
    const eventsWithUsers = allEvents.filter(event => event.user)
    console.log(`有用户关联的事件: ${eventsWithUsers.length}/${allEvents.length}`)
    
    if (eventsWithUsers.length > 0) {
      const sampleWithUser = eventsWithUsers[0]
      console.log('用户关联示例:', {
        eventId: sampleWithUser.id,
        userEmail: sampleWithUser.user?.email,
        userDisplayName: sampleWithUser.user?.display_name
      })
    }
    
    console.log('\n✅ 新事件表结构测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testNewEventsStructure()