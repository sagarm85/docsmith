// Render service — Fastify HTTP API. Turns (template + document data) into a PDF.
//
// Two ways to supply the data (matching the product's dual data-flow):
//   • PUSH: POST /render { template, data }             — caller already has the data
//   • PULL: POST /render { template, entity, id, adapter}— service pulls via a RestAdapter
//           config; keeps the ERP as the single source of truth.
//
// The service is stateless; run as many as you like behind a load balancer.

import Fastify from 'fastify';
import { validateTemplate, type DocumentData, type Template } from '@docsmith/core';
import { RestAdapter, type RestConfig } from '@docsmith/adapters';
import { renderPdf, closeBrowser } from './pdf.js';

type RenderBody = {
  template: Template;
  data?: DocumentData;
  entity?: string;
  id?: string;
  adapter?: RestConfig; // pull-mode: a RestAdapter config pointing back at the ERP
};

const app = Fastify({ logger: true, bodyLimit: 8 * 1024 * 1024 });

app.get('/health', async () => ({ ok: true }));

app.post('/render', async (req, reply) => {
  const body = req.body as RenderBody;

  if (!body?.template) {
    return reply.code(400).send({ error: 'template is required', code: 'NO_TEMPLATE' });
  }
  const issues = validateTemplate(body.template);
  if (issues.length) {
    return reply.code(400).send({ error: 'invalid template', code: 'INVALID_TEMPLATE', issues });
  }

  // Resolve the document data: push (inline) or pull (via adapter).
  let data: DocumentData;
  if (body.data) {
    data = body.data;
  } else if (body.adapter && body.entity && body.id) {
    const adapter = new RestAdapter(body.adapter);
    data = await adapter.fetchDocument(body.entity, body.id);
  } else {
    return reply
      .code(400)
      .send({ error: 'provide either data, or (adapter + entity + id)', code: 'NO_DATA' });
  }

  try {
    const pdf = await renderPdf({ template: body.template, data });
    const name = `${(body.template.name || 'document').replace(/[^\w.-]+/g, '_')}.pdf`;
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${name}"`)
      .send(Buffer.from(pdf));
  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({ error: String((err as Error).message), code: 'RENDER_FAILED' });
  }
});

// Batch: array of { entity, id } pulled via one adapter → array of base64 PDFs.
app.post('/render/batch', async (req, reply) => {
  const body = req.body as { template: Template; adapter: RestConfig; items: Array<{ entity: string; id: string }> };
  if (!body?.template || !body?.adapter || !Array.isArray(body.items)) {
    return reply.code(400).send({ error: 'template, adapter, and items[] are required', code: 'BAD_BATCH' });
  }
  const adapter = new RestAdapter(body.adapter);
  const out: Array<{ id: string; pdfBase64?: string; error?: string }> = [];
  for (const it of body.items) {
    try {
      const data = await adapter.fetchDocument(it.entity, it.id);
      const pdf = await renderPdf({ template: body.template, data });
      out.push({ id: it.id, pdfBase64: Buffer.from(pdf).toString('base64') });
    } catch (err) {
      out.push({ id: it.id, error: String((err as Error).message) });
    }
  }
  return reply.send({ results: out });
});

const port = Number(process.env.PORT ?? 8090);
const host = process.env.HOST ?? '0.0.0.0';

app
  .listen({ port, host })
  .then(() => app.log.info(`render-service on http://${host}:${port}`))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    await closeBrowser();
    await app.close();
    process.exit(0);
  });
}
