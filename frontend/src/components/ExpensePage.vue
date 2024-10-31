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
      :hasExistingReceipt="hasExistingReceipt"
      :isAdding="isAdding"
      :accountTypes="accounts"
      :removeExistingReceipt="removeExistingReceipt"
      :file="file"
      @close="closeAddExpenseDialog"
      @submitClicked="handleAddExpense"
      />
      
      
      <!-- Main Content Area -->
      <div class="expenses-table flex flex-col h-full overflow-y-auto mb-8 px-4">
        <!-- Admin Controls -->
        <div v-if="isAdmin" class="flex justify-between mb-4">
          <fwb-button @click="showAddExpenseForm">Add New Expense</fwb-button>
          <input
          type="text"
          v-model="searchQuery"
          placeholder="Search expenses..."
          class="border rounded p-2"
          />
        </div>
        
        <div class="tabs mb-4 flex border-b border-gray-200">
          <button
          @click="activeTab = 'tab1'"
          :class="{
            'text-blue-600 border-b-2 border-blue-600': activeTab === 'tab1',
            'text-gray-500 hover:text-gray-700': activeTab !== 'tab1'
          }"
          class="px-4 py-2 -mb-px focus:outline-none transition-colors duration-200"
          >
          Open Expenses
        </button>
        <button
        @click="activeTab = 'tab2'"
        :class="{
          'text-blue-600 border-b-2 border-blue-600': activeTab === 'tab2',
          'text-gray-500 hover:text-gray-700': activeTab !== 'tab2'
        }"
        class="px-4 py-2 -mb-px focus:outline-none transition-colors duration-200"
        >
        Archived Expenses
      </button>
    </div>
    
    
    <!-- Expenses Tables -->
    <SimpleTable
    v-show="activeTab === 'tab1' && !isLoading"
    :header="['Account', 'Author', 'Date', 'Title', 'Description', 'Amount', 'Receipt', 'Actions']"
    :items="filteredExpenses"
    :sortFunction="sortByColumn"
    >
    <template #cell-6="{ item }">
      <span v-if="item.receipt" class="cursor-pointer text-blue-500" @click="openReceipt(item.id)">
        📎
      </span>
    </template>
    <template #button1="{ item }">
      <fwb-button @click="archiveExpense(item.id)" class="bg-blue-700">Archive</fwb-button>
    </template>
    <template #button2="{ item }">
      <fwb-button @click="handleEditExpense(item.id)" class="bg-green-700">Edit</fwb-button>
    </template>
  </SimpleTable>
  
  <SimpleTable
  v-show="activeTab === 'tab2' && !isLoading"
  :header="['Account', 'Author', 'Date', 'Title', 'Description', 'Amount', 'Receipt', 'Actions']"
  :items="filteredArchivedExpenses"
  :sortFunction="sortByColumn"
  >
  <template #cell-6="{ item }">
    <span v-if="item.receipt" class="cursor-pointer text-blue-500" @click="openReceipt(item.id)">
      📎
    </span>
  </template>
  <template #button1="{ item }">
    <fwb-button @click="restoreExpense(item.id)" class="bg-blue-700">Restore</fwb-button>
  </template>
</SimpleTable>
</div>
</div>
</div>
</template>


<script setup lang="ts">
import NavigationBar from "./NavigationBar.vue";
import AddExpense from "./AddExpense.vue";
import SimpleTable from "./SimpleTable.vue";
import Spinner from "./SpinnerComponent.vue"; // Import the Spinner component
import { ref, onMounted, computed } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import { Expense, Account } from "@/expenses/expenses";
import { FwbButton } from "flowbite-vue"; // Add this import statement
import { exp, number } from "mathjs";

import {isAdmin, getIsAdmin} from "@/utils/authUtils" 

const gitHash = process.env.VUE_APP_GIT_HASH || ''

const auth0 = useAuth0();
const expenses = ref<Expense[]>([]);

const accounts = ref<Account[]>([])

const isEditing = ref(false);
const isAdding = ref(false);
const editedExpenseId = ref<number | null>(null);

const activeTab = ref("tab1");

const isLoading = ref(false);
const isUploading = ref(false);

const file = ref<File | null>(null);

const title = ref("");
const description = ref("");
const amount = ref<string>("0");
const date = ref(new Date().toISOString().split("T")[0]); // Current date in YYYY-MM-DD format
const hasExistingReceipt = ref(false);
const removeExistingReceipt = ref(false);
const expenseAccount = ref<string>("")

const searchQuery = ref("");

const scrollPosition = ref(0); // Holds the vertical scroll position



enum ColumnType {
  DEFAULT = 1,
  DATE,
  FLOAT,
}

