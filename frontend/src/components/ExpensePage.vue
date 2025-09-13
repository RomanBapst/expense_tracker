<template>
  <div class="flex flex-col h-screen mx-auto">
    <!-- Fixed NavigationBar on top -->
    <NavigationBar class="fixed top-0 left-0 w-full z-50" />

    <!-- Content wrapper with padding at the top to avoid overlap with NavigationBar -->
    <div class="pt-16 pb-10 flex flex-col h-full">
      <div class="px-4 py-2">
        <fwb-heading tag="h1" class="text-blue-400 text-2xl font-bold">
          Expense Tracker
        </fwb-heading>
        <!-- QuickBooks Connection Status -->
        <div class="flex items-center mt-2">
          <span class="text-sm font-medium text-gray-700 mr-2">QuickBooks:</span>
          <div class="flex items-center cursor-pointer" @click="checkIfQbConnected">
            <div 
              :class="[
                'w-3 h-3 rounded-full mr-2',
                qbConnected ? 'bg-green-500' : 'bg-red-500'
              ]"
            ></div>
            <span 
              :class="[
                'text-sm',
                qbConnected ? 'text-green-600' : 'text-red-600'
              ]"
            >
              {{ qbConnected ? 'Connected' : 'Disconnected' }}
            </span>
            <svg class="w-4 h-4 ml-2 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
          <fwb-button 
            v-if="!qbConnected" 
            @click="qbLogin" 
            class="ml-4 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
          >
            Connect QuickBooks
          </fwb-button>
        </div>
        
        <!-- Global Sync Status Indicator -->
        <div v-if="syncStatus === 'syncing'" class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center">
          <Spinner class="w-4 h-4 mr-2 text-blue-600" />
          <span class="text-sm text-blue-700">Syncing expense to QuickBooks...</span>
        </div>
        <div v-else-if="syncStatus === 'success'" class="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center">
          <span class="text-green-600 mr-2">✓</span>
          <span class="text-sm text-green-700">Successfully synced to QuickBooks!</span>
        </div>
        <div v-else-if="syncStatus === 'error'" class="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-center">
          <span class="text-red-600 mr-2">❌</span>
          <span class="text-sm text-red-700">Failed to sync to QuickBooks</span>
        </div>
      </div>

      <!-- Conditionally Rendered Components -->
      <AddExpense
        v-if="(isEditing || isAdding) && !isUploading"
        v-model:title="title"
        v-model:description="description"
        v-model:amount="amount"
        v-model:date="date"
        v-model:accountId="expenseAccount"
        v-model:vendorId="selectedVendorId"
        v-model:bankAccountId="selectedBankAccountId"
        :existingReceipts="existingReceipts"
        :isAdding="isAdding"
        :accountTypes="accounts"
        :removeExistingReceipt="removeExistingReceipt"
        :file="file"
        :qbPaymentAccounts="prepareBankAccounts"
        :qbExpenseAccounts="prepareExpenseAccounts"
        :qbVendors="prepareQbVendors"
        :liabilityAccounts="prepareLiabilityAccounts"
        :assetAccounts="prepareAssetAccounts"
        :bankAssetAccounts="prepareBankAssetAccounts"
        :qbConnected="qbConnected"
        :qbExpenseId="getCurrentExpenseQbId().qbQbId"
        :qbExpenseDetails="qbExpenseDetails"
        :localExpenseId="editedExpenseId"
        :qbDetailsLoading="qbDetailsLoading"
        @close="closeAddExpenseDialog"
        @submitClicked="handleAddExpense"
        @qbSyncClicked="handleQbSync"
        @submitTransfer="handleTransferSubmit"
        :syncStatus="syncStatus"
      />

      <!-- Main Content Area -->
      <div class="expenses-table flex flex-col h-full overflow-y-auto mb-8 px-4">
        <!-- Admin Controls -->
        <div v-if="isAdmin" class="flex justify-between mb-4">
          <fwb-button @click="showAddExpenseForm">Add New Expense</fwb-button>
          <div class="relative flex items-center">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search expenses..."
              @keyup.enter="onSearch"
              class="border rounded p-2"
            />
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="absolute -left-4 text-xl text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div class="tabs mb-4 flex border-b border-gray-200">
          <button
            @click="activeTab = 'tab1'"
            :class="{
              'text-blue-600 border-b-2 border-blue-600': activeTab === 'tab1',
              'text-gray-500 hover:text-gray-700': activeTab !== 'tab1',
            }"
            class="px-4 py-2 -mb-px focus:outline-none transition-colors duration-200"
          >
            Open Expenses
          </button>
          <button
            @click="activeTab = 'tab2'"
            :class="{
              'text-blue-600 border-b-2 border-blue-600': activeTab === 'tab2',
              'text-gray-500 hover:text-gray-700': activeTab !== 'tab2',
            }"
            class="px-4 py-2 -mb-px focus:outline-none transition-colors duration-200"
          >
            Archived Expenses
          </button>
        </div>

        <!-- Expenses Tables -->
        <SimpleTable
          v-show="activeTab === 'tab1'"
          v-model:sortColumnIndex="sortColumnIndex"
          v-model:sortColumnOrder="sortColumnOrder"
          :header="[
            'Account',
            'Author',
            'Date',
            'Title',
            'Description',
            'Amount',
            'Receipt',
            'Actions',
          ]"
          :items="filteredExpenses"
          :sortFunction="sortByColumn"
        >
          <template #cell-6="{ item }">
            <span
              v-if="item.receipt"
              class="cursor-pointer text-blue-500"
              @click="openReceipt(item.id)"
            >
              📎
            </span>
          </template>
          <template #cell-3="{ item }">
            <div class="flex items-center">
              <span>{{ item.values[3] }}</span>
              <span v-if="item.qbQbId && item.qbEntityType" class="ml-2 text-green-600 text-xs" :title="`Synced to QuickBooks as ${item.qbEntityType}`">✓ QB ({{ item.qbEntityType }})</span>
            </div>
          </template>
          <template #button1="{ item }">
            <div class="flex items-center justify-center">
              <Spinner
                v-if="uploadingExpenseIds.has(item.id)"
                class="w-4 h-4 text-blue-600"
                style="margin: 0; padding: 0"
              />
              <fwb-button v-else @click="archiveExpense(item.id)" class="bg-blue-700">
                Archive
              </fwb-button>
            </div>
          </template>

          <template #button2="{ item }">
            <fwb-button @click="handleEditExpense(item.id)" class="bg-green-700"
              >Edit</fwb-button
            >
          </template>
        </SimpleTable>

        <SimpleTable
          v-show="activeTab === 'tab2'"
          v-model:sortColumnIndex="archivedSortColumnIndex"
          v-model:sortColumnOrder="archivedSortColumnOrder"
          :header="[
            'Account',
            'Author',
            'Date',
            'Title',
            'Description',
            'Amount',
            'Receipt',
            'Actions',
          ]"
          :items="filteredArchivedExpenses"
          :sortFunction="sortByColumn"
        >
          <template #cell-6="{ item }">
            <span
              v-if="item.receipt"
              class="cursor-pointer text-blue-500"
              @click="openReceipt(item.id)"
            >
              📎
            </span>
          </template>
          <template #cell-3="{ item }">
            <div class="flex items-center">
              <span>{{ item.values[3] }}</span>
              <span v-if="item.qbQbId && item.qbEntityType" class="ml-2 text-green-600 text-xs" :title="`Synced to QuickBooks as ${item.qbEntityType}`">✓ QB ({{ item.qbEntityType }})</span>
            </div>
          </template>
          <template #button1="{ item }">
            <fwb-button @click="restoreExpense(item.id)" class="bg-blue-700"
              >Restore</fwb-button
            >
          </template>
        </SimpleTable>
      </div>
    </div>
  </div>
  <div
    v-if="receiptViewerOpen"
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
  >
    <div class="bg-white p-4 rounded shadow-lg max-w-md w-full">
      <h3 class="text-lg font-semibold mb-2">Receipts</h3>
      <ul class="mb-4">
        <li
          v-for="(receipt, index) in selectedReceipts"
          :key="index"
          class="text-blue-500 hover:underline cursor-pointer"
          @click="displayReceipt(receipt.id)"
        >
          {{ receipt.name }}
        </li>
      </ul>
      <button @click="receiptViewerOpen = false" class="text-sm text-gray-700 underline">
        Close
      </button>
    </div>
  </div>
  <ErrorPopup :message="errorMessage" :show="showError" @close="showError = false" />
