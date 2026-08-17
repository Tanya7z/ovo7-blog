// 用 .env 里的博客 token 直接探测某个 data source 是否可读。
// 用法：node scripts/probe-notion.mjs <data_source_id>
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf-8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
)

const token = env.NOTION_API_SECRET
const dataSourceId = process.argv[2] || env.STICKER_DATA_SOURCE_ID
const version = '2026-03-11'

const headers = {
  Authorization: `Bearer ${token}`,
  'Notion-Version': version,
  'Content-Type': 'application/json',
}

console.log('探测 data source:', dataSourceId)

// 先列出这个 integration 到底能看到哪些东西，便于判断是不是「没分享」
const search = await fetch('https://api.notion.com/v1/search', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    page_size: 100,
    filter: { property: 'object', value: 'data_source' },
  }),
})
if (search.ok) {
  const body = await search.json()
  console.log(`--- integration 可见的 data source ${body.results.length} 个 ---`)
  body.results.forEach((item) => {
    const title = item.title?.map?.((t) => t.plain_text).join('') || '(无标题)'
    console.log(`  ${title} -> ${item.id}`)
  })
} else {
  console.log('search 失败:', search.status, await search.text())
}
console.log('---')

const retrieve = await fetch(
  `https://api.notion.com/v1/data_sources/${dataSourceId}`,
  { headers }
)
console.log('retrieve 状态:', retrieve.status)
const retrieveBody = await retrieve.json()
if (retrieve.ok) {
  console.log('名称:', JSON.stringify(retrieveBody.title))
  console.log('属性:', Object.keys(retrieveBody.properties || {}).join(' / '))
} else {
  console.log('错误:', retrieveBody.code, '-', retrieveBody.message)
}

const query = await fetch(
  `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
  { method: 'POST', headers, body: JSON.stringify({ page_size: 10 }) }
)
console.log('query 状态:', query.status)
const queryBody = await query.json()
if (query.ok) {
  console.log('条目数:', queryBody.results.length)
  queryBody.results.forEach((page) => {
    const props = page.properties || {}
    const name = (props['名称']?.title || []).map((t) => t.plain_text).join('')
    const files = props['图片']?.files || []
    console.log(
      `  - ${name || '(无名)'} | 集合=${props['集合']?.select?.name || '空'} | 启用=${props['启用']?.checkbox} | 图片数=${files.length} | 图片类型=${files[0]?.type || '无'}`
    )
  })
} else {
  console.log('错误:', queryBody.code, '-', queryBody.message)
}
