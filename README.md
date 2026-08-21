# 七罪的手账本

`blog.ovo7.cc` 的 Astro 博客（新仓库）。内容来自 Notion「🗂️ 仓库」，使用 [astro-notion-blog](https://github.com/otoyo/astro-notion-blog) 作为内容引擎，界面为自研文艺纸本风格。

## 内容规则

- 标题：`名称`
- 发布范围：**仓库内全部页面**（不再按「技术」过滤）
- 日期：优先读取 `日期`，为空时使用页面创建时间
- 分类：`类型`（技术 / 生活 / 想法 / 阅读 / 动画 / 电影）
- 题图：`封面`
- 地址：若无单独 Slug 字段，由标题和页面 ID 生成稳定地址

写作仍在 Notion「七罪的手账本。」里完成。任务、生活库、灵感、探索不会同步到本站。

## 视觉

- 字体：拉丁用 ET Book；中文（标题与正文）统一朱雀仿宋，缺字时回退系统宋体。
- 气质：米白纸底 `#fffff8`（系统深色时 `#151515`）+ Tufte 非对称栏 + 首页拼贴手账
- Logo：`public/logo.png`（Notion 手账本页面图标同一张插图）

## Tufte 写作约定

在 Notion 里按颜色和图片说明来控制阅读栏版式。

**Callout（旁注）**

- **推荐（句中编号）**：在正文段（或引用块）内需要角标的位置写字面量 `[*]`，下一块用灰色 / 灰色背景 Callout 写注释。发布后 `[*]` 变成编号，Callout 进右栏 sidenote，正文不断行。
- **兼容（段末编号）**：段落后直接跟灰色 Callout、段内没有 `[*]` 时，编号仍出现在上一段末尾。
- 默认色（无背景）：右侧无编号边注（margin note），挂在上一段末尾。
- 其他颜色：仍是色块提示框

一段里可写多个 `[*]`，后面连续灰色 Callout 会按顺序配对。多余的 `[*]` 会静默去掉。

**图片 / 视频说明文字**

- 不写前缀：旁注图（默认，进右栏）
- 以 `正文` 或 `[正文]` 开头：与正文同宽
- 以 `全宽` 或 `[全宽]` 开头：横跨内容区

前缀只用于标记，发布时不会显示给读者。

引用块若最后一行以 `—` / `——` 开头（或很短的署名），会按 epigraph 排。

## 本地运行

1. 在 Notion 创建只读 Integration。
2. 打开「🗂️ 仓库」页面（不要连手账本上的「知识」卡片），右上角分享 → 连接 → 添加该 Integration。
3. 复制 `.env.example` 为 `.env`，填入 `NOTION_API_SECRET`。
4. 安装依赖并启动：

```bash
npm ci
npm run dev
```

无密钥时可用 mock 预览界面：

```bash
npm run dev:mock
```

常用检查：

```bash
npm run lint
npm run check
npm run build
# 或
npm run build:mock
```

## 上游

基于 `otoyo/astro-notion-blog` 0.12.0，遵循其 MIT License。
