// 测试评论查询
import { supabase } from './src/supabase.js'

async function testCommentQuery() {
  console.log('=== 测试评论查询 ===')

  // 1. 测试获取所有评论
  const { data: allComments, error: allError } = await supabase
    .from('story_comments')
    .select('*')

  console.log('所有评论:', allComments)
  console.log('评论总数:', allComments?.length || 0)

  if (allError) {
    console.error('查询错误:', allError)
  }

  // 2. 测试按 story_id 查询
  if (allComments && allComments.length > 0) {
    const firstComment = allComments[0]
    const storyId = firstComment.story_id
    console.log('\n第一个评论的 story_id:', storyId)

    const { data: filteredComments, error: filterError } = await supabase
      .from('story_comments')
      .select('*')
      .eq('story_id', storyId)
      .is('reply_to', null)

    console.log(`story_id=${storyId} 的评论:`, filteredComments)
    console.log(`story_id=${storyId} 的评论数量:`, filteredComments?.length || 0)

    if (filterError) {
      console.error('过滤错误:', filterError)
    }
  } else {
    console.log('\n没有找到任何评论，请先添加一些评论')
  }
}

testCommentQuery()