</template>

<script setup lang="ts">
import NavigationBar from "./NavigationBar.vue";
import AddExpense from "./AddExpense.vue";
import SimpleTable from "./SimpleTable.vue";
import Spinner from "./SpinnerComponent.vue"; // Import the Spinner component
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import {
  Expense,
  Account,
  QBAccount,
  QBVendor,
  QBExpenseDetails,
  createExpensePayload,
} from "@/expenses/expenses";
import { FwbButton } from "flowbite-vue"; // Add this import statement
import { exp, number, sortDependencies, string } from "mathjs";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

import { isAdmin, getIsAdmin } from "@/utils/authUtils";

import ErrorPopup from "./ErrorPopup.vue";
import AddQuickbooksExpense from "./AddQuickbooksExpense.vue";
import { postQbExpense } from "@/expenses/quickbooks/quickbooks";

const router = useRouter();
const route = useRoute();
const auth0 = useAuth0();

const showError = ref(false);
const errorMessage = ref("");

const expenses = ref<Expense[]>([]);
const archivedExpenses = ref<Expense[]>([]);

const accounts = ref<Account[]>([]);

const isEditing = ref(false);
const isAdding = ref(false);
const editedExpenseId = ref<number | null>(null);

const activeTab = ref("tab1");

const isLoading = ref(false);
const isUploading = ref(false);

