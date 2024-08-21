<script setup>
import { computed, onMounted, ref} from "vue"


const props = defineProps({
    numItems: {
        type: Number,
        require: true
    },
    pageSize: {
        type: Number,
        require: true
    },
    numPages: {
        type: Number,
        require: true
    },
    currentIndex: {
      type: Number,
      require: true
    }
})


const numPages = computed(()=> {
    return props.numItems / props.pageSize
})

const pageIndexes = computed(() => {
  console.log("current index is " + props.currentIndex)
    return Array.from({ length:  Math.min(1+Math.floor(props.numItems/(props.pageSize+1)),props.numPages) }, (_, i) => i);
})


function getBackgroundColor(pageIndex) {
  if (props.currentIndex == pageIndex) {
    return "bg-green-200"
  }

  return "bg-white"
}

</script>

<template>
    <nav aria-label="Page navigation example">
  <ul class="inline-flex -space-x-px text-base h-10">
    <li>
      <a href="#" class="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">Previous</a>
    </li>
    <li v-for="page in pageIndexes" v-bind:key="page">
      <p @click="$emit('pageClicked', page)" class="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 border border-gray-300" :class="getBackgroundColor(page)" >{{page}}</p>
    </li>
    <li>
      <a href="#" class="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">Next</a>
    </li>
  </ul>
</nav>
</template>