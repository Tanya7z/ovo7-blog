# Tufte 正文排版对齐（内联 + 读句感）

> **For agentic workers:** 按 Task 顺序做；可本会话内联完成。Steps 用 checkbox 跟踪。
>
> 来源：对照 https://edwardtufte.github.io/tufte-css/ 的审查结论 + 站主对链接的澄清（标题无线、正文有线）。

**Goal:** 正文「句内」与「读句感」更接近 Tufte：灰阶纪律、正文链接常驻下划线（标题豁免）、轻量引用/列表/hr/表格/代码，少 Notion 色块干扰。

**Architecture:** 以 `tufte.css` 为单一视觉真源；组件只保留结构与必要 scoped 覆盖。彩色 Callout / 彩色文字：正文内弱化或映射，不删 Notion 写作能力。

**Tech Stack:** Astro Notion blocks + `src/styles/tufte.css` + `notion-color.css`

**Spec:** 审查摘要（内联层差距最大 + 块级读句感残留）+ 用户澄清的链接策略

---

## Decisions（执行时按此，勿再猜）

| 项                           | 决定                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 正文链接                     | 仅 `.post-body` 内常驻下划线、墨色                                                                                |
| 标题/品牌/顶栏/列表/首页入口 | 默认无线（不再全局下划线再豁免）                                                                                  |
| 节标题锚点                   | `.post-body` 内再关掉下划线                                                                                       |
| 正文彩色文字                 | `.post-body` 内忽略颜色 class，回墨色（保留 DOM class 亦可）                                                      |
| 正文彩色背景 span            | 忽略背景，或极淡 `--soft`；不以彩虹示人                                                                           |
| 彩色 Callout（非灰/默认）    | 保留块，但去掉花哨边框色，改成轻提示（墨色 + 细线/`--soft`）                                                      |
| 行内 code                    | 去色块，仅等宽；字号贴近 `1.0rem`                                                                                 |
| Notion 下划线 `<u>`          | 改为无下划线的轻强调（如 `font-style: italic` 或 `border-bottom: 1px dotted` 且细弱），避免与链接抢「实线下划线」 |
| 粗斜体                       | `<b>`→`<strong>`，`<i>`→`<em>`                                                                                    |
| 旁注色                       | 改回正文墨色（或极接近），不再用明显 `--muted`                                                                    |
| 普通 blockquote              | 去左边框；宽随正文栏；署名右对齐已有 epigraph 路径则保持                                                          |
| 代码块                       | 减 UI：弱化框/底；Copy 可留但视觉更淡；**保留彩色语法高亮**                                                       |
| 表格                         | 减单元格「电子表」感；表头可无底或极淡；可选 sans                                                                 |
| 列表                         | 接近原版：约 50% + `padding-inline-start: 5%`（在 `.post-body` 内）                                               |
| hr                           | 细线、随正文栏宽、颜色用 `--line`                                                                                 |
| drop-cap / newthought        | 本轮**不改**写作入口；drop-cap 可留；不强制接 newthought                                                          |
| 图注富文本                   | Caption 尽量保留 RichText（至少链接/斜体），不要纯字符串压扁                                                      |

---

## File map

