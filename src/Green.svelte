<script lang="typescript">
  import {fade} from 'svelte/transition'
</script>

<style>
  div {
    background-color: #66FF66;
    color: white;
    width: var(--section-size);
    height: var(--section-size);
    padding: 8px;
  }
</style>

<div in:fade={{duration: 120}}>
  <h2>Users</h2>
</div>