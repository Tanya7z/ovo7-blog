import type {
  Block,
  Database,
  ExploreEntry,
  Post,
  RichText,
  Sticker,
  Track,
} from './interfaces'

const annotation = {
  Bold: false,
  Italic: false,
  Strikethrough: false,
  Underline: false,
  Code: false,
  Color: 'default',
}

function richText(content: string): RichText {
  return {
    Annotation: annotation,
    PlainText: content,
    Text: { Content: content },
  }
}

function paragraph(id: string, content: string): Block {
  return {
    Id: id,
    Type: 'paragraph',
    HasChildren: false,
    Paragraph: { RichTexts: [richText(content)], Color: 'default' },
  }
}

function heading1(id: string, content: string): Block {
  return {
    Id: id,
    Type: 'heading_1',
    HasChildren: false,
    Heading1: {
      RichTexts: [richText(content)],
      Color: 'default',
      IsToggleable: false,
    },
  }
}

function heading2(id: string, content: string): Block {
  return {
    Id: id,
    Type: 'heading_2',
    HasChildren: false,
    Heading2: {
      RichTexts: [richText(content)],
      Color: 'default',
      IsToggleable: false,
    },
  }
}

function callout(id: string, color: string, content: string): Block {
  return {
    Id: id,
    Type: 'callout',
    HasChildren: false,
    Callout: {
      RichTexts: [richText(content)],
      Icon: null,
      Color: color,
    },
  }
}

function image(id: string, caption: string): Block {
  return {
    Id: id,
    Type: 'image',
    HasChildren: false,
    Image: {
      Caption: [richText(caption)],
      Type: 'external',
      External: { Url: '/logo.png' },
    },
  }
}

export const MOCK_DATABASE: Database = {
  Title: '七罪的手账本',
  Description: 'La vida no tiene precio.',
  Icon: null,
  Cover: null,
}

export const MOCK_POSTS: Post[] = [
  {
    PageId: 'mock-tufte',
    Title: 'Tufte 阅读界面示例',
    Icon: null,
    Cover: null,
    Slug: 'tufte-layout',
    Date: '2026-08-17T12:00:00.000Z',
    Categories: [{ id: 'idea', name: '🎨 灵感', color: 'pink' }],
    Domains: [{ id: 'design', name: '🎨 设计', color: 'pink' }],
    Labels: [{ id: 'ui', name: 'UI设计', color: 'pink' }],
    Excerpt: '用一篇示例文核对旁注、三种配图宽度、引用与代码在阅读栏里的样子。',
    FeaturedImage: null,
  },
  {
    PageId: 'mock-unreal',
    Title: 'Unreal Engine：PIE 与 SIE',
    Icon: null,
    Cover: null,
    Slug: 'unreal-engine-pie-sie',
    Date: '2026-08-16T09:30:00.000Z',
    Categories: [{ id: 'concept', name: '📌 概念', color: 'blue' }],
    Domains: [{ id: 'tech', name: '💻 技术', color: 'blue' }],
    Labels: [
      { id: 'game', name: '游戏', color: 'red' },
      { id: 'ue', name: 'Unreal', color: 'blue' },
    ],
    Excerpt: '记录编辑器中两种运行模式的差异，以及调试时容易忽略的状态切换。',
    FeaturedImage: null,
  },
  {
    PageId: 'mock-linux',
    Title: 'Linux 文件系统目录与 Tux 企鹅',
    Icon: null,
    Cover: null,
    Slug: 'linux-file-system',
    Date: '2026-08-12T12:00:00.000Z',
    Categories: [{ id: 'concept', name: '📌 概念', color: 'blue' }],
    Domains: [
      { id: 'tech', name: '💻 技术', color: 'blue' },
      { id: 'culture', name: '📚 文化', color: 'yellow' },
    ],
    Labels: [{ id: 'linux', name: 'Linux', color: 'green' }],
    Excerpt: '从根目录出发，整理常见目录的职责和一套更容易记住的理解方式。',
    FeaturedImage: null,
  },
  {
    PageId: 'mock-git-bash',
    Title: 'Git Bash：Windows 程序员入门与常用命令',
    Icon: null,
    Cover: null,
    Slug: 'git-bash-on-windows',
    Date: '2026-08-07T08:00:00.000Z',
    Categories: [{ id: 'tutorial', name: '📖 教程', color: 'green' }],
    Domains: [
      { id: 'tech', name: '💻 技术', color: 'blue' },
      { id: 'tool', name: '🛠 工具', color: 'green' },
    ],
    Labels: [
      { id: 'term', name: '终端', color: 'green' },
      { id: 'tool', name: '工具', color: 'green' },
      { id: 'linux', name: 'Linux', color: 'green' },
    ],
    Excerpt:
      '一份面向 Windows 环境的轻量命令行笔记，覆盖路径、文件和 Git 工作流。',
    FeaturedImage: null,
  },
  {
    PageId: 'mock-thought',
    Title: '关于慢慢写的一点想法',
    Icon: null,
    Cover: null,
    Slug: 'slow-writing',
    Date: '2026-08-01T10:00:00.000Z',
    Categories: [{ id: 'log', name: '📝 日志', color: 'yellow' }],
    Domains: [{ id: 'life', name: '🌱 生活', color: 'gray' }],
    Labels: [],
    Excerpt: '手账不是赶工，是把遇见的事情认真摊开看一遍。',
    FeaturedImage: null,
  },
  {
    PageId: 'mock-life',
    Title: '周末散步记下的小事',
    Icon: null,
    Cover: null,
    Slug: 'weekend-walk',
    Date: '2026-07-28T16:00:00.000Z',
    Categories: [{ id: 'log', name: '📝 日志', color: 'yellow' }],
    Domains: [{ id: 'life', name: '🌱 生活', color: 'gray' }],
    Labels: [],
    Excerpt: '阳光、咖啡店的玻璃窗，以及一只不愿意被拍照的猫。',
    FeaturedImage: null,
  },
]

