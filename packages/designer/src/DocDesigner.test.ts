import { describe, expect, it } from 'vitest';
import { StaticAdapter } from '@docsmith/adapters';
import './DocDesigner.svelte'; // side effect: registers <doc-designer>

// Svelte's custom-element wrapper defers instantiation by one microtask on
// connectedCallback (to let slotted children mount first) — see
// svelte/src/internal/client/dom/elements/custom-element.js. Tests must await that
// tick before inspecting shadowRoot content or calling exposed methods.
function nextTick(): Promise<void> {
  return Promise.resolve();
}

type DocDesignerEl = HTMLElement & {
  config?: unknown;
  getTemplate?: () => unknown;
  setTemplate?: (t: unknown) => void;
};

describe('<doc-designer>', () => {
  it('registers the custom element tag', () => {
    expect(customElements.get('doc-designer')).toBeDefined();
  });

  it('shows an honest empty state when mounted without an adapter', async () => {
    const el = document.createElement('doc-designer') as DocDesignerEl;
    document.body.appendChild(el);
    await nextTick();

    const shadowText = el.shadowRoot?.textContent ?? '';
    expect(shadowText).toContain('No data adapter configured');
    el.remove();
  });

  it('renders against a real adapter with no fabricated data', async () => {
    const adapter = new StaticAdapter({
      entities: [
        {
          meta: { name: 'invoice', label: 'Invoice' },
          headerFields: [],
          datasets: [],
          documents: {},
        },
      ],
    });
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter };
    document.body.appendChild(el);
    await nextTick();

    const shadowText = el.shadowRoot?.textContent ?? '';
    expect(shadowText).not.toContain('No data adapter configured');
    expect(shadowText).toContain('Phase 0 scaffold');
    el.remove();
  });

  it('exposes getTemplate/setTemplate for the SDK to call', async () => {
    const adapter = new StaticAdapter({ entities: [] });
    const el = document.createElement('doc-designer') as DocDesignerEl;
    el.config = { adapter };
    document.body.appendChild(el);
    await nextTick();

    expect(el.getTemplate?.()).toBeNull();
    // $state wraps objects in a reactive proxy, so identity (toBe) won't hold —
    // assert content instead.
    const fake = { version: 1 } as unknown;
    el.setTemplate?.(fake);
    expect(el.getTemplate?.()).toStrictEqual(fake);
    el.remove();
  });
});
