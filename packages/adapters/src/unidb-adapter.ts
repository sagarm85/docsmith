// UnidbAdapter — reference adapter against the unidb engine's generic SQL catalog.
// Proves the DataSourceAdapter contract works over a real database with no
// app-shaped endpoints: header fields come from information_schema.columns, line-item
// datasets from foreign-key relationships, and documents from parameterised SELECTs.
//
// Ported in spirit from unidb-studio/src/lib/{api,schema}.js.

import type {
  DataSourceAdapter,
  DatasetMeta,
  DocumentData,
  EntityMeta,
  FieldMeta,
} from '@docsmith/core';

export type UnidbConfig = {
  baseUrl: string; // e.g. http://localhost:8080
  token?: string | (() => string | Promise<string>);
  fetchImpl?: typeof fetch;
  /**
   * How to classify a column as 'custom' vs 'system'. unidb's catalog has no such
   * flag, so the ERP supplies the rule. Default: everything 'system' (we never
   * guess). Provide a predicate or a per-entity allowlist of custom column names.
   */
  isCustom?: (entity: string, column: string) => boolean;
};

type SqlRowsResult = { type?: string; columns?: string[]; rows?: unknown[][] };

// unidb resolves only BARE identifiers; names from introspection are engine-created
// and safe. Anything unexpected is quoted so it can't break the query.
function quoteIdent(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}
function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export class UnidbAdapter implements DataSourceAdapter {
  private f: typeof fetch;
  constructor(private cfg: UnidbConfig) {
    this.f = cfg.fetchImpl ?? fetch;
  }

  private async headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = this.cfg.token;
    const tok = typeof t === 'function' ? await t() : t;
    if (tok) h.Authorization = `Bearer ${tok}`;
    return h;
  }

  /** Run SQL, return the first rows-result as array-of-objects (columns zipped). */
  private async rows(sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> {
    const body: Record<string, unknown> = { sql };
    if (params.length) body.params = params;
    const res = await this.f(`${this.cfg.baseUrl.replace(/\/+$/, '')}/sql`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`UnidbAdapter /sql ${res.status}: ${txt || res.statusText}`);
    }
    const payload = (await res.json()) as { results?: SqlRowsResult[] };
    const r = (payload.results ?? []).find((x) => (x.rows ?? x.columns) != null) ?? { columns: [], rows: [] };
    const cols = r.columns ?? [];
    return (r.rows ?? []).map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }

  async listEntities(): Promise<EntityMeta[]> {
    const rows = await this.rows(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    return rows
      .map((r) => String(r.table_name))
      .filter((n) => !/^__/.test(n)) // hide engine-internal tables
      .map((n) => ({ name: n, label: n }));
  }

  private async primaryKey(entity: string): Promise<string> {
    const rows = await this.rows(
      `SELECT kcu.column_name AS col, kcu.ordinal_position AS pos
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ${sqlStr(entity)}
       ORDER BY kcu.ordinal_position`,
    );
    return rows.length ? String(rows[0]!.col) : 'id';
  }

  async getFields(entity: string): Promise<FieldMeta[]> {
    const rows = await this.rows(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ${sqlStr(entity)}
       ORDER BY ordinal_position`,
    );
    return rows.map((r) => {
      const column = String(r.column_name);
      const custom = this.cfg.isCustom ? this.cfg.isCustom(entity, column) : false;
      return {
        name: column,
        label: column,
        type: String(r.data_type ?? 'text'),
        kind: custom ? 'custom' : 'system',
      };
    });
  }

  /** Child tables whose FK references this entity → candidate line-item datasets. */
  private async relatedChildren(entity: string): Promise<Array<{ table: string; fkColumn: string }>> {
    const rows = await this.rows(
      `SELECT tc.table_name AS from_table, kcu.column_name AS from_col, ccu.table_name AS to_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
       JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
       JOIN information_schema.key_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
             AND ccu.ordinal_position = kcu.position_in_unique_constraint
       WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = ${sqlStr(entity)}`,
    );
    return rows.map((r) => ({ table: String(r.from_table), fkColumn: String(r.from_col) }));
  }

  async getRelatedDatasets(entity: string): Promise<DatasetMeta[]> {
    const children = await this.relatedChildren(entity);
    // datasetId == child table name, so it lines up with fetchDocument's datasets key.
    return children.map((c) => ({ id: c.table, label: `${c.table} (via ${c.fkColumn})` }));
  }

  async getDatasetFields(_entity: string, datasetId: string): Promise<FieldMeta[]> {
    const rows = await this.rows(
      `SELECT column_name, data_type, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ${sqlStr(datasetId)}
       ORDER BY ordinal_position`,
    );
    return rows.map((r) => ({
      name: String(r.column_name),
      label: String(r.column_name),
      type: String(r.data_type ?? 'text'),
      kind: this.cfg.isCustom && this.cfg.isCustom(datasetId, String(r.column_name)) ? 'custom' : 'system',
    }));
  }

  async fetchDocument(entity: string, id: string): Promise<DocumentData> {
    const pk = await this.primaryKey(entity);
    const headerRows = await this.rows(
      `SELECT * FROM ${quoteIdent(entity)} WHERE ${quoteIdent(pk)} = $1`,
      [id],
    );
    const header = headerRows[0] ?? {};

    const children = await this.relatedChildren(entity);
    const datasets: Record<string, Array<Record<string, unknown>>> = {};
    for (const c of children) {
      datasets[c.table] = await this.rows(
        `SELECT * FROM ${quoteIdent(c.table)} WHERE ${quoteIdent(c.fkColumn)} = $1`,
        [id],
      );
    }
    return { header, datasets };
  }

  async listSampleIds(entity: string): Promise<Array<{ id: string; label: string }>> {
    const pk = await this.primaryKey(entity);
    const rows = await this.rows(
      `SELECT ${quoteIdent(pk)} AS id FROM ${quoteIdent(entity)} ORDER BY ${quoteIdent(pk)} LIMIT 25`,
    );
    return rows.map((r) => ({ id: String(r.id), label: `${entity} #${r.id}` }));
  }
}
