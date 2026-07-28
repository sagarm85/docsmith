// RestAdapter — the general-purpose adapter most ERPs plug into. The ERP exposes a
// handful of REST endpoints; this adapter maps them onto the DataSourceAdapter
// contract. All endpoints are configurable so it fits an existing API surface.

import type {
  DataSourceAdapter,
  DatasetMeta,
  DocumentData,
  EntityMeta,
  FieldMeta,
} from '@docsmith/core';

export type RestConfig = {
  baseUrl: string;
  /** Optional bearer token or a function returning one (sync or async). */
  token?: string | (() => string | Promise<string>);
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /**
   * Endpoint path templates. `:entity`, `:id`, `:datasetId` are substituted.
   * Defaults follow a conventional REST shape.
   */
  routes?: Partial<{
    entities: string; // GET  -> EntityMeta[]
    fields: string; // GET  -> FieldMeta[]
    datasets: string; // GET  -> DatasetMeta[]
    datasetFields: string; // GET  -> FieldMeta[]
    document: string; // GET  -> DocumentData
    sampleIds: string; // GET  -> {id,label}[]
  }>;
  fetchImpl?: typeof fetch;
};

const DEFAULT_ROUTES = {
  entities: '/meta/entities',
  fields: '/meta/:entity/fields',
  datasets: '/meta/:entity/datasets',
  datasetFields: '/meta/:entity/datasets/:datasetId/fields',
  document: '/docs/:entity/:id',
  sampleIds: '/docs/:entity/sample-ids',
};

export class RestAdapter implements DataSourceAdapter {
  private routes: typeof DEFAULT_ROUTES;
  private f: typeof fetch;

  constructor(private cfg: RestConfig) {
    this.routes = { ...DEFAULT_ROUTES, ...(cfg.routes ?? {}) };
    this.f = cfg.fetchImpl ?? fetch;
  }

  private path(tpl: string, params: Record<string, string>): string {
    let p = tpl;
    for (const [k, v] of Object.entries(params)) {
      p = p.replace(`:${k}`, encodeURIComponent(v));
    }
    return this.cfg.baseUrl.replace(/\/+$/, '') + p;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const h: Record<string, string> = { Accept: 'application/json', ...(this.cfg.headers ?? {}) };
    const t = this.cfg.token;
    const tok = typeof t === 'function' ? await t() : t;
    if (tok) h.Authorization = `Bearer ${tok}`;
    return h;
  }

  private async get<T>(url: string): Promise<T> {
    const res = await this.f(url, { headers: await this.authHeaders() });
    if (!res.ok) {
      throw new Error(`RestAdapter ${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  }

  listEntities(): Promise<EntityMeta[]> {
    return this.get(this.path(this.routes.entities, {}));
  }
  getFields(entity: string): Promise<FieldMeta[]> {
    return this.get(this.path(this.routes.fields, { entity }));
  }
  getRelatedDatasets(entity: string): Promise<DatasetMeta[]> {
    return this.get(this.path(this.routes.datasets, { entity }));
  }
  getDatasetFields(entity: string, datasetId: string): Promise<FieldMeta[]> {
    return this.get(this.path(this.routes.datasetFields, { entity, datasetId }));
  }
  fetchDocument(entity: string, id: string): Promise<DocumentData> {
    return this.get(this.path(this.routes.document, { entity, id }));
  }
  listSampleIds(entity: string): Promise<Array<{ id: string; label: string }>> {
    return this.get(this.path(this.routes.sampleIds, { entity }));
  }
}
