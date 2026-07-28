// StaticAdapter — deterministic in-memory adapter for local dev, tests, and demos,
// and the runtime "push" path (hand it a fully-assembled document).
//
// IMPORTANT: this is test/demo scaffolding. It is NOT a license to present
// fabricated business data as real in production — see designer memory.md D-015.

import type {
  DataSourceAdapter,
  DatasetMeta,
  DocumentData,
  EntityMeta,
  FieldMeta,
} from '@docsmith/core';

export type StaticEntity = {
  meta: EntityMeta;
  headerFields: FieldMeta[];
  datasets: Array<{ meta: DatasetMeta; fields: FieldMeta[] }>;
  /** documents keyed by id → the resolved DocumentData */
  documents: Record<string, DocumentData>;
};

export type StaticConfig = { entities: StaticEntity[] };

export class StaticAdapter implements DataSourceAdapter {
  constructor(private cfg: StaticConfig) {}

  private entity(name: string): StaticEntity {
    const e = this.cfg.entities.find((x) => x.meta.name === name);
    if (!e) throw new Error(`StaticAdapter: unknown entity "${name}"`);
    return e;
  }

  async listEntities(): Promise<EntityMeta[]> {
    return this.cfg.entities.map((e) => e.meta);
  }

  async getFields(entity: string): Promise<FieldMeta[]> {
    return this.entity(entity).headerFields;
  }

  async getRelatedDatasets(entity: string): Promise<DatasetMeta[]> {
    return this.entity(entity).datasets.map((d) => d.meta);
  }

  async getDatasetFields(entity: string, datasetId: string): Promise<FieldMeta[]> {
    const ds = this.entity(entity).datasets.find((d) => d.meta.id === datasetId);
    if (!ds) throw new Error(`StaticAdapter: unknown dataset "${datasetId}" on "${entity}"`);
    return ds.fields;
  }

  async fetchDocument(entity: string, id: string): Promise<DocumentData> {
    const doc = this.entity(entity).documents[id];
    if (!doc) return { header: {}, datasets: {} }; // honest empty — no fabrication
    return doc;
  }

  async listSampleIds(entity: string): Promise<Array<{ id: string; label: string }>> {
    return Object.keys(this.entity(entity).documents).map((id) => ({ id, label: id }));
  }
}
