<script lang="typescript">
  import { fade } from 'svelte/transition'
</script>

<div in:fade={{ duration: 120 }}>
  <h2>Index</h2>
</div>

<style>
  div {
    background-color: #ff6666;
    color: white;
    width: var(--section-size);
    height: var(--section-size);
    padding: 8px;
  }
</style>
