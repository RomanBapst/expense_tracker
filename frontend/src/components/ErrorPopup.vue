<template>
    <div
      v-if="visible"
      class="fixed top-5 right-5 max-w-md bg-red-600 text-white border border-red-800 px-6 py-4 rounded-lg shadow-2xl flex items-start gap-4 z-50"
    >
      <div class="flex-1">
        <h3 class="text-lg font-bold mb-1">❌ Error</h3>
        <p class="text-base font-medium leading-snug">
          {{ message }}
        </p>
      </div>
      <button
        @click="close"
        class="text-white hover:text-red-200 font-bold text-2xl leading-none"
      >
        &times;
      </button>
    </div>
  </template>
  
  <script setup lang="ts">
  import { defineProps, defineEmits, watch, ref } from 'vue'
  
  const props = defineProps<{
    message: string
    show: boolean
  }>()
  
  const emit = defineEmits(['close'])
  
  const visible = ref(props.show)
  
  watch(() => props.show, (val) => {
    visible.value = val
  })
  
  function close() {
    visible.value = false
    emit('close')
  }
  </script>
  