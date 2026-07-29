// PDF generation via headless Chromium (Puppeteer). Loads the SAME html produced
// by @docsmith/core.renderToHtml — the browser preview and this PDF are one render
// path, so design and output cannot drift. Puppeteer's header/footer templates
// supply reliable "Page X of Y", which pure browser print cannot.

import puppeteer, { type Browser, type PaperFormat } from 'puppeteer';
import { renderToHtml, type DocumentData, type Template } from '@docsmith/core';
import { applyCarryForward } from './pagination.js';

// Reuse one browser across requests; launch lazily.
let browserPromise: Promise<Browser> | null = null;

function launch(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      // Honour a preinstalled Chromium if provided (e.g. /opt/pw-browsers in CI/dev).
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

const FORMAT_MAP: Record<string, PaperFormat> = {
  A4: 'a4',
  Letter: 'letter',
  A5: 'a5',
  Legal: 'legal',
};

function footerTemplate(fmt: string): string {
  // Chromium fills the pageNumber/totalPages spans. This is the reliable
  // "Page X of Y" that the client-side preview cannot produce.
  const text = fmt.replace('{page}', '<span class="pageNumber"></span>').replace(
    '{pages}',
    '<span class="totalPages"></span>',
  );
  return `<div style="font-size:9px;width:100%;text-align:center;color:#666;padding:0 12mm;">${text}</div>`;
}

export type RenderPdfOptions = {
  template: Template;
  data: DocumentData;
};

export async function renderPdf({ template, data }: RenderPdfOptions): Promise<Uint8Array> {
  const { document } = renderToHtml(template, data);
  const browser = await launch();
  const page = await browser.newPage();
  try {
    await page.setContent(document, { waitUntil: 'networkidle0' });
    // memory.md D-033: inject carried-forward/brought-forward rows (if the
    // template has any) BEFORE printing — page.pdf() below prints whatever
    // DOM state exists at call time.
    await applyCarryForward(page, template, data);

    const ps = template.printSetup;
    const showNums = ps.showPageNumbers !== false;
    const fmtStr = ps.pageNumberFormat || 'Page {page} of {pages}';

    const pdf = await page.pdf({
      format: FORMAT_MAP[ps.pageSize] ?? 'a4',
      landscape: ps.orientation === 'landscape',
      printBackground: true,
      margin: {
        top: `${ps.margins.top}mm`,
        right: `${ps.margins.right}mm`,
        bottom: `${ps.margins.bottom}mm`,
        left: `${ps.margins.left}mm`,
      },
      displayHeaderFooter: showNums,
      headerTemplate: '<span></span>',
      footerTemplate: showNums ? footerTemplate(fmtStr) : '<span></span>',
    });
    return pdf;
  } finally {
    await page.close();
  }
}
