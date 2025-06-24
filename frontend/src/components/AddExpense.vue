<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md mx-auto relative">
    <!-- Sync Status Indicator in Header -->
    <div v-if="props.syncStatus === 'syncing'" class="absolute top-2 left-2 flex items-center text-blue-600 text-sm">
      <Spinner class="w-4 h-4 mr-2" />
      <span>Syncing to QuickBooks...</span>
    </div>
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
              v-for="account in props.accountTypes as Array<{ id: string; name: string }>"
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
              v-for="receipt in visibleReceipts as Array<{ id: number; filename: string }>"
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
        <!-- QuickBooks Connection Warning -->
        <div v-if="!qbConnected" class="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-sm font-medium">QuickBooks is not connected. Please connect to use sync features.</span>
          </div>
        </div>
        
        <!-- QuickBooks Synced Data Display -->
        <div v-if="props.qbExpenseDetails" class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div class="flex items-center mb-2">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-sm font-medium text-green-800">QuickBooks Synced Data</span>
          </div>
          <div class="text-sm text-green-700 space-y-1">
            <div><span class="font-medium">Payment Account:</span> {{ props.qbExpenseDetails.AccountRef?.name || 'N/A' }}</div>
            <div><span class="font-medium">Vendor:</span> {{ props.qbExpenseDetails.EntityRef?.name || 'N/A' }}</div>
            <div><span class="font-medium">Payment Type:</span> {{ props.qbExpenseDetails.PaymentType || 'N/A' }}</div>
            <div v-if="props.qbExpenseDetails.Line && props.qbExpenseDetails.Line.length > 0">
              <span class="font-medium">Expense Accounts:</span>
              <ul class="ml-4 mt-1">
                <li v-for="(line, index) in props.qbExpenseDetails.Line" :key="index" class="text-xs">
                  {{ line.AccountBasedExpenseLineDetail?.AccountRef?.name || 'N/A' }}: ${{ line.Amount?.toFixed(2) || '0.00' }}
                </li>
              </ul>
            </div>
            <div v-if="props.qbExpenseDetails.PrivateNote">
              <span class="font-medium">Note:</span> {{ props.qbExpenseDetails.PrivateNote }}
            </div>
          </div>
        </div>
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
              v-for="account in qbPaymentAccounts as Array<{ id: string; name: string }>"
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
            <option v-for="vendor in qbVendors as Array<{ id: string; name: string }>" :key="vendor.id" :value="vendor.id">
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
                  v-for="account in qbExpenseAccounts as Array<{ id: string; name: string }>"
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
          
          <!-- Distribute Amount Button -->
          <button
            type="button"
            @click="distributeAmount"
            class="ml-4 text-sm text-blue-600 hover:text-blue-900"
            :disabled="!amountModel || parseFloat(amountModel) <= 0"
          >
            Distribute Amount
          </button>
        </div>
        
        <!-- Total Amount Display -->
        <div class="mt-2 text-sm text-gray-600">
          <span class="font-medium">QuickBooks Total:</span> 
          <span :class="[
            'ml-1',
            qbTotalAmount === parseFloat(amountModel) ? 'text-green-600' : 'text-orange-600'
          ]">
            ${{ qbTotalAmount.toFixed(2) }}
          </span>
          <span v-if="qbTotalAmount !== parseFloat(amountModel)" class="ml-2 text-xs text-orange-600">
            (Main amount: ${{ parseFloat(amountModel || '0').toFixed(2) }})
          </span>
        </div>
        <div class="text-right pt-4">
          <!-- Show sync status for existing expenses -->
          <div v-if="!props.isAdding && props.qbExpenseId" class="mb-2 text-green-600 text-sm">
            ✓ Already synced to QuickBooks
          </div>
          <fwb-button 
            v-if="!props.isAdding"
            @click="handleSyncQuickbooksClicked" 
            color="green" 
            :disabled="props.syncStatus === 'syncing' || !props.qbConnected || !!props.qbExpenseId"
            :title="!props.qbConnected ? 'QuickBooks must be connected to sync' : props.qbExpenseId ? 'Already synced' : ''"
          > 
            {{ props.qbExpenseId ? 'Already Synced' : 'Sync' }}
          </fwb-button>
          <Spinner v-if="props.syncStatus === 'syncing'" class="inline-block w-5 h-5 ml-2 align-middle text-green-600" />
          <span v-else-if="props.syncStatus === 'success'" class="text-green-600 ml-2">✔️</span>
          <span v-else-if="props.syncStatus === 'error'" class="text-red-600 ml-2">❌</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineEmits, ref } from "vue";
