<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md mx-auto relative">
    <span
      class="close absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-800"
      @click="$emit('close')"
    >
      &times;
    </span>

    <!-- Two Columns -->
    <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column -->
      <div class="space-y-4">
        <h2 class="text-2xl font-bold mb-6">
          {{ props.isAdding ? "Add Expense" : "Edit Expense" }}
        </h2>
        <div>
          <label for="accountModel" class="block text-sm font-medium text-gray-700">
            Account Type
          </label>
          <select
            id="accountModel"
            v-model="accountModel"
            class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option
              v-for="account in props.accountTypes"
              :value="account.id"
              :key="account.name"
            >
              {{ account.name }}
            </option>
          </select>
        </div>

        <fwb-input v-model="titleModel" label="Title" placeholder="Title" size="sm" />
        <fwb-input
          v-model="descriptionModel"
          label="Description"
          placeholder="Description"
          size="sm"
        />
        <fwb-input v-model="amountModel" label="Amount" placeholder="Amount" size="sm" />

        <div>
          <label for="date" class="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            v-model="dateModel"
            id="date"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div class="space-y-4">
          <div>
            <label for="receipt" class="block text-sm font-medium text-gray-700"
              >Receipt</label
            >
            <input
              type="file"
              multiple
              @change="handleFileChange"
              ref="receiptInput"
              id="receipt"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div v-if="visibleReceipts && visibleReceipts.length > 0" class="space-y-2">
            <div
              v-for="receipt in visibleReceipts"
              :key="receipt.id"
              class="inline-flex items-center px-2 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded"
            >
              {{ receipt.filename }}
              <svg
                @click="removeSingleReceipt(receipt.id)"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 ml-2 cursor-pointer hover:text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <div class="text-right pt-4">
            <fwb-button @click="handleSubmitClicked" color="green"> Submit </fwb-button>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div>
        <h2 class="text-2xl font-bold mb-6">Quickbooks</h2>
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
        <div>
          <label for="vendorModel" class="block text-sm font-medium text-gray-700">
            Vendor
          </label>
          <select
            id="vendorModel"
            v-model="vendorModel"
            class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option disabled value="">-- Select Vendor --</option>
            <option v-for="vendor in qbVendors" :key="vendor.id" :value="vendor.id">
              {{ vendor.name }}
            </option>
          </select>
        </div>
        <div>
          <div
            v-for="(entry, index) in expenseEntries"
            :key="index"
            class="flex items-end gap-4 mb-4"
          >
            <!-- Expense Account Dropdown -->
            <div class="w-2/3">
              <label
                :for="'expenseAccountModel-' + index"
                class="block text-sm font-medium text-gray-700"
              >
                Expense Account
              </label>
              <select
                :id="'expenseAccountModel-' + index"
                v-model="entry.accountId"
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

            <!-- Credit Amount Input -->
            <div class="w-1/3">
              <label
                :for="'creditAmount-' + index"
                class="block text-sm font-medium text-gray-700"
              >
                Amount
              </label>
              <input
                type="number"
                v-model="entry.amount"
                :id="'creditAmount-' + index"
                class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div
              :class="[
                expenseEntries.length > 1 ? 'opacity-100' : 'opacity-0',
                'w-1/5 flex items-center justify-center h-full pt-5',
              ]"
            >
              <button
                type="button"
                @click="removeExpenseEntry(index)"
                class="text-red-500 hover:text-red-700 text-lg"
                title="Remove row"
              >
                &times;
              </button>
            </div>
          </div>

          <!-- Add Button -->
          <button
            type="button"
            @click="addExpenseEntry"
            class="text-sm text-indigo-600 hover:text-indigo-900"
          >
            + Add another account
          </button>
        </div>
        <div class="text-right pt-4">
          <fwb-button @click="handleSyncQuickbooksClicked" color="green"> Sync </fwb-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineEmits, ref } from "vue";
import { FwbInput, FwbButton, FwbNavbarCollapse } from "flowbite-vue";
import { computed } from "vue";
import { exp } from "mathjs";

const file = ref<File[] | null>([]);
const removeExistingReceipt = ref(false);

const emits = defineEmits(["submitClicked"]);

const titleModel = defineModel("title", { default: "" });
const descriptionModel = defineModel("description", { default: "" });
const amountModel = defineModel("amount", { default: "0" });
const dateModel = defineModel("date", { default: "" });
const accountModel = defineModel<string>("accountId", { default: "" });
const vendorModel = defineModel<string>("vendorId", { default: "" });
const bankAccountModel = defineModel<string>("bankAccountId", { default: "" });
const expenseAccountModel = defineModel<string>("expenseAccountId", { default: "" });

const expenseEntries = ref([
  {
    accountId: "",
    amount: "",
  },
]);

// Add a new row
function addExpenseEntry() {
  expenseEntries.value.push({ accountId: "", amount: "" });
}

function removeExpenseEntry(index: number) {
  expenseEntries.value.splice(index, 1);
}

const props = defineProps({
  isAdding: Boolean,
  accountTypes: Array,
  existingReceipts: Array,
  qbPaymentAccounts: Array,
  qbExpenseAccounts: Array,
  qbVendors: Array,
});

const removedReceiptIds = ref<number[]>([]);

const visibleReceipts = computed(() => {
  return props.existingReceipts?.filter(
    (receipt: any) => !removedReceiptIds.value.includes(receipt.id)
  );
});

function removeReceipt() {
  removeExistingReceipt.value = true;
}

function handleSubmitClicked() {
  emits("submitClicked", file.value, removedReceiptIds.value);
}

function handleSyncQuickbooksClicked() {

  emits("qbSyncClicked", expenseEntries.value);
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    file.value = Array.from(input.files);
  }
};

function removeSingleReceipt(receiptId: number) {
  removedReceiptIds.value.push(receiptId);
}
</script>
