// @docsmith/adapters — the DataSourceAdapter contract (re-exported from core) plus
// the reference adapters an ERP can use or learn from.

export type {
  DataSourceAdapter,
  EntityMeta,
  DatasetMeta,
  FieldMeta,
  DocumentData,
} from '@docsmith/core';

export { StaticAdapter } from './static-adapter.js';
export type { StaticConfig, StaticEntity } from './static-adapter.js';

export { RestAdapter } from './rest-adapter.js';
export type { RestConfig } from './rest-adapter.js';

export { UnidbAdapter } from './unidb-adapter.js';
export type { UnidbConfig } from './unidb-adapter.js';
