// Notion「仓库」查询配置的单一真源。
// 同时被两种运行时消费：
//   1. 应用侧（server-constants.ts / client.ts，经 Vite/Astro 以 ESM 导入）
//   2. 构建脚本 scripts/blog-contents-cache.cjs（纯 Node，用动态 import 加载）
// 因此这里保持为不依赖 import.meta.env 的纯 ESM 模块。

// 各字段的默认属性名（与 Notion 数据库的中文字段对应）。
// 过滤相关默认留空 = 不过滤，发布「仓库」内全部页面。
export const PROPERTY_DEFAULTS = {
  title: '名称',
  slug: '',
  date: '日期',
  tags: '类型',
  excerpt: '',
  featuredImage: '封面',
  filterProperty: '',
  filterValue: '',
  filterType: 'select',
  sort: '创建时间',
}

// 贴画库字段名。新增「集合」选项不改这里；这里只锁字段名。
export const STICKER_DEFAULTS = {
  title: '名称',
  image: '图片',
  collection: '集合',
  caption: '说明',
  rotation: '角度',
  // 相对默认大小的倍数：1 = 原样，0.5 = 一半，2 = 两倍；空着等同于 1
  scale: '缩放倍数',
  order: '排序',
  enabled: '启用',
}

// 「探索」库字段名。收藏条目（阅读/动画/电影）与文章分库存放，字段各自独立。
export const EXPLORE_DEFAULTS = {
  title: '名称',
  type: '类型',
  cover: '封面',
  status: '状态',
  score: '评分',
  author: '作者',
  place: '地点',
  date: '日期',
}

// 「曲库」字段名。全站常驻播放器的曲目来源，与文章、贴画分库存放。
// 「音频」是 files 属性：既可上传到 Notion（构建期落地到 public/notion/），
// 也可以填外链（对象存储直链），两种来源由 firstFile 统一成 FileObject。
export const MUSIC_DEFAULTS = {
  title: '名称',
  composer: '作曲',
  audio: '音频',
  order: '排序',
  enabled: '启用',
}

// 依据过滤类型构造 Notion 查询的 filter 对象；未配置过滤时返回 null。
// 这是「发布过滤」规则的唯一权威实现，应用与缓存脚本都调用它。
export function buildPublishFilter(filterProperty, filterValue, filterType) {
  if (!filterProperty || !filterValue) {
    return null
  }

  if (filterType === 'checkbox') {
    return {
      property: filterProperty,
      checkbox: { equals: filterValue === 'true' },
    }
  }
  if (filterType === 'status') {
    return {
      property: filterProperty,
      status: { equals: filterValue },
    }
  }
  if (filterType === 'multi_select') {
    return {
      property: filterProperty,
      multi_select: { contains: filterValue },
    }
  }

  return {
    property: filterProperty,
    select: { equals: filterValue },
  }
}
