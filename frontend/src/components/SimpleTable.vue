<script setup>
import { defineProps, ref, onMounted, watch } from "vue";
import {
  FwbTable,
  FwbTableBody,
  FwbTableCell,
  FwbTableHead,
  FwbTableHeadCell,
  FwbTableRow,
  FwbButton,
} from "flowbite-vue";
import { sort } from "mathjs";

const props = defineProps({
  header: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  sortFunction: Function,
});

const sortedColumn = ref(0);
const sortDirection = ref("desc");
const sortedItems = ref([]);

onMounted(() => {
  sortByColumn(2);
});

watch(
() => props.items,
(newValue) => {
  
  if (!props.sortFunction) {
    sortedItems.value = newValue
  } else {
    sortByColumn(sortedColumn.value)
  }
}
);

function sortByColumn(columnIndex, userTriggered=false) {
  if (!props.sortFunction) {
    return;
  }
  
  
  if (sortedColumn.value === columnIndex && userTriggered) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  }
  
  sortedColumn.value = columnIndex;
  
  sortedItems.value = props.sortFunction(columnIndex, sortDirection.value, [
  ...props.items,
  ]);
}
</script>

<template>
  <fwb-table class="overflow-y-auto border border-gray-300">
    <fwb-table-head>
      <fwb-table-head-cell
      v-for="(name, index) in header"
      :key="name"
      @click="sortByColumn(index, true)"
      class="cursor-pointer text-left px-4 py-2 font-semibold text-gray-700"
      >
      {{ name }}
      <span
      v-if="sortedColumn === index"
      :class="{
        'icon-arrow-up': sortDirection === 'asc',
        'icon-arrow-down': sortDirection === 'desc',
      }"
      ></span>
    </fwb-table-head-cell>
    <fwb-table-head-cell>
      <span class="sr-only">Actions</span>
    </fwb-table-head-cell>
  </fwb-table-head>
  <fwb-table-body>
    <fwb-table-row v-for="item in sortedItems" :key="item.id">
      <template #default>
        <fwb-table-cell
        v-for="(value, index) in item.values"
        :key="index"
        class="px-4 py-2"
        >
        <slot :name="'cell-' + index" :item="item">
          <div
          class="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap"
          :title="value"
          >
          {{ value }}
        </div>
      </slot>
    </fwb-table-cell>
    <fwb-table-cell class="flex justify-end px-4 py-2">
      <slot name="button1" :emit="$emit" :item="item"></slot>
      <slot name="button2" :emit="$emit" :item="item"></slot>
    </fwb-table-cell>
  </template>
</fwb-table-row>
</fwb-table-body>
</fwb-table>
</template>
