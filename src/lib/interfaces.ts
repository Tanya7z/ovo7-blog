export interface Database {
  Title: string
  Description: string
  Icon: FileObject | Emoji | null
  Cover: FileObject | null
}

export interface Post {
  PageId: string
  Title: string
  Icon: FileObject | Emoji | null
  Cover: FileObject | null
  Slug: string
  Date: string
  /** Notion「类型」，网站展示为类目（可筛选） */
  Categories: SelectProperty[]
  /** Notion「领域」 */
  Domains: SelectProperty[]
  /** Notion「标签」关键词 */
  Labels: SelectProperty[]
  Excerpt: string
  FeaturedImage: FileObject | null
}

/** 贴画：按「集合」注册，新增集合只需在 Notion 加选项。 */
export interface Sticker {
  PageId: string
  Name: string
  Collection: string
  Caption: string
  Rotation: number | null
  /**
   * 相对默认大小的倍数（Notion「缩放倍数」）。
   * null / 未填 = 1；0.5 一半，2 两倍。渲染时会钳到合理区间。
   */
  Scale: number | null
  Order: number
  Image: FileObject | null
  /** Notion 页面的创建时间（ISO 字符串），用来显示「这张图是什么时候贴上去的」 */
  Created: string
}

/** 探索条目：阅读 / 动画 / 电影等收藏，是清单不是文章，因此不生成详情页。 */
export interface ExploreEntry {
  PageId: string
  Name: string
  Type: string
  Status: string
  Score: number | null
  Author: string
  Place: string
  Date: string
  Cover: FileObject | null
}

/** 「曲库」里的一首曲子，供全站常驻播放器按 Order 顺序播放。 */
export interface Track {
  PageId: string
  Name: string
  /** 作曲者 / 演奏者，显示在曲名后面；留空则不显示 */
  Composer: string
  Order: number
  Audio: FileObject | null
}

export interface Block {
  Id: string
  Type: string
  HasChildren: boolean

  Paragraph?: Paragraph
  Heading1?: Heading1
  Heading2?: Heading2
  Heading3?: Heading3
  BulletedListItem?: BulletedListItem
  NumberedListItem?: NumberedListItem
  ToDo?: ToDo
  Image?: Image
  File?: File
  Code?: Code
  Quote?: Quote
  Equation?: Equation
  Callout?: Callout
  SyncedBlock?: SyncedBlock
  Toggle?: Toggle
  Embed?: Embed
  Video?: Video
  Bookmark?: Bookmark
  LinkPreview?: LinkPreview
  Table?: Table
  ColumnList?: ColumnList
  TableOfContents?: TableOfContents
  LinkToPage?: LinkToPage
}

export interface Paragraph {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface Heading1 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export interface Heading2 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export interface Heading3 {
  RichTexts: RichText[]
  Color: string
  IsToggleable: boolean
  Children?: Block[]
}

export interface BulletedListItem {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface NumberedListItem {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface ToDo {
  RichTexts: RichText[]
  Checked: boolean
  Color: string
  Children?: Block[]
}

export interface Image {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
  Width?: number
  Height?: number
}

export interface Video {
  Caption: RichText[]
  Type: string
  External?: External
}

export interface File {
  Caption: RichText[]
  Type: string
  File?: FileObject
  External?: External
}

export interface FileObject {
  Type: string
  Url: string
  ExpiryTime?: string
}

/** 断言可选值存在；调用方已按 Type 分支后再读取 payload。 */
export function must<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`缺少 ${label}`)
  }
  return value
}

export function isEmojiIcon(icon: FileObject | Emoji): icon is Emoji {
  return icon.Type === 'emoji'
}

export function isExternalIcon(icon: FileObject | Emoji): icon is FileObject {
  return icon.Type === 'external'
}

export interface External {
  Url: string
}

export interface Code {
  Caption: RichText[]
  RichTexts: RichText[]
  Language: string
}

export interface Quote {
  RichTexts: RichText[]
  Color: string
  Children?: Block[]
}

export interface Equation {
  Expression: string
}

export interface Callout {
  RichTexts: RichText[]
  Icon: FileObject | Emoji | null
  Color: string
  Children?: Block[]
}

export interface SyncedBlock {
  SyncedFrom: SyncedFrom | null
  Children?: Block[]
}

export interface SyncedFrom {
  BlockId: string
}

export interface Toggle {
  RichTexts: RichText[]
  Color: string
  Children: Block[]
}

export interface Embed {
  Url: string
}

export interface Bookmark {
  Caption: RichText[]
  Url: string
}

export interface LinkPreview {
  Url: string
}

export interface Table {
  TableWidth: number
  HasColumnHeader: boolean
  HasRowHeader: boolean
  Rows: TableRow[]
}

export interface TableRow {
  Id: string
  Type: string
  HasChildren: boolean
  Cells: TableCell[]
}

export interface TableCell {
  RichTexts: RichText[]
}

export interface ColumnList {
  Columns: Column[]
}

export interface Column {
  Id: string
  Type: string
  HasChildren: boolean
  Children: Block[]
}

export interface List {
  Type: string
  ListItems: Block[]
}

export interface TableOfContents {
  Color: string
}

export interface RichText {
  Text?: Text
  Annotation: Annotation
  PlainText: string
  Href?: string
  Equation?: Equation
  Mention?: Mention
}

export interface Text {
  Content: string
  Link?: Link
}

export interface Emoji {
  Type: string
  Emoji: string
}

export interface Annotation {
  Bold: boolean
  Italic: boolean
  Strikethrough: boolean
  Underline: boolean
  Code: boolean
  Color: string
}

export interface Link {
  Url: string
}

export interface SelectProperty {
  id: string
  name: string
  color: string
}

export interface LinkToPage {
  Type: string
  PageId: string
}

export interface Mention {
  Type: string
  Page?: Reference
}

export interface Reference {
  Id: string
}