const columns = [
{ key: "account", label: "Account", colType: ColumnType.DEFAULT },
{ key: "author", label: "Author", colType: ColumnType.DEFAULT },
{ key: "date", label: "Date", colType: ColumnType.DATE },
{ key: "title", label: "Title", colType: ColumnType.DEFAULT },
{ key: "description", label: "Description", colType: ColumnType.DEFAULT },
{ key: "amount", label: "Amount", colType: ColumnType.FLOAT },
{
  key: "receipt",
  colType: ColumnType.DEFAULT,
  label: "Receipt",
  render: (receiptPath: string) =>
  receiptPath ? `<a href="${receiptPath}" target="_blank">📎</a>` : "",
},
];

const baseUrl = process.env.VUE_APP_API_ADDR + "/expenses";

function closeAddExpenseDialog() {
  isEditing.value = false;
  isAdding.value = false;
}

const filteredExpenses = computed(() => {
  return prepareExpenses()
  .filter((expense) => {
    return (
    expense.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (expense.comment &&
    expense.comment.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    String(expense.id).includes(searchQuery.value.toLowerCase())
    );
  })
  .map((el) => ({
    id: el.id,
    values: [
    el.account?.name,
    el.author.name,
    convertDate(el.createdAt),
    el.title,
    el.comment,
    Number(el.amount).toLocaleString("en-US"),
    el.receiptPath,
    ],
    receipt: el.receiptPath,
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
    
    // Append file if it exists
    if (file.value) {
      formData.append("receipt", file.value);
    }
    
    editExpense(id, formData);
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

async function openReceipt(receipt: string) {
  try {
    const token = await auth0.getAccessTokenSilently();
    const response = await fetch(`${baseUrl}/${receipt}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch receipt");
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error("Failed to fetch receipt:", err.message);
  }
}

const handleAddExpense = (fileData: File | null, removeOldReceipt: Boolean = false) => {
  file.value = fileData; // Update the file data in the parent component
  const formData = new FormData();
  formData.append("title", title.value);
  formData.append("description", description.value);
  formData.append("amount", parseFloat(amount.value));
  formData.append("date", new Date(date.value).toISOString().split("T")[0]);
  formData.append("expenseAccount",  parseInt(expenseAccount.value))
  
  
  console.log(expenseAccount.value)
  
  // Append file if it exists
  if (file.value) {
    formData.append("receipt", file.value);
  }
  
  if (isEditing.value && editedExpenseId.value) {
    if (removeOldReceipt) {
      formData.append("removeReceipt", "true");
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
}

function prepareExpenses() {
  return expenses.value.filter((el) => {
    return !el.archived;
  });
}

function prepareArchivedExpenses() {
  return expenses.value
  .filter((el) => {
    return el.archived;
  })
}
const filteredArchivedExpenses = computed(() => {
  return prepareArchivedExpenses()
  .filter((expense) => {
    return (
    expense.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (expense.comment &&
    expense.comment.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
    String(expense.id).includes(searchQuery.value.toLowerCase())
    );
  })
  .map((el) => ({
    id: el.id,
    values: [
    el.account?.name,
    el.author.name,
    convertDate(el.createdAt),
    el.title,
    el.comment,
    Number(el.amount).toLocaleString("en-US"),
    el.receiptPath,
    ],
    receipt: el.receiptPath,
  }));
});

async function editExpense(id: number, formData: FormData) {
  try {
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
    
    const updatedExpense = await response.json();

    // Find and update the specific expense in the array
    const index = expenses.value.findIndex(expense => expense.id === id);
    if (index !== -1) {
      // Update only the modified expense
      expenses.value[index] = { ...expenses.value[index], ...updatedExpense };
    }
  } catch (err) {
    console.error(`Failed to edit expense:`, err.message);
  } finally {
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
    expenses.value.push(newExpense);  // Add the new expense directly to the array
  } catch (err: any) {
    console.error(`Failed to add expense:`, err.message);
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
}

async function restoreExpense(id: number) {
  try {
    let expense: Expense | undefined = expenses.value.find((el) => {
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
    
    editExpense(id, formData);
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
    
    const response = await fetch(baseUrl, {
      headers: { Authorization: "Bearer " + token },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }
    
    const data = await response.json();
    expenses.value = data;
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
    
    const baseUrl = process.env.VUE_APP_API_ADDR + "/account";
    
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
  } finally {
    isLoading.value = false;
  }
}

async function handleEditExpense(id: number) {
  if (isAdding.value || isEditing.value) {
    return;
  }

  scrollPosition.value = document.querySelector('.expenses-table').scrollTop;

  console.log("scroll pos is " + scrollPosition.value )

  
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
    expenseAccount.value = String(expense.accountId)
  }
}

onMounted(() => {
  getIsAdmin();
  getAllExpenses();
  getAllAccounts();
});
</script>