const file = ref<File[] | null>([]);

const title = ref("");
const description = ref("");
const amount = ref<string>("0");
const date = ref(new Date().toISOString().split("T")[0]); // Current date in YYYY-MM-DD format
const hasExistingReceipt = ref(false);
const existingReceipts = ref<Array<object>>([]);
const removeExistingReceipt = ref(false);
const expenseAccount = ref<string>("");

const selectedVendorId = ref<string>("");
const selectedBankAccountId = ref<string>("");

const searchQuery = ref("");

const scrollPosition = ref(0); // Holds the vertical scroll position

const sortColumnIndex = ref(0);
const sortColumnOrder = ref("asc");

const archivedSortColumnIndex = ref(0);
const archivedSortColumnOrder = ref("asc");

const receiptViewerOpen = ref(false);
const selectedReceipts = ref<Array<{ url: string; id: string }>>([]);

const uploadingExpenseIds = ref<Set<number>>(new Set());

const qbBankAccounts = ref<QBAccount[]>([]);
const baseUrlQbAccounts = import.meta.env.VITE_APP_API_ADDR + "/getAccounts";
const qbVendors = ref<QBVendor[]>([]);
const baseUrlQbVendors = import.meta.env.VITE_APP_API_ADDR + "/getVendors";

// QuickBooks details for synced expenses
const qbExpenseDetails = ref<QBExpenseDetails | null>(null);
const baseUrlQbDetails = import.meta.env.VITE_APP_API_ADDR + "/qb-expense";

// Sync status for AddExpense QuickBooks sync
const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle');

// Add QuickBooks connection status
const qbConnected = ref(false);
const baseUrlQbConnected = import.meta.env.VITE_APP_API_ADDR + "/api/qb/status";

const baseUrlQbTransfer = import.meta.env.VITE_APP_API_ADDR + "/createTransfer";

const qbDetailsLoading = ref(false);

enum ColumnType {
  DEFAULT = 1,
  DATE,
  FLOAT,
}

const columns = [
  { key: "account", label: "Account", colType: ColumnType.DEFAULT },
  { key: "author", label: "Author", colType: ColumnType.DEFAULT },
  { key: "createdAt", label: "Date", colType: ColumnType.DATE },
  { key: "title", label: "Title", colType: ColumnType.DEFAULT },
  { key: "comment", label: "Description", colType: ColumnType.DEFAULT },
  { key: "amount", label: "Amount", colType: ColumnType.FLOAT },
  {
    key: "receipt",
    colType: ColumnType.DEFAULT,
    label: "Receipt",
  },
];

const baseUrl = import.meta.env.VITE_APP_API_ADDR + "/expenses";

const prepareBankAccounts = computed(() => {
  return qbBankAccounts.value
    .filter((el) => {
      return el.type === "Bank";
    })
    .map((el) => ({
      id: el.id,
      name: el.name,
    }));
});
const prepareExpenseAccounts = computed(() => {
  // Only include 'Expense' accounts that are leaf nodes (no children)
  const accounts = qbBankAccounts.value
    .filter((el) => {
      const acc = el as any;
      if (acc.type !== "Expense") return false;
      if (acc.SubAccounts && Array.isArray(acc.SubAccounts) && acc.SubAccounts.length > 0) return false;
      if (acc.Child && Array.isArray(acc.Child) && acc.Child.length > 0) return false;
      if (acc.hasChildren === true) return false;
      if (acc.IsParent === true) return false;
      return true;
    })
    .map((el) => ({
      id: el.id,
      name: el.name,
    }));
  console.log("Filtered leaf expense accounts:", accounts);
  return accounts;
});
const prepareQbVendors = computed(() => {
  return qbVendors.value.map((el) => ({
    id: el.id,
    name: el.name,
  }));
});