// mock 构建下的贴画：图片指向仓库里已有的静态文件，
// 让 build:mock 也能看到贴画板的排布与胶带效果。
export const MOCK_STICKERS: Sticker[] = [
  {
    PageId: 'mock-sticker-logo',
    Name: '这个就是我呀',
    Collection: '首页',
    Caption: '这个就是我呀',
    Rotation: null,
    Scale: null,
    Order: 1,
    Image: { Type: 'external', Url: '/logo.png' },
    Created: '2026-08-01T00:00:00.000Z',
  },
  {
    PageId: 'mock-sticker-favicon',
    Name: '小图章',
    Collection: '首页',
    Caption: '',
    Rotation: 4,
    // mock：刻意放大，方便 visually 核对「缩放倍数」是否生效
    Scale: 1.6,
    Order: 2,
    Image: { Type: 'external', Url: '/favicon.png' },
    Created: '2026-08-05T00:00:00.000Z',
  },
  {
    PageId: 'mock-sticker-explore',
    Name: '在看的东西',
    Collection: '探索',
    Caption: '',
    Rotation: null,
    Scale: 0.7,
    Order: 1,
    Image: { Type: 'external', Url: '/logo.png' },
    Created: '2026-08-10T00:00:00.000Z',
  },
]

// mock 构建下的探索条目：覆盖有封面/无封面、有评分/无评分几种组合，
// 便于在没有 Notion 凭据时也能看到拼贴网格的退化表现。
export const MOCK_EXPLORE_ENTRIES: ExploreEntry[] = [
  {
    PageId: 'mock-explore-anime-1',
    Name: 'BanG Dream! It’s MyGO!!!!!',
    Type: '动画',
    Status: '看过',
    Score: 9,
    Author: '',
    Place: '',
    Date: '2026-07-20',
    Cover: { Type: 'external', Url: '/logo.png' },
  },
  {
    PageId: 'mock-explore-anime-2',
    Name: '小城日常',
    Type: '动画',
    Status: '在看',
    Score: null,
    Author: '',
    Place: '',
    Date: '2026-07-02',
    Cover: null,
  },
  {
    PageId: 'mock-explore-movie-1',
    Name: 'Interstellar',
    Type: '电影',
    Status: '看过',
    Score: 10,
    Author: '',
    Place: '',
    Date: '2026-06-11',
    Cover: { Type: 'external', Url: '/favicon.png' },
  },
  {
    PageId: 'mock-explore-book-1',
    Name: '献给阿尔吉侬的花束',
    Type: '阅读',
    Status: '在看',
    Score: null,
    Author: '丹尼尔·凯斯',
    Place: '',
    Date: '2026-05-30',
    Cover: null,
  },
]

// mock 构建下的曲库：共用一段生成的测试音频，
// 让 build:mock 也能核对五线谱进度、切曲与跨页续播。
export const MOCK_TRACKS: Track[] = [
  {
    PageId: 'mock-track-prelude',
    Name: '前奏曲',
    Composer: '测试音',
    Order: 1,
    Audio: { Type: 'external', Url: '/audio/mock-prelude.wav' },
  },
  {
    PageId: 'mock-track-nocturne',
    Name: '夜曲',
    Composer: '',
    Order: 2,
    Audio: { Type: 'external', Url: '/audio/mock-prelude.wav' },
  },
]

