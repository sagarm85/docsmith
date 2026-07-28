// @docsmith/sdk — the plug-and-play embedding entry. An ERP includes this bundle and
// calls DocDesigner.mount(...) with its adapter. Framework-agnostic: works in React,
// Angular, Vue, server-rendered, or plain HTML hosts.
//
// The SDK owns three responsibilities:
//   1. mount()      — instantiate the <doc-designer> custom element and pass config.
//   2. preview()    — client-side HTML render (via @docsmith/core), no backend needed.
//   3. renderPdf()  — POST to the render service for a real PDF (batch/email/archival).
//
// The <doc-designer> element itself is built in the `designer` package (Svelte 5 →
// custom element). Importing the designer bundle registers the element; this SDK
// does not implement the UI.

import {
  renderToHtml,
  type DataSourceAdapter,
  type DocumentData,
  type Template,
} from '@docsmith/core';

export type MountOptions = {
  adapter: DataSourceAdapter;
  template?: Template;
  onSave?: (template: Template) => void;
  onChange?: (template: Template) => void;
  renderServiceUrl?: string;
  theme?: Record<string, string>;
};

export type DocDesignerHandle = {
  el: HTMLElement;
  getTemplate: () => Template | null;
  setTemplate: (t: Template) => void;
  destroy: () => void;
};

const ELEMENT_TAG = 'doc-designer';

/**
 * Mount the designer into `target`. The `doc-designer` custom element must already
 * be registered (import '@docsmith/designer' once at app startup to register it).
 */
export function mount(target: HTMLElement, opts: MountOptions): DocDesignerHandle {
  if (!customElements.get(ELEMENT_TAG)) {
    throw new Error(
      `<${ELEMENT_TAG}> is not registered. Import '@docsmith/designer' before calling mount().`,
    );
  }
  const el = document.createElement(ELEMENT_TAG) as HTMLElement & {
    config?: MountOptions;
    getTemplate?: () => Template | null;
    setTemplate?: (t: Template) => void;
  };
  // Config carries functions/objects, so pass it as a property, not an attribute.
  el.config = opts;

  if (opts.onSave) el.addEventListener('doc-save', (e) => opts.onSave!((e as CustomEvent).detail));
  if (opts.onChange) el.addEventListener('doc-change', (e) => opts.onChange!((e as CustomEvent).detail));

  target.appendChild(el);

  return {
    el,
    getTemplate: () => el.getTemplate?.() ?? null,
    setTemplate: (t) => el.setTemplate?.(t),
    destroy: () => el.remove(),
  };
}

/** Client-side HTML render for quick, backend-free preview. Returns an HTML string. */
export function preview(args: { template: Template; data: DocumentData }): string {
  return renderToHtml(args.template, args.data).document;
}

/**
 * Request a PDF from the render service. Returns a Blob the caller can download,
 * open, or email. Prefer this for anything official (real Page X of Y, archival).
 */
export async function renderPdf(args: {
  renderServiceUrl: string;
  template: Template;
  data?: DocumentData;
  entity?: string;
  id?: string;
  adapter?: unknown; // a RestConfig for pull-mode; opaque to the SDK
}): Promise<Blob> {
  const { renderServiceUrl, ...body } = args;
  const res = await fetch(`${renderServiceUrl.replace(/\/+$/, '')}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`renderPdf failed: ${res.status} ${txt || res.statusText}`);
  }
  return res.blob();
}

/** Convenience: trigger a browser download of a rendered PDF blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const DocDesigner = { mount, preview, renderPdf, downloadBlob };
export default DocDesigner;
