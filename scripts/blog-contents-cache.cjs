const { exec } = require('child_process');
const { Client } = require('@notionhq/client');
const cliProgress = require('cli-progress');
const { PromisePool } = require('@supercharge/promise-pool');

const notion = new Client({
  auth: process.env.NOTION_API_SECRET,
  notionVersion: '2026-03-11',
});

const titleProperty = process.env.NOTION_TITLE_PROPERTY || '名称';
const slugProperty = process.env.NOTION_SLUG_PROPERTY || '';
const filterProperty = process.env.NOTION_FILTER_PROPERTY || '类型';
const filterValue = process.env.NOTION_FILTER_VALUE || '技术';
const filterType = process.env.NOTION_FILTER_TYPE || 'select';
const sortProperty = process.env.NOTION_SORT_PROPERTY || '创建时间';

const buildFilter = () => {
  if (!filterProperty || !filterValue) return undefined;
  if (filterType === 'checkbox') {
    return {
      property: filterProperty,
      checkbox: { equals: filterValue === 'true' },
    };
  }
  if (filterType === 'status') {
    return { property: filterProperty, status: { equals: filterValue } };
  }
  if (filterType === 'multi_select') {
    return {
      property: filterProperty,
      multi_select: { contains: filterValue },
    };
  }
  return { property: filterProperty, select: { equals: filterValue } };
};

const getAllPages = async () => {
  const dbResponse = await notion.databases.retrieve({
    database_id: process.env.DATABASE_ID,
  });
  if (!dbResponse) {
    throw new Error('Failed to retrieve database information');
  }

  const dataSourceId =
    dbResponse.data_sources && dbResponse.data_sources.length > 0
      ? dbResponse.data_sources[0].id
      : null;
  if (!dataSourceId) {
    throw new Error('Database does not have a data source ID');
  }

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
        const command = `NX_BRANCH=main npx nx run astro-notion-blog:_fetch-notion-blocks ${page.id} ${page.last_edited_time}`;
        const options = { timeout: 60000 };

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
