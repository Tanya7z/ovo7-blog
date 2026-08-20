const { exec } = require('child_process');
const { Client } = require('@notionhq/client');
const cliProgress = require('cli-progress');
const { PromisePool } = require('@supercharge/promise-pool');

// nx 项目名以 package.json 的 name 为准，避免仓库改名后此处漏改
const { name: nxProjectName } = require('../package.json');

const notion = new Client({
  auth: process.env.NOTION_API_SECRET,
  notionVersion: '2026-03-11',
});

// 以下配置在 loadNotionConfig() 中赋值。
// 属性默认值与过滤逻辑取自应用同一份真源 query-config.mjs，
// 避免脚本与站点各写一套导致抓取范围不一致。该模块为 ESM，故用动态 import 加载。
let titleProperty;
let slugProperty;
let sortProperty;
let buildFilter;

const loadNotionConfig = async () => {
  const { PROPERTY_DEFAULTS, buildPublishFilter } =
    await import('../src/lib/notion/query-config.mjs');
  titleProperty = process.env.NOTION_TITLE_PROPERTY || PROPERTY_DEFAULTS.title;
  slugProperty = process.env.NOTION_SLUG_PROPERTY || PROPERTY_DEFAULTS.slug;
  sortProperty = process.env.NOTION_SORT_PROPERTY || PROPERTY_DEFAULTS.sort;
  const filterProperty =
    process.env.NOTION_FILTER_PROPERTY || PROPERTY_DEFAULTS.filterProperty;
  const filterValue =
    process.env.NOTION_FILTER_VALUE || PROPERTY_DEFAULTS.filterValue;
  const filterType =
    process.env.NOTION_FILTER_TYPE || PROPERTY_DEFAULTS.filterType;
  buildFilter = () =>
    buildPublishFilter(filterProperty, filterValue, filterType);
};

const getAllPages = async () => {
  const dataSourceId =
    process.env.DATA_SOURCE_ID ||
    (await (async () => {
      const dbResponse = await notion.databases.retrieve({
        database_id: process.env.DATABASE_ID,
      });
      if (!dbResponse) {
        throw new Error('Failed to retrieve database information');
      }
      const nestedId =
        dbResponse.data_sources && dbResponse.data_sources.length > 0
          ? dbResponse.data_sources[0].id
          : null;
      if (!nestedId) {
        throw new Error('Database does not have a data source ID');
      }
      return nestedId;
    })());

  const params = {
    data_source_id: dataSourceId,
  };

  const filter = buildFilter();
  if (filter) params.filter = filter;
  if (sortProperty) {
    params.sorts = [{ property: sortProperty, direction: 'descending' }];
  }

  let results = [];
  while (true) {
    const res = await notion.dataSources.query(params);

    results = results.concat(res.results);

    if (!res.has_more) {
      break;
    }

    params['start_cursor'] = res.next_cursor;
  }

  const pages = results.map((result) => {
    const title = (result.properties[titleProperty]?.title || [])
      .map((item) => item.plain_text)
      .join('');
    const configuredSlug = slugProperty
      ? (result.properties[slugProperty]?.rich_text || [])
          .map((item) => item.plain_text)
          .join('')
      : '';
    return {
      id: result.id,
      last_edited_time: result.last_edited_time,
      slug: configuredSlug || title || result.id.replaceAll('-', ''),
    };
  });

  return pages;
};

(async () => {
  await loadNotionConfig();
  const pages = await getAllPages();

  const concurrency = parseInt(process.env.CACHE_CONCURRENCY || '1', 10);

  const progressBar = new cliProgress.SingleBar(
    { stopOnComplete: true },
    cliProgress.Presets.shades_classic
  );
  progressBar.start(pages.length, 0);

  await PromisePool.withConcurrency(concurrency)
    .for(pages)
    .process(async (page) => {
      return new Promise((resolve) => {
        const command = `npx nx run ${nxProjectName}:_fetch-notion-blocks ${page.id} ${page.last_edited_time}`;
        // NX_BRANCH 走 env 传入，命令行前缀式赋值在 Windows 上不可用
        const options = {
          timeout: 60000,
          env: { ...process.env, NX_BRANCH: 'main' },
        };

        exec(command, options, (err, stdout, stderr) => {
          if (err) {
            console.error(`exec error: ${err}`);
          }
          progressBar.increment();
          return resolve();
        });
      });
    });
})();
