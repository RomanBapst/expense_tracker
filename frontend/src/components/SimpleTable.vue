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

const sortedColumn = ref(null);
const sortDirection = ref("asc");
const sortedItems = ref([]);

onMounted(() => {
  sortByColumn(0);
});

watch(
  () => props.items,
  (newValue) => {
    sortedItems.value = newValue;
  }
);

function sortByColumn(columnIndex) {
  if (!props.sortFunction) {
    return
  }


  if (sortedColumn.value === columnIndex) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortedColumn.value = columnIndex;
    sortDirection.value = "asc";
  }

  sortedItems.value = props.sortFunction(columnIndex, sortDirection.value, [
    ...props.items,
  ]);
}
</script>

<template>
  <fwb-table>
    <fwb-table-head>
      <fwb-table-head-cell
        v-for="(name, index) in header"
        :key="name"
        @click="sortByColumn(index)"
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
          <fwb-table-cell v-for="(value, index) in item.values" :key="index">
            <slot :name="'cell-' + index" :item="item">
              <div class="tooltip text-overflow" :title="value">
                {{ value }}
              </div>
            </slot>
          </fwb-table-cell>
          <fwb-table-cell class="buttons">

            <slot name="button1" :emit="$emit" :item="item"></slot>
            <slot name="button2" :emit="$emit" :item="item">
              
            </slot>
            
          </fwb-table-cell>
        </template>
      </fwb-table-row>
    </fwb-table-body>
  </fwb-table>
</template>

<style scoped>
.text-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px; /* Adjust based on your layout */
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 120px;
  background-color: black;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 0;
  position: absolute;
  z-index: 1;
  bottom: 125%; /* Position the tooltip above the text */
  left: 50%;
  margin-left: -60px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}

.icon-arrow-up,
.icon-arrow-down {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 0.25rem;
  vertical-align: middle;
  border: solid transparent;
}

.icon-arrow-up {
  border-width: 0 0.5rem 0.5rem 0.5rem;
  border-bottom-color: currentColor;
}

.icon-arrow-down {
  border-width: 0.5rem;
  border-bottom-width: 0;
  border-top-color: currentColor;
}

.buttons {
  display: flex;
  justify-content: flex-end;
}

.buttons fwb-button {
  margin-left: 8px; /* Add space between buttons */
}
</style>
