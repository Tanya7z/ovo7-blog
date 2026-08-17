import type { Block, Database, Post, RichText } from './interfaces'

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

export const MOCK_DATABASE: Database = {
  Title: '七罪的手账本',
  Description: 'La vida no tiene precio.',
  Icon: null,
  Cover: null,
}

export const MOCK_POSTS: Post[] = [
  {
    PageId: 'mock-unreal',
    Title: 'Unreal Engine：PIE 与 SIE',
    Icon: null,
    Cover: null,
    Slug: 'unreal-engine-pie-sie',
    Date: '2026-08-16T09:30:00.000Z',
    Tags: [{ id: 'tech', name: '技术', color: 'blue' }],
    Excerpt: '记录编辑器中两种运行模式的差异，以及调试时容易忽略的状态切换。',
    FeaturedImage: null,
    Rank: 0,
  },
  {
    PageId: 'mock-linux',
    Title: 'Linux 文件系统目录与 Tux 企鹅',
    Icon: null,
    Cover: null,
    Slug: 'linux-file-system',
    Date: '2026-08-12T12:00:00.000Z',
    Tags: [{ id: 'tech', name: '技术', color: 'blue' }],
    Excerpt: '从根目录出发，整理常见目录的职责和一套更容易记住的理解方式。',
    FeaturedImage: null,
    Rank: 0,
  },
  {
    PageId: 'mock-git-bash',
    Title: 'Git Bash：Windows 程序员入门与常用命令',
    Icon: null,
    Cover: null,
    Slug: 'git-bash-on-windows',
    Date: '2026-08-07T08:00:00.000Z',
    Tags: [{ id: 'tech', name: '技术', color: 'blue' }],
    Excerpt: '一份面向 Windows 环境的轻量命令行笔记，覆盖路径、文件和 Git 工作流。',
    FeaturedImage: null,
    Rank: 0,
  },
]

const MOCK_BLOCKS: Record<string, Block[]> = {
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
          richText('PIE 更接近实际游戏运行，SIE 则保留编辑器视角。理解两者的状态边界，会让调试过程顺畅很多。'),
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
        RichTexts: [richText('Linux 的目录结构并不神秘，它只是把系统资源组织成一棵有明确职责的树。')],
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
        RichTexts: [richText('从 pwd、ls 和 cd 开始，逐步建立一套可重复的终端工作习惯。')],
        Color: 'default',
      },
    },
  ],
}

export function getMockBlocks(pageId: string): Block[] {
  return MOCK_BLOCKS[pageId] || []
}