| File                                                       | Responsibility                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/styles/tufte.css`                                     | 链接默认/豁免、行内 code、旁注色、blockquote、列表、hr、表格基线 |
| `src/styles/notion-color.css`                              | 或由 `tufte.css` 在 `.post-body` 覆盖彩色；二选一，避免双真源    |
| `src/components/notion-blocks/annotations/Anchor.astro`    | 删 hover-only                                                    |
| `src/components/notion-blocks/annotations/Bold.astro`      | `strong`                                                         |
| `src/components/notion-blocks/annotations/Italic.astro`    | `em`                                                             |
| `src/components/notion-blocks/annotations/Underline.astro` | 非链接式强调                                                     |
| `src/components/notion-blocks/annotations/Code.astro`      | 仅结构；样式走全局                                               |
| `src/components/notion-blocks/Quote.astro`                 | 普通引用吃全局；epigraph 保持                                    |
| `src/components/notion-blocks/Callout.astro`               | 彩色 callout 视觉降噪                                            |
| `src/components/notion-blocks/Code.astro`                  | 代码块减装饰                                                     |
| `src/components/notion-blocks/Table.astro`                 | 表格减描边/表头底                                                |
| `src/components/notion-blocks/Divider.astro`               | 对齐全局 `hr`                                                    |
| `src/components/notion-blocks/Caption.astro`               | 输出 RichText，非整段纯文本                                      |
| `src/components/notion-blocks/Mention.astro`               | 正文 mention 跟链接规则                                          |
| mock 文（可选）                                            | `src/lib/mock-content.ts` 加少量样例便于肉眼验收                 |

---

### Task 1: 链接 — 正文常驻、标题豁免

**Files:** `src/styles/tufte.css`, `annotations/Anchor.astro`, 可选 `Mention.astro`

- [x] **Step 1: 全局默认改为常驻下划线**

```css
/* 链接：墨色 + 常驻下划线（Tufte）；标题/品牌见豁免 */
a:link,
a:visited {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.12em;
  text-decoration-thickness: 0.05em;
}
```

- [x] **Step 2: 豁免标题与 chrome**

```css
.brand,
.brand:hover,
.skip-link,
.skip-link:hover,
.post-title,
.post-title:hover,
.post-body a:has(> h2),
.post-body a:has(> h3),
.post-body h2 a,
.post-body h3 a {
  text-decoration: none;
}
```

`:has` 不稳时：给 `Heading*.astro` 外层 `<a class="heading-anchor">`，豁免改该类。

- [x] **Step 3: 删 `Anchor.astro` 的 `<style>`**；正文 `Mention` 靠全局常驻；TOC/Bookmark/首页卡片不动（非句内链）。

- [x] **Step 4: 自检** `npm run check` + `npm run build:mock` 通过；肉眼看 `/posts/tufte-layout`。

---

### Task 2: 内联层 — 灰阶、code、强调标签

**Files:** `tufte.css`（和/或 `notion-color.css`）、`Bold.astro`、`Italic.astro`、`Underline.astro`

- [x] **Step 1: `.post-body` 内关掉彩虹字/彩虹底**

在 `tufte.css` 末尾加（示例）：

```css
.post-body .gray,
.post-body .brown,
.post-body .orange,
.post-body .yellow,
.post-body .green,
.post-body .blue,
.post-body .purple,
.post-body .pink,
.post-body .red {
  color: inherit;
}
.post-body [class$='-background'] {
  background: transparent !important;
}
```

说明：旁注/epigraph 若也在 `.post-body` 内，同样灰阶——符合 Tufte。Callout 色块用组件 class，勿依赖这些 span 色。

- [x] **Step 2: 行内 `code`**

```css
code {
  font-family: var(--font-mono);
  font-size: 1rem;
  line-height: 1.42;
  padding: 0;
  background: transparent;
  color: inherit;
}
pre code {
  /* 保持块内 code 透明底 */
}
```

- [x] **Step 3: Bold/Italic 语义**

`Bold.astro` → `<strong>`；`Italic.astro` → `<em>`。

- [x] **Step 4: Underline 与链接解耦**

不要用实线 `text-decoration: underline`。例如：

```astro
<span class="emph"><slot /></span>
```

```css
.post-body .emph {
  font-style: italic;
  /* 或：border-bottom: 1px dotted color-mix(in srgb, var(--ink) 35%, transparent); */
}
```

- [x] **Step 5: 旁注改回墨色**

```css
.sidenote,
.marginnote {
  color: var(--ink); /* 去掉 var(--muted) */
}
```

编号仍可用 old-style 数字字体。

---

### Task 3: 块级读句感 — 引用、列表、hr、表、代码、Callout

**Files:** `tufte.css`, `Quote.astro`, `Divider.astro`, `Table.astro`, `Code.astro`, `Callout.astro`

- [x] **Step 1: 普通 `blockquote`**

去掉左边框与强制 muted；与正文同墨色、斜体可留：

```css
blockquote {
  margin: 1.5rem 0;
  border-left: none;
  padding-left: 0;
  color: var(--ink);
  font-style: italic;
}
div.epigraph > blockquote {
  /* 保持现有无边框 + footer 右齐 */
}
```

- [x] **Step 2: `.post-body` 列表宽度**

```css
.post-body ul,
.post-body ol,
.post-body dl {
  width: 90%; /* 相对 .post-body 的 55% 栏：约等于原版 50/55 */
  padding-inline-start: 5%;
  box-sizing: border-box;
}
```

按实机微调：目标是列表略窄于段落、有缩进，而不是再套一层 55%。

- [x] **Step 3: `Divider.astro`**

删掉 `#dedede` 背景条；用全局：

```css
hr {
  display: block;
  height: 1px;
  width: 100%; /* 已在 .post-body 55% 栏内 */
  border: 0;
  border-top: 1px solid var(--line);
  margin: 2rem 0;
  background: none;
}
```

- [x] **Step 4: 表格减噪**

`tufte.css` / `Table.astro`：弱边框或只保留横线；`th` 无重底色；可选：

```css
.post-body .table {
  font-family: var(--font-sans);
  font-size: 1.2rem;
}
```

- [x] **Step 5: 代码块减 UI**（保留 `syntax-coloring.css` 彩色高亮）

`Code.astro`：去掉厚 padding/重边框感；scrollbar/Copy 留淡色即可。

- [x] **Step 6: 彩色 Callout**

非 sidenote/marginnote 的 `.callout`：统一 `border: 1px solid var(--line); background: var(--soft); color: var(--ink)`，**不要**再吃 Notion 彩虹 `*-background`（可在组件上去掉 color class，或 CSS 覆盖）。

---

### Task 4: 图注保留内联

**Files:** `Caption.astro`

- [x] **Step 1: 用 `RichText` 渲染 `displayTexts`**，不再 `.map` 拼纯字符串。
- [x] **Step 2: 旁注图/正文图/全宽图各看一眼**，确认链接有下划线、斜体可见。

---

### Task 5: 总验收

Run: `npm run dev:mock`，打开 Tufte mock 文 + 一篇含链接/代码/引用/列表/表/Callout 的文。

- [x] 段内链接有线；文章标题、节标题、brand 无线
- [x] 正文无彩虹字/彩虹底
- [x] 行内 code 无色块
- [x] `<u>` 不再像链接（改 `.emph` 斜体）
- [x] 旁注接近正文墨色
- [x] 引用无左边框；hr 细线；列表有合适缩进
- [x] 表/代码块/彩色 Callout 不抢眼（代码块保留语法色）
- [x] 图注可点链接（若有）
- [x] Run: `npm run check` + `npm run build:mock`（0 errors）

- [ ] **Commit**（仅用户要求时）按改动写一句 why，例如：`Align article typography with Tufte: body links, greyscale, lighter blocks.`

---

## Out of scope（本轮不做）

- 首页拼贴 / Bookmark 卡片链接样式
- 强制接入 `newthought` 写作约定；改掉 drop-cap
- ImageQuilt、iframe-wrapper 大改
- 深色模式专项重做（只保证变量仍生效）
