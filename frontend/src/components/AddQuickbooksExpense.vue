<template>
  <div class="mb-4 space-y-4">
    <!-- Payment Account Select -->
    <div>
      <label for="bankAccountModel" class="block text-sm font-medium text-gray-700">
        Payment Account
      </label>
      <select
        id="bankAccountModel"
        v-model="bankAccountModel"
        class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option disabled value="">-- Select Payment Account --</option>
        <option
          v-for="account in qbPaymentAccounts"
          :key="account.id"
          :value="account.id"
        >
          {{ account.name }}
        </option>
      </select>
    </div>

    <!-- Expense Account Select -->
    <div>
      <label for="expenseAccountModel" class="block text-sm font-medium text-gray-700">
        Expense Account
      </label>
      <select
        id="expenseAccountModel"
        v-model="expenseAccountModel"
        class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        <option disabled value="">-- Select Expense Account --</option>
        <option
          v-for="account in qbExpenseAccounts"
          :key="account.id"
          :value="account.id"
        >
          {{ account.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineProps } from "vue";

// Props
const props = defineProps<{
  qbPaymentAccounts: { id: string; name: string }[];
  qbExpenseAccounts: { id: string; name: string }[];
}>();

// Two v-models using unique keys
const bankAccountModel = defineModel<string>("bankAccountId", { default: "" });
const expenseAccountModel = defineModel<string>("expenseAccountId", { default: "" });
</script>
