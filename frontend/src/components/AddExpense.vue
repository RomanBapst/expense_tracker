<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md mx-auto relative">
    <!-- Sync Status Indicator in Header -->
    <div v-if="syncStatus === 'syncing'" class="absolute top-2 left-2 flex items-center text-blue-600 text-sm">
      <Spinner class="w-4 h-4 mr-2" />
      <span>Syncing to QuickBooks...</span>
    </div>
    <span
      class="close absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-800"
      @click="$emit('close')"
    >
      &times;
    </span>

    <!-- Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="-mb-px flex">
        <button
          class="mr-8 py-2 px-1 border-b-2 font-medium text-sm focus:outline-none"
          :class="activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'details'"
        >
          Details
        </button>
        <button
          class="py-2 px-1 border-b-2 font-medium text-sm focus:outline-none"
          :class="activeTab === 'quickbooks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'quickbooks'"
        >
          QuickBooks
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div v-if="activeTab === 'details'">
      <!-- All user-editable fields (left column content) -->
      <h2 class="text-2xl font-bold mb-6">{{ isAdding ? "Add Expense" : "Edit Expense" }}</h2>
      <div>
        <label for="accountModel" class="block text-sm font-medium text-gray-700">Account Type</label>
        <Multiselect
          v-model="accountModel"
          :options="accountTypes"
          label="name"
          valueProp="id"
          placeholder="Select or search account type"
          searchable
          class="mt-1 block w-full"
          :maxHeight="350"
        />
      </div>
      <fwb-input v-model="titleModel" label="Title" placeholder="Title" size="sm" />
      <fwb-input v-model="descriptionModel" label="Description" placeholder="Description" size="sm" />
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
          <label for="receipt" class="block text-sm font-medium text-gray-700">Receipt</label>
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
    <div v-else-if="activeTab === 'quickbooks'">
      <!-- QuickBooks Tab Content -->
      <div v-if="!qbExpenseId">
        <!-- Mode Selector: show if not synced -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">QuickBooks Action</label>
          <Multiselect
            v-model="mode"
            :options="modeOptions"
            label="label"
            valueProp="value"
            placeholder="Select action"
            class="w-64"
          />
        </div>
        <h2 class="text-2xl font-bold mb-6">Quickbooks</h2>
        <!-- Auto-population info -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-sm font-medium">Tip: Amount from Details tab is automatically populated. Both title and description will be used in the QuickBooks memo.</span>
          </div>
        </div>
        <!-- QuickBooks Connection Warning -->
        <div v-if="!qbConnected" class="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-sm font-medium">QuickBooks is not connected. Please connect to use sync features.</span>
          </div>
        </div>
        <!-- QuickBooks selectors, sync button, etc. -->
        <div v-if="!qbExpenseId">
          <div v-if="mode === 'Expense'">
            <div>
              <label for="bankAccountModel" class="block text-sm font-medium text-gray-700">
                Payment Account
              </label>
              <Multiselect
                id="bankAccountModel"
                v-model="bankAccountModel"
                :options="qbPaymentAccounts || []"
                label="name"
                valueProp="id"
                placeholder="Select or search payment account"
                searchable
                class="mt-1 block w-full"
                :maxHeight="350"
              />
            </div>
            <div>
              <label for="vendorModel" class="block text-sm font-medium text-gray-700">
                Vendor
              </label>
              <Multiselect
                id="vendorModel"
                v-model="vendorModel"
                :options="qbVendors"
                label="name"
                valueProp="id"
                placeholder="Select or search vendor"
                searchable
                class="mt-1 block w-full"
                :maxHeight="350"
              />
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
                  <Multiselect
                    :id="'expenseAccountModel-' + index"
                    v-model="entry.accountId"
                    :options="qbExpenseAccounts"
                    label="name"
                    valueProp="id"
                    placeholder="Select or search expense account"
                    searchable
                    class="mt-1 block w-full"
                    :maxHeight="800"
                  />
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
                    'transition-opacity duration-200'
                  ]"
                >
                  <button
                    v-if="expenseEntries.length > 1"
                    @click="removeExpenseEntry(index)"
                    class="text-red-500 hover:text-red-700 text-lg font-bold"
                    title="Remove entry"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <button
                @click="addExpenseEntry"
                class="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
                type="button"
              >
                + Add Expense Account
              </button>
              <button
                v-if="expenseEntries.length > 1"
                @click="distributeAmount"
                class="mt-2 ml-2 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs"
                type="button"
                :disabled="!amountModel || Number(amountModel) <= 0"
              >
                Distribute Amount
              </button>
            </div>
            <div class="mt-4 flex items-center">
              <input
                type="checkbox"
                id="hasVat"
                v-model="hasVat"
                class="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label for="hasVat" class="ml-2 block text-sm text-gray-700">Has VAT</label>
            </div>
            <div class="pt-4 text-right">
              <fwb-button
                :disabled="expenseEntries.length === 0 || expenseEntries.some(e => !e.accountId || !e.amount)"
                @click="handleSyncQuickbooksClicked"
                color="blue"
              >
                Sync to QuickBooks
              </fwb-button>
            </div>
          </div>
          <div v-else-if="mode === 'Transfer'">
            <div class="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              <span class="font-medium">Note:</span> Amount and description are taken from the Details tab above.
            </div>
            <div>
              <label for="fromAccountModel" class="block text-sm font-medium text-gray-700">
                From Account
              </label>
              <Multiselect
                id="fromAccountModel"
                v-model="transferFromAccount"
                :options="(bankAssetAccounts || []).filter(acc => acc.id !== transferToAccount)"
                label="name"
                valueProp="id"
                placeholder="Select or search bank account"
                searchable
                class="mt-1 block w-full"
                :maxHeight="350"
              />
            </div>
            <div>
              <label for="toAccountModel" class="block text-sm font-medium text-gray-700">
                To Account
              </label>
              <div v-for="(index, entry) in transferToEntries" :key="index" class="mb-2)">
              
              <Multiselect
                id="toAccountModel"
                v-model="entry.accountId"
                :options="[...(assetAccounts || []), ...(liabilityAccounts || [])].filter(acc => acc.id !== transferFromAccount)"
                label="name"
                valueProp="id"
                placeholder="Select or search account"
                searchable
                class="mt-1 block w-full"
                :maxHeight="350"
              />
              </div>
            </div>
            <div class="pt-4 text-right">
              <fwb-button
                :disabled="!transferFromAccount || !transferToAccount || !amountModel || Number(amountModel) <= 0 || transferFromAccount === transferToAccount"
                @click="handleSubmitTransfer"
                color="blue"
              >
                Sync to QuickBooks
              </fwb-button>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <!-- QuickBooks Synced Data Display -->
        <div v-if="qbExpenseId && qbDetailsLoading" class="flex justify-center items-center py-8">
          <Spinner class="w-8 h-8 text-blue-600" />
        </div>
        <div v-else-if="qbExpenseId && !qbExpenseDetails" class="flex justify-center items-center py-8">
          <Spinner class="w-8 h-8 text-blue-600" />
        </div>
        <div v-else-if="qbExpenseDetails" class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div class="flex items-center mb-2">
            <svg class="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span class="text-sm font-medium text-green-800">QuickBooks Synced Data</span>
          </div>
          <div class="text-sm text-green-700 space-y-1">
            <template v-if="qbExpenseDetails.Line">
              <div><span class="font-medium">Payment Account:</span> {{ qbExpenseDetails.AccountRef?.name || 'N/A' }}</div>
              <div><span class="font-medium">Vendor:</span> {{ qbExpenseDetails.EntityRef?.name || 'N/A' }}</div>
              <div><span class="font-medium">Payment Type:</span> {{ qbExpenseDetails.PaymentType || 'N/A' }}</div>
              <div v-if="qbExpenseDetails.Line && qbExpenseDetails.Line.length > 0">
                <span class="font-medium">Expense Accounts:</span>
                <ul class="ml-4 mt-1">
                  <li v-for="(line, index) in qbExpenseDetails.Line" :key="index" class="text-xs">
                    {{ line.AccountBasedExpenseLineDetail?.AccountRef?.name || 'N/A' }}: ${{ line.Amount?.toFixed(2) || '0.00' }}
                  </li>
                </ul>
              </div>
              <div v-if="qbExpenseDetails.PrivateNote">
                <span class="font-medium">Note:</span> {{ qbExpenseDetails.PrivateNote }}
              </div>
            </template>
            <template v-else>
              <div><span class="font-medium">From Account:</span> {{ qbExpenseDetails.FromAccountRef?.name || qbExpenseDetails.FromAccountRef?.value || 'N/A' }}</div>
              <div><span class="font-medium">To Account:</span> {{ qbExpenseDetails.ToAccountRef?.name || qbExpenseDetails.ToAccountRef?.value || 'N/A' }}</div>
              <div><span class="font-medium">Amount:</span> ${{ qbExpenseDetails.Amount || '0.00' }}</div>
              <div><span class="font-medium">Date:</span> {{ qbExpenseDetails.TxnDate || 'N/A' }}</div>
              <div v-if="qbExpenseDetails.PrivateNote">
                <span class="font-medium">Note:</span> {{ qbExpenseDetails.PrivateNote }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineEmits, ref, computed, watch } from "vue";
