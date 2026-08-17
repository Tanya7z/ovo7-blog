# 七罪的手账本

`blog.ovo7.cc` 的 Astro 博客。内容来自现有 Notion「仓库」数据库，使用
[astro-notion-blog](https://github.com/otoyo/astro-notion-blog) 作为博客内核。

## 内容规则

- 标题：`名称`
- 发布范围：`类型 = 技术`
- 日期：优先读取 `日期`，为空时使用页面创建时间
- 分类：`类型`
- 题图：`封面`
- 地址：如果没有单独的 Slug 字段，会由标题和页面 ID 自动生成稳定地址

只要文章仍位于当前数据库且类型为「技术」，下一次构建就会同步到博客。

## 本地运行

1. 在 Notion 创建只读 Integration。
2. 将「仓库」数据库分享给该 Integration。
3. 复制 `.env.example` 为 `.env`，填入 `NOTION_API_SECRET`。
4. 安装依赖并启动：

```bash
npm ci
npm run dev
```

常用检查：

```bash
npm run lint
npm run check
npm run build
```

## 阿里云自动同步

部署文件位于 `deploy/`。服务器每 10 分钟从 Notion 重新构建一次，只有构建成功后
才会切换 Nginx 的站点目录，因此失败不会影响当前线上版本。

首次准备服务器（不会自动启用站点或定时器）：

```bash
sudo ./deploy/install-server.sh /tmp/ovo7-blog-source.tar.gz
```

服务器约定：

- 源码：`/opt/ovo7-blog`
- 密钥：`/etc/ovo7-blog.env`
- 站点：`/var/www/blog.ovo7.cc/current`
- 定时器：`ovo7-blog-sync.timer`
- Node.js：`/opt/ovo7-node`（项目独立的 Node 22 LTS，不修改系统 Node）

Notion 密钥只保存在服务器环境文件中，不进入 Git。

## 上游

基于 `otoyo/astro-notion-blog` 0.12.0，遵循其 MIT License。
