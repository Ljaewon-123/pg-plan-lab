<script setup lang="ts"></script>

<template>
  <div class="min-h-screen flex flex-col">
    <HeaderNav />
    <main class="flex-1 flex flex-col overflow-hidden">
      <slot />
    </main>
  </div>
</template>
