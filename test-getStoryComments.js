import { dbServiceSimple } from './src/utils/database-simple.js'

async function testGetStoryComments() {
  console.log('=== 测试获取故事评论 ===')

  const storyId = 5
  console.log('请求的 storyId:', storyId, 'type:', typeof storyId)

  const comments = await dbServiceSimple.getStoryComments(storyId)

  console.log('返回的评论:', comments)
  console.log('评论数量:', comments.length)
}

testGetStoryComments()
