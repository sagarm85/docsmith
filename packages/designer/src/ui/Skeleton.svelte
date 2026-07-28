<script lang="ts">
  let {
    width = '100%',
    height = '14px',
  }: {
    width?: string;
    height?: string;
  } = $props();
</script>

<span class="dd-skeleton" style:width style:height aria-hidden="true"></span>

<style>
  .dd-skeleton {
    display: inline-block;
    border-radius: var(--dd-radius);
    background: linear-gradient(
      90deg,
      var(--dd-panel-alt) 25%,
      var(--dd-border) 37%,
      var(--dd-panel-alt) 63%
    );
    background-size: 400% 100%;
    animation: dd-skeleton-shimmer 1.4s ease infinite;
  }

  @keyframes dd-skeleton-shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dd-skeleton {
      animation: none;
      background: var(--dd-panel-alt);
    }
  }
</style>
