<script lang="typescript">
  import {fade} from 'svelte/transition'
</script>

<style>
  div {
    background-color: #FF6666;
    color: white;
    width: var(--section-size);
    height: var(--section-size);
    padding: 8px;
  }
</style>

<div in:fade={{duration: 120}}>
  <h2>Index</h2>
</div>