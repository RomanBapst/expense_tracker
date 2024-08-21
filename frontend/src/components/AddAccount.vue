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
      <select id="userSelect" v-model="selectedUser" class="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <option v-for="user in props.users" :key="user.id" :value="user.id">
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
import { defineModel, defineProps, defineEmits, ref } from "vue";
import { FwbInput, FwbButton } from "flowbite-vue";

const emits = defineEmits(["submitClicked"]);

const props = defineProps({
  users: Array
})

const nameModel = defineModel("name", { default: "" });
const accountType = ref("Cash");
const isRefund = ref(false);
const selectedUser = ref(null)

function handleSubmitClicked() {
    emits('submitClicked', { name: nameModel.value, type: accountType.value, refundUserId: isRefund.value ? selectedUser.value : undefined });
}


</script>

<style scoped>
.input-form {
  max-width: 600px;
  margin: 2rem auto;
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.close {
  font-size: 1.5rem;
  font-weight: bold;
}
</style>