import { FwbInput, FwbButton, FwbNavbarCollapse } from "flowbite-vue";
import { computed, watch } from "vue";
import { exp } from "mathjs";
import Spinner from "./SpinnerComponent.vue";

const file = ref<File[] | null>([]);
const removeExistingReceipt = ref(false);

const emits = defineEmits<{
  (e: "close"): void;
  (e: "submitClicked", file: File[] | null, removedReceiptIds: number[]): void;
  (e: "qbSyncClicked", entries: { accountId: string; amount: string }[]): void;
}>();

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
  syncStatus: {
    type: String,
    default: 'idle',
  },
  qbConnected: {
    type: Boolean,
    default: false,
  },
  qbExpenseId: {
    type: String,
    default: undefined,
  },
  qbExpenseDetails: {
    type: Object,
    default: null,
  },
});

const removedReceiptIds = ref<number[]>([]);

const visibleReceipts = computed(() => {
  return props.existingReceipts?.filter(
    (receipt: any) => !removedReceiptIds.value.includes(receipt.id)
  );
});

// Compute total of QuickBooks amounts
const qbTotalAmount = computed(() => {
  return expenseEntries.value
    .filter(entry => entry.accountId && entry.amount)
    .reduce((total, entry) => total + (parseFloat(entry.amount) || 0), 0);
});

function removeReceipt() {
  removeExistingReceipt.value = true;
}

function handleSubmitClicked() {
  emits("submitClicked", file.value, removedReceiptIds.value);
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

function handleSyncQuickbooksClicked() {
  emits("qbSyncClicked", expenseEntries.value);
}

// Watch for changes in the main amount field and auto-populate QuickBooks amounts
watch(amountModel, (newAmount) => {
  const amount = parseFloat(newAmount) || 0;
  
  // Only auto-populate if there's exactly one expense entry with an account selected
  if (expenseEntries.value.length === 1 && expenseEntries.value[0].accountId) {
    expenseEntries.value[0].amount = amount.toString();
  }
});

// Auto-populate first expense account when payment account is selected
watch(bankAccountModel, (newPaymentAccount) => {
  if (newPaymentAccount && expenseEntries.value.length > 0 && !expenseEntries.value[0].accountId) {
    // If we have expense accounts available, select the first one
    if (props.qbExpenseAccounts && Array.isArray(props.qbExpenseAccounts) && props.qbExpenseAccounts.length > 0) {
      const firstAccount = props.qbExpenseAccounts[0] as { id: string; name: string };
      expenseEntries.value[0].accountId = firstAccount.id;
    }
  }
});

// Populate QuickBooks form fields with synced data
watch(() => props.qbExpenseDetails, (newDetails) => {
  if (newDetails && !props.isAdding) {
    // Only populate if we're editing (not adding new)
    return;
  }
  
  if (newDetails) {
    // Populate payment account
    if (newDetails.AccountRef?.value && props.qbPaymentAccounts) {
      const paymentAccount = (props.qbPaymentAccounts as Array<{ id: string; name: string }>).find(acc => acc.id === newDetails.AccountRef.value);
      if (paymentAccount) {
        bankAccountModel.value = paymentAccount.id;
      }
    }
    
    // Populate vendor
    if (newDetails.EntityRef?.value && props.qbVendors) {
      const vendor = (props.qbVendors as Array<{ id: string; name: string }>).find(v => v.id === newDetails.EntityRef.value);
      if (vendor) {
        vendorModel.value = vendor.id;
      }
    }
    
    // Populate expense accounts and amounts
    if (newDetails.Line && newDetails.Line.length > 0) {
      // Clear existing entries
      expenseEntries.value = [];
      
      // Add entries for each line
      newDetails.Line.forEach((line: any) => {
        if (line.AccountBasedExpenseLineDetail?.AccountRef?.value) {
          expenseEntries.value.push({
            accountId: line.AccountBasedExpenseLineDetail.AccountRef.value,
            amount: line.Amount?.toString() || '0'
          });
        }
      });
    }
  }
}, { immediate: true });

function distributeAmount() {
  const amount = parseFloat(amountModel.value) || 0;
  if (amount <= 0) return;
  
  // Get all entries that have an account selected
  const validEntries = expenseEntries.value.filter(entry => entry.accountId);
  
  if (validEntries.length === 0) return;
  
  // Distribute amount equally among selected accounts
  const amountPerEntry = amount / validEntries.length;
  
  expenseEntries.value.forEach(entry => {
    if (entry.accountId) {
      entry.amount = amountPerEntry.toFixed(2);
    }
  });
}
</script>
