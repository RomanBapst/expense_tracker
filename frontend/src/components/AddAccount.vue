<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto relative">
    <span class="close absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-800" @click="$emit('close')">&times;</span>
    <h2 class="text-2xl font-bold mb-4">Add Account</h2>
    <div class="mb-4">
      <label class="flex items-center">
        <input type="checkbox" v-model="isRefund" class="mr-2">
        Refund
      </label>
    </div>

    <!-- User Selection Popup -->
    <div v-if="isRefund" class="mb-4">
      <label for="userSelect" class="block text-sm font-medium text-gray-700 mb-2">Select User</label>
      <select id="selectedUser" v-model="selectedUserId" class="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <option v-for="user in props.users" :key="user.name" :value="user.id">
          {{ user.name }}
        </option>
      </select>
    </div>

    <div class="mb-4">
      <fwb-input
        v-model="nameModel"
        label="Title"
        placeholder="Title"
        size="sm"
      />
    </div>
    <div class="mb-4">
      <label for="accountType" class="block text-sm font-medium text-gray-700">Account Type</label>
      <select id="accountType" v-model="accountType" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <option value="Cash">Cash</option>
        <option value="Bank">Bank</option>
      </select>
    </div>
    <div class="text-right">
      <fwb-button @click="handleSubmitClicked" color="green">
        Submit
      </fwb-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, defineModel } from "vue";
import { FwbInput, FwbButton } from "flowbite-vue";


const emit = defineEmits(['submitClicked']);

const nameModel = defineModel("name", { default: "" });
const accountType = ref("Cash");
const isRefund = defineModel("isRefund", {default: false});
const selectedUserId = defineModel("selectedUserId", { default: "" })

const props = defineProps({
  users: {
    type: Array,
    required: true
  }
});

function handleSubmitClicked() {
  emit('submitClicked', {
    name: nameModel.value,
    type: accountType.value,
    refundUserId: isRefund.value ? selectedUserId.value : undefined
  });
}
</script>