import { FwbInput, FwbButton, FwbNavbarCollapse } from "flowbite-vue";
import { exp } from "mathjs";
import Spinner from "./SpinnerComponent.vue";
import Multiselect from '@vueform/multiselect';
import '@vueform/multiselect/themes/default.css';

const file = ref<File[] | null>([]);
const removeExistingReceipt = ref(false);

const emits = defineEmits<{
  (e: "close"): void;
  (e: "submitClicked", file: File[] | null, removedReceiptIds: number[]): void;
  (e: "qbSyncClicked", entries: { accountId: string; amount: string }[], hasVat: boolean): void;
  (e: "submitTransfer", from: string, to: string, amount: string, localExpenseId: number | string | null, description: string): void;
}>();

const titleModel = defineModel("title", { default: "" });
const descriptionModel = defineModel("description", { default: "" });
const amountModel = defineModel("amount", { default: "0" });
const dateModel = defineModel("date", { default: "" });
const accountModel = defineModel<string>("accountId", { default: "" });
const vendorModel = defineModel<string>("vendorId", { default: "" });
const bankAccountModel = defineModel<string>("bankAccountId", { default: "" });
const expenseAccountModel = defineModel<string>("expenseAccountId", { default: "" });

const hasVat = ref(false);

const expenseEntries = ref([
  {
    accountId: "",
    amount: "",
  },
]);
const transferToEntries = ref([
  {
    accountId: "",
    amount: "",
  },
]);

