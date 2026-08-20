// query-config.mjs 的类型声明，供 astro check / tsc 消费。

export interface NotionPropertyDefaults {
  title: string;
  slug: string;
  date: string;
  categories: string;
  domains: string;
  labels: string;
  excerpt: string;
  featuredImage: string;
  filterProperty: string;
  filterValue: string;
  filterType: string;
  sort: string;
}

export interface NotionPublishFilter {
  property: string;
  [key: string]: unknown;
}

export const PROPERTY_DEFAULTS: NotionPropertyDefaults;

export const STICKER_DEFAULTS: {
  title: string;
  image: string;
  collection: string;
  caption: string;
  rotation: string;
  scale: string;
  order: string;
  enabled: string;
};

export const LIBRARY_DEFAULTS: {
  title: string;
  image: string;
  collection: string;
  enabled: string;
  status: string;
  score: string;
  author: string;
  place: string;
  date: string;
  bangumiId: string;
};

export const EXPLORE_DEFAULTS: {
  title: string;
  type: string;
  cover: string;
  collection: string;
  image: string;
  enabled: string;
  status: string;
  score: string;
  author: string;
  place: string;
  date: string;
  bangumiId: string;
};

export const MUSIC_DEFAULTS: {
  title: string;
  composer: string;
  audio: string;
  order: string;
  enabled: string;
};

export function buildPublishFilter(
  filterProperty: string,
  filterValue: string,
  filterType: string
): NotionPublishFilter | null;