const MOCK_BLOCKS: Record<string, Block[]> = {
  'mock-tufte': [
    {
      Id: 'mock-tufte-epigraph',
      Type: 'quote',
      HasChildren: false,
      Quote: {
        RichTexts: [
          richText(
            '网页首先应该像一篇好读的文章，而不是一堆花哨的组件。\n—— Edward Tufte'
          ),
        ],
        Color: 'default',
      },
    },
    paragraph(
      'mock-tufte-lead',
      '设计应当服务于信息本身。正文走中间一栏，补充说明放到右侧，读者不用跳到文末。'
    ),
    callout(
      'mock-tufte-mn',
      'default',
      '这是无编号的边注（margin note）：默认色 Callout。适合随手补充、不必编号的旁白。'
    ),
    heading1('mock-tufte-h1', '旁注与图片'),
    paragraph(
      'mock-tufte-sn-host',
      '带编号的 sidenote 会挂在上一段末尾，桌面出现在右栏，窄屏点编号才展开。'
    ),
    callout(
      'mock-tufte-sn-1',
      'gray',
      '灰色 Callout 会变成编号 sidenote。同一篇文章里编号自动递增。'
    ),
    callout(
      'mock-tufte-sn-2',
      'gray_background',
      'gray_background 同样视为 sidenote，可以连续跟在段落后。'
    ),
    paragraph(
      'mock-tufte-img-intro',
      '图片默认进右栏，像旧书插图；信息量大时再占正文栏或全宽。'
    ),
    image('mock-tufte-img-margin', '旁注小图：默认不写前缀。'),
    paragraph(
      'mock-tufte-img-col',
      '流程图、截图这类需要看清细节的，用「正文」前缀留在主栏。'
    ),
    image('mock-tufte-img-column', '[正文] 与正文同宽的配图。'),
    paragraph(
      'mock-tufte-img-full',
      '地图、时间线、大幅数据图才用全宽，不是为了把页面撑满。'
    ),
    image('mock-tufte-img-fullwidth', '[全宽] 横跨内容区的大图。'),
    heading2('mock-tufte-h2', '引用与代码'),
    paragraph(
      'mock-tufte-code-intro',
      '代码块仍用 Prism 高亮和复制按钮，只把底色收进纸面令牌。'
    ),
    {
      Id: 'mock-tufte-code',
      Type: 'code',
      HasChildren: false,
      Code: {
        Caption: [],
        RichTexts: [richText('const measure = "55%"\nconsole.log(measure)')],
        Language: 'javascript',
      },
    },
  ],
  'mock-unreal': [
    {
      Id: 'mock-unreal-heading',
      Type: 'heading_2',
      HasChildren: false,
      Heading2: {
        RichTexts: [richText('两种模式，各自解决什么问题？')],
        Color: 'default',
        IsToggleable: false,
      },
    },
    {
      Id: 'mock-unreal-paragraph',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [
          richText(
            'PIE 更接近实际游戏运行，SIE 则保留编辑器视角。理解两者的状态边界，会让调试过程顺畅很多。'
          ),
        ],
        Color: 'default',
      },
    },
    {
      Id: 'mock-unreal-paragraph-2',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [
          richText(
            '切换模式时，世界状态、输入和调试器附着点都会变化。把这些差异记下来，比事后回想要可靠。'
          ),
        ],
        Color: 'default',
      },
    },
  ],
  'mock-linux': [
    {
      Id: 'mock-linux-paragraph',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [
          richText(
            'Linux 的目录结构并不神秘，它只是把系统资源组织成一棵有明确职责的树。'
          ),
        ],
        Color: 'default',
      },
    },
  ],
  'mock-git-bash': [
    {
      Id: 'mock-git-paragraph',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [
          richText('从 pwd、ls 和 cd 开始，逐步建立一套可重复的终端工作习惯。'),
        ],
        Color: 'default',
      },
    },
  ],
  'mock-thought': [
    {
      Id: 'mock-thought-paragraph',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [richText('写下来，是为了以后还能再遇见一次自己。')],
        Color: 'default',
      },
    },
  ],
  'mock-life': [
    {
      Id: 'mock-life-paragraph',
      Type: 'paragraph',
      HasChildren: false,
      Paragraph: {
        RichTexts: [
          richText('散步的好处是：什么都不用完成，只要走完这一段路。'),
        ],
        Color: 'default',
      },
    },
  ],
}

export function getMockBlocks(pageId: string): Block[] {
  return MOCK_BLOCKS[pageId] || []
}
