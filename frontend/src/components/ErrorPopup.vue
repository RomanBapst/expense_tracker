<template>
    <div
      v-if="visible"
      :class="[
        'fixed top-5 right-5 max-w-md text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-4 z-50',
        type === 'success'
          ? 'bg-green-600 border border-green-800'
          : 'bg-red-600 border border-red-800'
      ]"
    >
      <div class="flex-1">
        <h3 class="text-lg font-bold mb-1">{{ type === 'success' ? '✓ Success' : '❌ Error' }}</h3>
        <p class="text-base font-medium leading-snug">
          {{ message }}
        </p>
      </div>
      <button
        @click="close"
        :class="type === 'success' ? 'text-white hover:text-green-200 font-bold text-2xl leading-none' : 'text-white hover:text-red-200 font-bold text-2xl leading-none'"
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
    type?: 'error' | 'success'
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
  