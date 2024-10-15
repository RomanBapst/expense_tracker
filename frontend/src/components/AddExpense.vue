<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto relative">
    <span class="close absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-800" @click="$emit('close')">&times;</span>
    <h2 v-if="props.isAdding" class="text-2xl font-bold mb-4">Add Expense</h2>
    <h2 v-if="!props.isAdding" class="text-2xl font-bold mb-4">Edit Expense</h2>
    <div class="mb-4">
      <label for="accountType" class="block text-sm font-medium text-gray-700">Account Type</label>
      <select id="accountModel" v-model="accountModel" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        <option v-for="account in props.accountTypes" :value="account.id" :key="account.name">{{account.name}}</option>
      </select>
    </div>
    <div class="mb-4">
      <fwb-input
        v-model="titleModel"
        label="Title"
        placeholder="Title"
        size="sm"
      />
    </div>
    <div class="mb-4">
      <fwb-input
        v-model="descriptionModel"
        label="Description"
        placeholder="Description"
        size="sm"
      />
    </div>
    <div class="mb-4">
      <fwb-input
        v-model="amountModel"
        label="Amount"
        placeholder="Amount"
        size="sm"
      />
    </div>
    <div class="mb-4">
      <label for="date" class="block text-sm font-medium text-gray-700">Date</label>
      <input
        type="date"
        v-model="dateModel"
        id="date"
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
    </div>
    <div v-if="!props.hasExistingReceipt || removeExistingReceipt" class="mb-4">
      <label for="receipt" class="block text-sm font-medium text-gray-700">Receipt</label>
      <input
        type="file"
        @change="handleFileChange"
        ref="receiptInput"
        id="receipt"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
    </div>
    <div v-if="props.hasExistingReceipt && !removeExistingReceipt" class="mt-2">
        <span class="inline-flex items-center px-2 py-1 text-sm font-medium text-red-800 bg-red-200 rounded">
          Receipt
          <svg @click="removeReceipt" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-2 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      </div>
    <div class="text-right">
      <fwb-button @click="handleSubmitClicked" color="green">
        Submit
      </fwb-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineEmits, ref } from "vue";
import { FwbInput, FwbButton } from "flowbite-vue";

const file = ref<File | null>(null);
const removeExistingReceipt = ref(false)

const emits = defineEmits(["submitClicked"]);

const titleModel = defineModel("title", { default: "" });
const descriptionModel = defineModel("description", { default: "" });
const amountModel = defineModel("amount", { default: "0" });
const dateModel = defineModel("date", { default: "" });
const accountModel = defineModel<string>("accountId", {default: ""})

const props = defineProps({
  hasExistingReceipt: Boolean,
  isAdding: Boolean,
  accountTypes: Array
});

function removeReceipt() {
  removeExistingReceipt.value = true
}

function handleSubmitClicked() {
  emits('submitClicked', file.value, removeExistingReceipt.value)
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  console.log("triggering")
  if (input.files && input.files.length > 0) {
    console.log("setting the file value")
    file.value = input.files[0]; // Update the ref
  }
};

</script>