const prepareLiabilityAccounts = computed(() => {
  return qbBankAccounts.value
    .filter((el) => typeof el.type === 'string' && el.type.toLowerCase().includes('liability'))
    .map((el) => ({ id: el.id, name: el.name, type: el.type }));
});
const prepareAssetAccounts = computed(() => {
  return qbBankAccounts.value
    .filter((el) => typeof el.type === 'string' && el.type.toLowerCase().includes('asset'))
    .map((el) => ({ id: el.id, name: el.name, type: el.type }));
});
const prepareBankAssetAccounts = computed(() => {
  return qbBankAccounts.value
    .filter((el) => typeof el.type === 'string' && el.type.toLowerCase() === 'bank')
    .map((el) => ({ id: el.id, name: el.name, type: el.type }));
});

function displayError(message: string) {
  errorMessage.value = message;
  showError.value = true;
}

function clearSearch() {
  searchQuery.value = "";
  router.push({
    query: {
      search: searchQuery.value,
      orderColName: columns[sortColumnIndex.value].key.toString(),
      order: sortColumnOrder.value,
      archived: activeTab.value === "tab2",
    },
  });
  onSearch();
}

watch(sortColumnIndex, async (_value) => {
  await getAllExpenses();
});
watch(sortColumnOrder, async (_value) => {
  router.push({
    query: {
      search: searchQuery.value,
      orderColName: columns[sortColumnIndex.value].key.toString(),
      order: sortColumnOrder.value,
      archived: activeTab.value === "tab2",
    },
  });
  await getAllExpenses();
});
watch(archivedSortColumnIndex, async (_value) => {
  await getAllArchivedExpenses();
});
watch(archivedSortColumnOrder, async (_value) => {
  router.push({
    query: {
      search: searchQuery.value,
      orderColName: columns[archivedSortColumnIndex.value].key.toString(),
      order: archivedSortColumnOrder.value,
      archived: activeTab.value === "tab2",
    },
  });
  await getAllArchivedExpenses();
});

const onSearch = async () => {
  if (searchQuery.value) {
    if (activeTab.value === "tab2") {
      router.push({
        query: {
          search: searchQuery.value,
          orderColName: columns[archivedSortColumnIndex.value].key.toString(),
          order: archivedSortColumnOrder.value,
          archived: true,
        },
      });
    } else {
      router.push({
        query: {
          search: searchQuery.value,
          orderColName: columns[sortColumnIndex.value].key.toString(),
          order: sortColumnOrder.value,
          archived: false,
        },
      });
    }
  }
  await getAllExpenses();
  await getAllArchivedExpenses();
};

function closeAddExpenseDialog() {
  isEditing.value = false;
  isAdding.value = false;
  // Don't reset sync status if sync is in progress
  // This allows the sync to continue in the background
  if (syncStatus.value !== 'syncing') {
    syncStatus.value = 'idle';
  }
  qbExpenseDetails.value = null; // Clear QuickBooks details when dialog closes
}

const filteredExpenses = computed(() => {
  return prepareExpenses().map((el) => ({
    id: el.id,
    values: [
      el.account?.name,
      el.author.name,
      convertDate(el.createdAt),
      el.title,
      el.comment,
      Number(el.amount).toLocaleString("en-US"),
      0,
    ],
    receipt: el.receipts.length > 0,
    qbQbId: el.qbQbId,
    qbEntityType: el.qbEntityType,
  }));
});

async function archiveExpense(id: number) {
  if (isAdding.value || isEditing.value) {
    return;
  }

  try {
    const expense = expenses.value.find((el) => {
      return el.id === id;
    });

    if (expense == undefined) {
      throw new Error("Failed to find expense");
    }

    const formData = new FormData();
    formData.append("title", expense.title);
    formData.append("description", expense.comment);
    formData.append("amount", expense.amount);
    formData.append("date", expense.createdAt);
    formData.append("archived", "true");

    await editExpense(id, formData);
    getAllArchivedExpenses();
  } catch (err) {
    console.log(err);
  }
}