// Mode selection
const modeOptions = [
  { label: 'Expense', value: 'Expense' },
  { label: 'Transfer', value: 'Transfer' },
];
const mode = ref<'Expense' | 'Transfer'>('Expense');

// Transfer form state
const transferFromAccount = ref("");
const transferToAccount = ref("");

// Tab state
const activeTab = ref<'details' | 'quickbooks'>('details');

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
  qbPaymentAccounts: {
    type: Array as () => Array<{ id: string; name: string }>,
    default: () => [],
  },
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
  qbDetailsLoading: {
    type: Boolean,
    default: false,
  },
  liabilityAccounts: {
    type: Array as () => Array<{ id: string; name: string; type: string }>,
    default: () => [],
  },
  assetAccounts: {
    type: Array as () => Array<{ id: string; name: string; type: string }>,
    default: () => [],
  },
  bankAssetAccounts: {
    type: Array as () => Array<{ id: string; name: string; type: string }>,
    default: () => [],
  },
  localExpenseId: {
    type: [Number, String],
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
  emits("qbSyncClicked", expenseEntries.value, hasVat.value);
}

// Watch for changes in the main amount field and auto-populate QuickBooks amounts
watch(amountModel, (newAmount) => {
  const amount = parseFloat(newAmount) || 0;
  
  // Auto-populate amount to all expense entries that have an account selected
  expenseEntries.value.forEach(entry => {
    if (entry.accountId) {
      entry.amount = amount.toString();
    }
  });
  
  // If there's only one expense entry and it has an account, populate it
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
      
      // Also populate the amount if we have one
      const amount = parseFloat(amountModel.value) || 0;
      if (amount > 0) {
        expenseEntries.value[0].amount = amount.toString();
      }
    }
  }
});

// Watch for tab changes to auto-populate QuickBooks data
watch(activeTab, (newTab) => {
  if (newTab === 'quickbooks') {
    // When switching to QuickBooks tab, auto-populate amounts if we have them
    const amount = parseFloat(amountModel.value) || 0;
    if (amount > 0) {
      // Always populate the first expense entry with the amount from Details tab
      if (expenseEntries.value.length > 0) {
        expenseEntries.value[0].amount = amount.toString();
      }
      
      // Also populate other entries that have accounts selected
      expenseEntries.value.forEach((entry, index) => {
        if (index > 0 && entry.accountId) {
          entry.amount = amount.toString();
        }
      });
    }
    
    // Removed: No longer auto-populate description with title since we use both in the memo
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

function handleSubmitTransfer() {
  emits("submitTransfer", transferFromAccount.value, transferToAccount.value, amountModel.value, props.localExpenseId, descriptionModel.value);
}

// Type guard for Transfer details
function isTransferDetails(details: any): details is { FromAccountRef?: any, ToAccountRef?: any, Amount?: any, TxnDate?: any } {
  return details && (details.FromAccountRef || details.ToAccountRef || details.Amount || details.TxnDate);
}
</script>

<style>
/* Increase the dropdown menu height for Multiselect */
.multiselect-dropdown {
  max-height: 350px !important;
}
</style>
