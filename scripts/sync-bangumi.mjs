// 把 Bangumi 用户 717607 的动画收藏增量写入 Notion 探索库。
// 电影 / 阅读等手改条目一律不碰；消失的动画不删页，只把状态改成「抛弃」。
import 'dotenv/config';
import { Client } from '@notionhq/client';

const BGM_USER_ID = process.env.BANGUMI_USER_ID || '717607';
const BGM_USER_AGENT = 'ovo7-blog/0.12.0 (https://ovo7.cc)';
const COLLECTION_ANIME = '动画';
const PAGE_SIZE = 100;

const STATUS_BY_TYPE = {
  1: '想看',
  2: '看过',
  3: '在看',
  4: '搁置',
  5: '抛弃',
};

const auth = process.env.NOTION_API_SECRET;
const dataSourceId = process.env.EXPLORE_DATA_SOURCE_ID;
if (!auth || !dataSourceId) {
  console.error('缺少 NOTION_API_SECRET 或 EXPLORE_DATA_SOURCE_ID');
  process.exit(1);
}

const notion = new Client({ auth, notionVersion: '2026-03-11' });

function titleOf(page) {
  const title = page.properties?.['名称']?.title;
  return (title || []).map((part) => part.plain_text).join('');
}

function selectOf(page, name) {
  return page.properties?.[name]?.select?.name || '';
}

function numberOf(page, name) {
  const value = page.properties?.[name]?.number;
  return typeof value === 'number' ? value : null;
}

function dateStart(iso) {
  if (!iso || typeof iso !== 'string') {
    return null;
  }
  return iso.slice(0, 10);
}

function coverUrl(subject) {
  return (
    subject?.images?.large ||
    subject?.images?.common ||
    subject?.images?.medium ||
    ''
  );
}

function subjectName(subject) {
  const chinese = (subject?.name_cn || '').trim();
  const original = (subject?.name || '').trim();
  return chinese || original;
}

async function fetchBangumiCollections() {
  const items = [];
  let offset = 0;

  while (true) {
    const url = `https://api.bgm.tv/v0/users/${BGM_USER_ID}/collections?subject_type=2&limit=${PAGE_SIZE}&offset=${offset}`;
    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': BGM_USER_AGENT,
          Accept: 'application/json',
        },
      });
    } catch (error) {
      throw new Error(
        `Bangumi API 连不上 api.bgm.tv（本机 DNS/TLS 可能被劫持或拦截）。原始错误：${error}`
      );
    }
    if (!res.ok) {
      throw new Error(`Bangumi API ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    const batch = Array.isArray(body.data) ? body.data : [];
    items.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return items;
}

async function queryAllExplorePages() {
  const pages = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function filesExternal(url, name) {
  if (!url) {
    return undefined;
  }
  const filename = name ? `${name}.jpg` : 'cover.jpg';
  return {
    files: [
      {
        type: 'external',
        name: filename,
        external: { url },
      },
    ],
  };
}

function animeProperties(item, { create }) {
  const subject = item.subject || {};
  const name = subjectName(subject);
  const image = coverUrl(subject);
  const status = STATUS_BY_TYPE[item.type] || '想看';
  const rate =
    typeof item.rate === 'number' && item.rate > 0 ? item.rate : null;
  const date = dateStart(item.updated_at);
  const bangumiId = item.subject_id || subject.id;

  const properties = {
    名称: {
      title: [
        { type: 'text', text: { content: name || `Bangumi ${bangumiId}` } },
      ],
    },
    状态: { select: { name: status } },
    评分: { number: rate },
    'Bangumi ID': { number: bangumiId },
  };

  if (date) {
    properties['日期'] = { date: { start: date } };
  }

  const imageProp = filesExternal(image, name);
  if (imageProp) {
    properties['图片'] = imageProp;
  }

  if (create) {
    properties['集合'] = { select: { name: COLLECTION_ANIME } };
    properties['启用'] = { checkbox: true };
    if (bangumiId) {
      properties['网址'] = { url: `https://bgm.tv/subject/${bangumiId}` };
    }
  }

  return { properties, name, image, bangumiId };
}

function findMatch(pages, item) {
  const bangumiId = item.subject_id || item.subject?.id;
  if (bangumiId) {
    const byId = pages.find(
      (page) => numberOf(page, 'Bangumi ID') === bangumiId
    );
    if (byId) {
      return byId;
    }
  }

  const name = subjectName(item.subject);
  if (!name) {
    return null;
  }
  return pages.find(
    (page) =>
      selectOf(page, '集合') === COLLECTION_ANIME && titleOf(page) === name
  );
}

async function main() {
  console.log(`拉取 Bangumi 用户 ${BGM_USER_ID} 的动画收藏…`);
  const collections = await fetchBangumiCollections();
  console.log(`Bangumi 返回 ${collections.length} 条`);

  const pages = await queryAllExplorePages();
  console.log(`探索库现有 ${pages.length} 条`);

  const seenIds = new Set();
  let created = 0;
  let updated = 0;

  for (const item of collections) {
    const bangumiId = item.subject_id || item.subject?.id;
    if (bangumiId) {
      seenIds.add(bangumiId);
    }

    const matched = findMatch(pages, item);
    const { properties, image } = animeProperties(item, { create: !matched });
    const cover = image
      ? { type: 'external', external: { url: image } }
      : undefined;

    if (!matched) {
      await notion.pages.create({
        parent: { data_source_id: dataSourceId },
        properties,
        ...(cover ? { cover } : {}),
      });
      created++;
      console.log(`  新建 ${properties.名称.title[0].text.content}`);
      continue;
    }

    await notion.pages.update({
      page_id: matched.id,
      properties,
      ...(cover ? { cover } : {}),
    });
    updated++;
    if (updated % 25 === 0) {
      console.log(`  已更新 ${updated} 条`);
    }
  }

  let abandoned = 0;
  for (const page of pages) {
    if (selectOf(page, '集合') !== COLLECTION_ANIME) {
      continue;
    }
    const bangumiId = numberOf(page, 'Bangumi ID');
    if (bangumiId === null || seenIds.has(bangumiId)) {
      continue;
    }
    if (selectOf(page, '状态') === '抛弃') {
      continue;
    }
    await notion.pages.update({
      page_id: page.id,
      properties: { 状态: { select: { name: '抛弃' } } },
    });
    abandoned++;
    console.log(`  标为抛弃 ${titleOf(page)} (#${bangumiId})`);
  }

  console.log(`完成：新建 ${created}，更新 ${updated}，标为抛弃 ${abandoned}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