function sortByColumn(index: number, sortDirection: string, sortedItems: Array<any>) {
  if (index >= columns.length) {
    return sortedItems;
  }

  return sortedItems.sort((a, b) => {
    let aValue = a.values[index];
    let bValue = b.values[index];

    if (columns[index].colType == ColumnType.DATE) {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (columns[index].colType == ColumnType.FLOAT) {
      aValue = parseFloat(a.values[index].replaceAll(",", ""));
      bValue = parseFloat(b.values[index].replaceAll(",", ""));
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
}

const displayReceipt = async (id: string) => {
  const token = await auth0.getAccessTokenSilently();

  const res = await fetch(`${import.meta.env.VITE_APP_API_ADDR}/receipt/${id}/file`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch receipt:", res.statusText);
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
};

function openReceipt(expenseId: number) {
  let expense = expenses.value.find((e) => e.id === expenseId);
  if (!expense || !expense.receipts.length) {
    expense = archivedExpenses.value.find((e) => e.id === expenseId);
  }

  if (!expense || !expense.receipts.length) return;
  selectedReceipts.value = expense.receipts.map((r) => ({
    name: r.filename || r.name || "receipt",
    id: r.id,
  }));
  receiptViewerOpen.value = true;
}

const handleAddExpense = (
  fileData: Array<File> | null,
  removedReceiptIds: Array<number> = []
) => {
  file.value = fileData; // Update the file data in the parent component
  const formData = new FormData();
  formData.append("title", title.value);
  formData.append("description", description.value);
  formData.append("amount", parseFloat(amount.value));
  formData.append("date", new Date(date.value).toISOString().split("T")[0]);
  formData.append("expenseAccount", parseInt(expenseAccount.value));

  console.log(expenseAccount.value);

  // Append file if it exists
  if (file.value?.length > 0) {
    file.value?.forEach((f, index) => {
      console.log("adding with index: " + index);
      formData.append("receipts", f);
    });
  }

  if (isEditing.value && editedExpenseId.value) {
    if (removedReceiptIds.length > 0) {
      formData.append("removedReceiptIds", JSON.stringify(removedReceiptIds));
    }

    editExpense(editedExpenseId.value, formData);
  } else if (isAdding.value) {
    addExpense(formData);
  }
};

function convertDate(dateString: string) {
  const date = new Date(dateString);
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Function to show add expense form
function showAddExpenseForm() {
  title.value = "";
  description.value = "";
  amount.value = 0;
  date.value = new Date().toISOString().split("T")[0];
  isEditing.value = false;
  isAdding.value = true;
  existingReceipts.value = [];
}

function prepareExpenses() {
  return expenses.value.filter((el) => {
    return !el.archived;
  });
}

function prepareArchivedExpenses() {
  return archivedExpenses.value.filter((el) => {
    return el.archived;
  });
}

function getCurrentExpenseQbId(): { qbQbId?: string, qbEntityType?: string } {
  if (!editedExpenseId.value) return {};
  const expense = expenses.value.find(exp => exp.id === editedExpenseId.value);
  return { qbQbId: expense?.qbQbId, qbEntityType: expense?.qbEntityType };
}

const filteredArchivedExpenses = computed(() => {
  return prepareArchivedExpenses().map((el) => ({
    id: el.id,
    values: [
      el.account?.name,
      el.author.name,
      convertDate(el.createdAt),
      el.title,
      el.comment,
      Number(el.amount).toLocaleString("en-US"),
      0,
    ],
    receipt: el.receipts.length > 0,
    qbQbId: el.qbQbId,
    qbEntityType: el.qbEntityType,
  }));
});

async function editExpense(id: number, formData: FormData) {
  try {
    uploadingExpenseIds.value.add(id);
    isUploading.value = true;
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(baseUrl + `/${id}`, {
      ...requestOptions,
      method: "PUT",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const updatedExpense: Expense = await response.json();

    // Find and update the specific expense in the array
    const index = expenses.value.findIndex((expense) => expense.id === id);
    if (index !== -1) {
      // Update only the modified expense
      expenses.value[index] = { ...expenses.value[index], ...updatedExpense };
    }
  } catch (err) {
    console.error(`Failed to edit expense:`, err.message);
    displayError(err.message);
  } finally {
    uploadingExpenseIds.value.delete(id);
    isUploading.value = false;
    resetForm();
  }
}

async function addExpense(formData: FormData) {
  try {
    isUploading.value = true;
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(baseUrl, {
      ...requestOptions,
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const newExpense = await response.json();
    getAllExpenses();
  } catch (err: any) {
    console.error(`Failed to add expense:`, err.message);
    displayError(err.message);
  } finally {
    isUploading.value = false;
    resetForm();
  }
}

function resetForm() {
  title.value = "";
  description.value = "";
  amount.value = "0";
  date.value = new Date().toISOString().split("T")[0];
  isEditing.value = false;
  isAdding.value = false;
  existingReceipts.value = [];
}

async function restoreExpense(id: number) {
  try {
    let expense: Expense | undefined = archivedExpenses.value.find((el) => {
      return el.id === id;
    });

    if (!expense) {
      throw new Error(`Error: Cannot restore Expense with id ${id}, id not found!`);
    }

    const formData = new FormData();
    formData.append("title", expense.title);
    formData.append("description", expense.comment);
    formData.append("amount", expense.amount);
    formData.append("date", expense.createdAt);
    formData.append("archived", "false");

    await editExpense(id, formData);
    getAllArchivedExpenses();
  } catch (err) {
    console.error("Failed to restore expense: ", err.message);
  }
}

async function deleteExpense(id: Number) {
  try {
    const token = await auth0.getAccessTokenSilently();
    const requestOptions = {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    };

    const uri = baseUrl + `/${id}`;

    const response = await fetch(uri, requestOptions);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getAllExpenses();
  } catch (err) {
    console.error("Failed to delete expense:", err.message);
  }
}

async function getAllExpenses() {
  try {
    isLoading.value = true;
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await axios.get(baseUrl, {
      headers: { Authorization: "Bearer " + token },
      params: {
        search: searchQuery.value,
        archived: false,
        orderColName: columns[sortColumnIndex.value].key,
        order: sortColumnOrder.value,
      },
    });

    expenses.value = response.data;
  } catch (err) {
    displayError(err.message);
  } finally {
    isLoading.value = false;
  }
}
async function getAllArchivedExpenses() {
  try {
    isLoading.value = true;
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await axios.get(baseUrl, {
      headers: { Authorization: "Bearer " + token },
      params: {
        search: searchQuery.value,
        archived: true,
        orderColName: columns[archivedSortColumnIndex.value].key,
        order: archivedSortColumnOrder.value,
      },
    });

    archivedExpenses.value = response.data;
  } catch (err) {
    console.error("Failed to fetch expenses:", err.message);
  } finally {
    isLoading.value = false;
  }
}

async function getAllAccounts() {
  try {
    isLoading.value = true;
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const baseUrl = import.meta.env.VITE_APP_API_ADDR + "/account";

    const response = await fetch(baseUrl, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    accounts.value = data;
  } catch (err) {
    console.error("Failed to fetch expenses:", err.message);
    displayError(err.message);
  } finally {
    isLoading.value = false;
  }
}

async function handleEditExpense(id: number) {
  if (isAdding.value || isEditing.value) {
    return;
  }

  scrollPosition.value = document.querySelector(".expenses-table").scrollTop;

  const expense = expenses.value.find((exp) => exp.id === id);
  if (expense !== undefined) {
    editedExpenseId.value = id;
    title.value = expense.title;
    description.value = expense.comment;
    amount.value = expense.amount;
    date.value = new Date(expense.createdAt).toISOString().split("T")[0];
    isEditing.value = true;
    hasExistingReceipt.value = expense.receiptFilename !== null;
    removeExistingReceipt.value = false;
    expenseAccount.value = String(expense.accountId);
    existingReceipts.value = expense.receipts;
    // Fetch QuickBooks details if expense is synced
    if (expense.qbQbId && expense.qbEntityType) {
      qbDetailsLoading.value = true;
      await getQbExpenseDetails(id);
      qbDetailsLoading.value = false;
    } else {
      qbExpenseDetails.value = null;
    }
  }
}

onMounted(() => {
  getIsAdmin();
  getAllAccounts();
  getqbAccounts();
  getQbVendors();
  checkIfQbConnected();

  // Check for stored QuickBooks callback parameters
  const storedCode = sessionStorage.getItem('qb_callback_code');
  const storedRealmId = sessionStorage.getItem('qb_callback_realmId');
  const storedState = sessionStorage.getItem('qb_callback_state');
  const storedUrl = sessionStorage.getItem('qb_callback_url');
  
  if (storedCode) {
    processQuickBooksCallback(storedCode, storedRealmId, storedState, storedUrl);
  } else {
    console.log("code was not stored!!!!")
  }

  // Refresh QuickBooks connection status every 30 seconds
  const qbStatusInterval = setInterval(checkIfQbConnected, 30000);

  // Clean up interval on component unmount
  onUnmounted(() => {
    clearInterval(qbStatusInterval);
  });

  if (route.query.archived === "true") {
    activeTab.value = "tab2";

    sortColumnIndex.value = 2;
    sortColumnOrder.value = "desc";
    if (route.query.orderColName) {
      archivedSortColumnIndex.value = columns.findIndex(
        (col) => col.key === route.query.orderColName
      );
    } else {
      archivedSortColumnIndex.value = 2;
      archivedSortColumnOrder.value = "desc";
    }

    if (route.query.order) {
      archivedSortColumnOrder.value = route.query.order.toString();
    }
  } else {
    archivedSortColumnIndex.value = 2;
    archivedSortColumnOrder.value = "desc";
    if (route.query.orderColName) {
      sortColumnIndex.value = columns.findIndex(
        (col) => col.key === route.query.orderColName
      );
    } else {
      sortColumnIndex.value = 2;
      sortColumnOrder.value = "desc";
    }

    if (route.query.order) {
      sortColumnOrder.value = route.query.order.toString();
    }
  }

  if (route.query.search) {
    searchQuery.value = route.query.search.toString();
  }

  router.push({
    query: {
      search: searchQuery.value,
      orderColName: columns[sortColumnIndex.value].key.toString(),
      order: sortColumnOrder.value,
    },
  });
  getAllExpenses();
  getAllArchivedExpenses();
});

async function getqbAccounts() {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlQbAccounts, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    // Map all properties from the QuickBooks account object, not just id, name, type
    qbBankAccounts.value = data.map((el: any) => ({
      id: Number(el.Id),
      name: el.FullyQualifiedName,
      type: el.AccountType,
      SubAccounts: el.SubAccounts,
      Child: el.Child,
      hasChildren: el.hasChildren,
      IsParent: el.IsParent,
      // Add any other relevant properties here
    }));
  } catch (err) {
    console.log(err.message);
  }
}
async function getQbVendors() {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlQbVendors, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    qbVendors.value = data.map((el: any) => ({
      id: Number(el.Id),
      name: el.DisplayName,
    }));
  } catch (err) {
    console.log(err.message);
  }
}

async function handleQbSync(expenseEntries: { accountId: string; amount: string }[]) {
  syncStatus.value = 'syncing';
  try {
    // Only sync if we're editing an existing expense
    if (!editedExpenseId.value) {
      throw new Error('Cannot sync: No expense ID available');
    }

    // Prepare payload for QB sync
    const payload = createExpensePayload({
      date: new Date(date.value).toISOString().split('T')[0],
      vendorId: selectedVendorId.value,
      accountId: selectedBankAccountId.value,
      expenseAccountIds: expenseEntries.map(e => e.accountId),
      amounts: expenseEntries.map(e => parseFloat(e.amount) || 0),
      privateNote: `${title.value}${description.value ? `, ${description.value}` : ''}`,
      paymentType: 'Cash',
    });

    // Add the local expense ID to the payload
    const payloadWithLocalId = {
      ...payload,
      localExpenseId: editedExpenseId.value
    };

    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });
    const response = await postQbExpense(payloadWithLocalId, token);
    syncStatus.value = 'success';
    displayError('Expense synced to QuickBooks successfully!');
    
    // Update the local expense with QuickBooks information
    if (response && response.Purchase && response.Purchase.Id) {
      const expenseIndex = expenses.value.findIndex(exp => exp.id === editedExpenseId.value);
      if (expenseIndex !== -1) {
        expenses.value[expenseIndex] = {
          ...expenses.value[expenseIndex],
          qbExpenseId: response.Purchase.Id,
          qbQbId: response.Purchase.Id,
          qbEntityType: 'Expense'
        };
      }
      
      // Also update archived expenses if the synced expense is archived
      const archivedExpenseIndex = archivedExpenses.value.findIndex(exp => exp.id === editedExpenseId.value);
      if (archivedExpenseIndex !== -1) {
        archivedExpenses.value[archivedExpenseIndex] = {
          ...archivedExpenses.value[archivedExpenseIndex],
          qbExpenseId: response.Purchase.Id,
          qbQbId: response.Purchase.Id,
          qbEntityType: 'Expense'
        };
      }
    }
    
    // Auto-clear success message after 3 seconds and close the dialog
    setTimeout(() => { 
      syncStatus.value = 'idle'; 
      closeAddExpenseDialog(); // Close the dialog after successful sync
    }, 3000);
  } catch (err) {
    syncStatus.value = 'error';
    // Auto-clear error message after 5 seconds
    setTimeout(() => { syncStatus.value = 'idle'; }, 5000);
    console.error('QuickBooks sync error:', err);
    displayError('Failed to sync with QuickBooks');
  } finally {
    // Ensure sync status is reset if something unexpected happens
    if (syncStatus.value === 'syncing') {
      setTimeout(() => { syncStatus.value = 'idle'; }, 10000);
    }
  }
}

async function checkIfQbConnected() {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlQbConnected, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    qbConnected.value = data.connected;
  } catch (err) {
    console.log(err.message);
    qbConnected.value = false;
  }
}

async function processQuickBooksCallback(code: string, realmId: string | null, state: string | null, callbackUrl: string | null) {
  try {
    // Clear stored parameters
    sessionStorage.removeItem('qb_callback_code');
    sessionStorage.removeItem('qb_callback_realmId');
    sessionStorage.removeItem('qb_callback_state');
    sessionStorage.removeItem('qb_callback_url');
    
    // Construct the callback URL with all parameters
    const fullCallbackUrl = callbackUrl || `${window.location.origin}/quickbooks-callback?code=${code}&realmId=${realmId}&state=${state}`;
    
    // Call the backend to complete the OAuth flow
    const apiUrl = `${import.meta.env.VITE_APP_API_ADDR}/callback?callbackUrl=${encodeURIComponent(fullCallbackUrl)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete QuickBooks authentication');
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Refresh the connection status
      await checkIfQbConnected();
      // Show success message
      displayError('QuickBooks connected successfully!');
    } else {
      throw new Error(data.error || 'Authentication failed');
    }
  } catch (error: any) {
    console.error('QuickBooks callback error:', error);
    displayError(error.message || 'An unexpected error occurred during QuickBooks authentication');
  }
}

async function qbLogin() {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const qbUrl = import.meta.env.VITE_APP_API_ADDR + "/api/auth/redirect";
    const response = await fetch(qbUrl, {
      ...requestOptions,
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    
    // Redirect the browser to QuickBooks OAuth
    console.log("Redirecting to QuickBooks login...");
    window.location.href = data.authUrl;
  } catch (err: any) {
    console.error(`Failed to redirect to QuickBooks login:`, err.message);
    displayError(err.message);
  }
}

async function getQbExpenseDetails(expenseId: number) {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });
    const expense = expenses.value.find(exp => exp.id === expenseId);
    if (!expense || !expense.qbQbId || !expense.qbEntityType) {
      qbExpenseDetails.value = null;
      return;
    }
    let url;
    const realmId = null; // not needed for frontend
    if (expense.qbEntityType === 'Expense') {
      url = `${baseUrlQbDetails}/${expenseId}/details`;
    } else if (expense.qbEntityType === 'Transfer') {
      url = `${import.meta.env.VITE_APP_API_ADDR}/qb-transfer/${expenseId}/details`;
    } else {
      qbExpenseDetails.value = null;
      return;
    }
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) {
      if (response.status === 404) {
        qbExpenseDetails.value = null;
        return;
      }
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }
    const data = await response.json();
    qbExpenseDetails.value = data.Purchase || data.Transfer;
  } catch (err) {
    console.error("Failed to fetch QuickBooks expense details:", err);
    qbExpenseDetails.value = null;
  }
}

async function handleTransferSubmit(from: string, to: string, amount: string, localExpenseId: number | null, description: string) {
  try {
    syncStatus.value = 'syncing';
    const token = await auth0.getAccessTokenSilently();
    const response = await fetch(baseUrlQbTransfer, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        fromAccountId: from,
        toAccountId: to,
        amount: parseFloat(amount),
        date: new Date(date.value).toISOString().split('T')[0],
        localExpenseId: localExpenseId,
        description: `${title.value}${description ? `, ${description}` : ''}`,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle 409 Conflict - expense already synced
      if (response.status === 409) {
        const entityType = errorData.details?.qbEntityType || 'QuickBooks';
        throw new Error(`This expense is already synced to ${entityType} (ID: ${errorData.details?.qbQbId || errorData.details?.qbExpenseId})`);
      }
      
      throw new Error(errorData.error || 'Failed to create transfer');
    }
    
    const data = await response.json();
    syncStatus.value = 'success';
    displayError('Transfer created successfully!');
    
    // Update the local expense with QuickBooks information
    if (data && data.Transfer && data.Transfer.Id && localExpenseId) {
      const expenseIndex = expenses.value.findIndex(exp => exp.id === localExpenseId);
      if (expenseIndex !== -1) {
        expenses.value[expenseIndex] = {
          ...expenses.value[expenseIndex],
          qbQbId: data.Transfer.Id,
          qbEntityType: 'Transfer'
        };
      }
      
      // Also update archived expenses if the synced expense is archived
      const archivedExpenseIndex = archivedExpenses.value.findIndex(exp => exp.id === localExpenseId);
      if (archivedExpenseIndex !== -1) {
        archivedExpenses.value[archivedExpenseIndex] = {
          ...archivedExpenses.value[archivedExpenseIndex],
          qbQbId: data.Transfer.Id,
          qbEntityType: 'Transfer'
        };
      }
    }
    
    // Auto-clear success message after 3 seconds and close the dialog
    setTimeout(() => { 
      syncStatus.value = 'idle'; 
      closeAddExpenseDialog(); // Close the dialog after successful sync
    }, 3000);
  } catch (err: any) {
    syncStatus.value = 'error';
    console.error('QuickBooks transfer error:', err);
    displayError(err.message || 'Failed to create transfer');
  } finally {
    // Ensure sync status is reset if something unexpected happens
    if (syncStatus.value === 'syncing') {
      setTimeout(() => { syncStatus.value = 'idle'; }, 10000);
    }
  }
}
</script>
