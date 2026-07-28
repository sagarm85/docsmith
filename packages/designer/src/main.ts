// Vite lib-mode entry. Importing this module registers <doc-designer> as a side
// effect (Svelte's customElement-compiled output calls customElements.define()).
// A host ERP loads this once: <script type="module" src=".../doc-designer.js">
import './DocDesigner.svelte';
