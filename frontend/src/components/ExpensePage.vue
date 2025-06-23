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
        @close="closeAddExpenseDialog"
        @submitClicked="handleAddExpense"
        @qbSyncClicked="handleQbSync"
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
          <template #button3="{ item }">
            <fwb-button @click="handleSyncWithQuickbooks(item.id)" class="bg-yellow-700"
              >QB</fwb-button
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
import { ref, onMounted, computed, watch } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import {
  Expense,
  Account,
  QBAccount,
  QBVendor,
  createExpensePayload,
} from "@/expenses/expenses";
import { FwbButton } from "flowbite-vue"; // Add this import statement
import { exp, number, sortDependencies, string } from "mathjs";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

import { isAdmin, getIsAdmin } from "@/utils/authUtils";

import ErrorPopup from "./ErrorPopup.vue";
import AddQuickbooksExpense from "./AddQuickbooksExpense.vue";

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
const baseUrlQbExpense = import.meta.env.VITE_APP_API_ADDR + "/createExpense";

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
  return qbBankAccounts.value
    .filter((el) => {
      return el.type === "Expense";
    })
    .map((el) => ({
      id: el.id,
      name: el.name,
    }));
});
const prepareQbVendors = computed(() => {
  return qbVendors.value.map((el) => ({
    id: el.id,
    name: el.name,
  }));
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

const handleQbSync = (expenses: Array<any>) => {
  const expenseAccountIds = expenses.map((e) => e.accountId);
  const amounts = expenses.map((e) => e.amount);

  const payload = createExpensePayload({
    date: new Date(date.value).toISOString().split("T")[0],
    vendorId: selectedVendorId.value,
    accountId: selectedBankAccountId.value,
    expenseAccountIds,
    amounts,
    privateNote: description.value,
    paymentType: "Cash", // or 'CreditCard'
  });

  console.log("payload", payload);

  postQbExpense(payload);
};

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

async function handleSyncWithQuickbooks(id: number) {}

async function handleEditExpense(id: number) {
  if (isAdding.value || isEditing.value) {
    return;
  }

  scrollPosition.value = document.querySelector(".expenses-table").scrollTop;

  console.log("scroll pos is " + scrollPosition.value);

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
  }
}

onMounted(() => {
  getIsAdmin();
  getAllAccounts();
  getqbAccounts();
  getQbVendors();

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
    qbBankAccounts.value = data.map((el: any) => ({
      id: Number(el.Id),
      name: el.Name,
      type: el.AccountType,
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
async function postQbExpense(payload: Any) {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlQbExpense, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
</script>
