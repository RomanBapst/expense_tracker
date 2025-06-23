<template>
  <NavigationBar />
  <div class="p-5">
  <div class="p-4">
    <fwb-button @click="addNewUser()"> Add new User </fwb-button>
    <span v-if="!qbConnected">
    <fwb-button @click="qbLogin()"> QB Login </fwb-button>
    </span>
    <fwb-button @click="getqbAccounts()"> Get Accounts </fwb-button>
  </div>

    <SimpleTable tableName="Accounts" class="p-4" :header="['ID', 'Name', 'email']" :items="prepareUsers">
      <template #button1="{ item }">
        .<fwb-button @click="editClicked(item.id)" class="bg-blue-700"> Edit </fwb-button>
      </template>
      <template #button2="{ item }">
        .<fwb-button @click="deleteClicked(item.id)" class="bg-blue-700">
          Delete
        </fwb-button>
      </template>
    </SimpleTable>
    <div v-if="!addingAccount && !editingAccount" class="p-4">
      <fwb-button @click="showAddAccountForm()">Add New Account</fwb-button>
    </div>
    <SimpleTable tableName="Users" :header="['ID', 'Name']" :items="prepareAccounts">
      <template #button1="{ item }">
        .<fwb-button @click="editAccountClicked(item.id)" class="bg-blue-700">
          Edit
        </fwb-button>
      </template>
      <template #button2="{ item }">
        .<fwb-button @click="deleteAccountClicked(item.id)" class="bg-blue-700">
          Delete
        </fwb-button>
      </template>
    </SimpleTable>
    <SimpleTable tableName="Quickbooks Bank Accounts" :header="['ID', 'Name']" :items="prepareQbBankAccounts"> </SimpleTable>
    <SimpleTable tableName="Quickbooks Vendors" class="p-4" :header="['ID', 'Name']" :items="prepareQbVendors"> </SimpleTable>
    <AddAccount
      v-if="addingAccount || editingAccount"
      :users="users"
      v-model:name="accountName"
      v-model:isRefund="isRefund"
      v-model:selectedUserId="selectedUserId"
      @close="closeAddAccountForm()"
      @submitClicked="handleSubmit"
    />
    <AddUser
      v-if="addingUser"
      @close="closeAddAccountForm()"
      @submitClicked="handleSubmitUser"
    ></AddUser>
  </div>
</template>

<script setup lang="ts">
import NavigationBar from "./NavigationBar.vue";
import SimpleTable from "./SimpleTable.vue";
import AddAccount from "./AddAccount.vue";
import AddUser from "./AddUser.vue";
import { User } from "@/users/users";
import { FwbButton } from "flowbite-vue"; // Add this import statement

import { ref, onMounted, computed } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";
import { Account, QBAccount, QBVendor } from "@/expenses/expenses";

const baseUrl = import.meta.env.VITE_APP_API_ADDR + "/users";
const baseUrlAccount = import.meta.env.VITE_APP_API_ADDR + "/account";
const baseUrlUser = import.meta.env.VITE_APP_API_ADDR + "/users";
const qbUrl = import.meta.env.VITE_APP_API_ADDR + "/api/auth/redirect";
const baseUrlCompanyInfo = import.meta.env.VITE_APP_API_ADDR + "/getCompanyInfo";
const baseUrlQbAccounts = import.meta.env.VITE_APP_API_ADDR + "/getAccounts";
const baseUrlQbVendors = import.meta.env.VITE_APP_API_ADDR + "/getVendors";
const baseUrlQbConnected = import.meta.env.VITE_APP_API_ADDR + "/api/qb/status";

const auth0 = useAuth0();

const users = ref<User[]>([]);
const accounts = ref<Account[]>([]);

const addingAccount = ref(false);
const editingAccount = ref(false);
const addingUser = ref(false);

const selectedUserId = ref<string>("");
const accountName = ref("");
const isRefund = ref(false);
const editedAccountID = ref(-1);

const qbAccounts = ref<QBAccount[]>([]);
const qbVendors = ref<QBVendor[]>([]);
const qbBankAccounts = ref<QBAccount[]>([])

const qbConnected = ref(false)

onMounted(() => {
  getUsers();
  getAccounts();
  getCompanyInfo();
  getqbAccounts();
  getqbVendors();
  checkIfQbConnected()
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
    qbAccounts.value = data.map((el : any) => 
    ({
      id: Number(el.Id),
      name: el.Name,
      type: el.AccountType
    }));
        
  } catch (err) {
    console.log(err.message);
  }
}
async function getqbVendors() {
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
    qbVendors.value = data.map((el : any) => 
    ({
      id: Number(el.Id),
      name: el.DisplayName,
    }));
        
  } catch (err) {
    console.log(err.message);

  }
}

const prepareUsers = computed(() => {
  return users.value.map((el) => ({
    id: el.id,
    values: [el.id, el.name, el.email],
  }));
});

const prepareAccounts = computed(() => {
  return accounts.value.map((el) => ({
    id: el.id,
    values: [el.id, el.name],
  }));
});

const prepareQbAccounts = computed(() => {
  return qbAccounts.value
    .filter((el) => {
      return el.type === "Expense";
    })
    .map((el) => ({
      id: el.id,
      values: [el.id, el.name],
    }));
});

const prepareQbBankAccounts = computed(() => {
  return qbAccounts.value
    .filter((el) => {
      return el.type === "Bank";
    })
    .map((el) => ({
      id: el.id,
      values: [el.id, el.name]
    }))
});


const prepareQbVendors = computed(() => {
  return qbVendors.value
    .map((el) => ({
      id: el.id,
      values: [el.id, el.name],
    }));
});

function addNewUser() {
  addingUser.value = true;
}

async function qbLogin() {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await fetch(qbUrl, {
      ...requestOptions,
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const authUri = await response.text(); // or response.json(), depending on your backend

    console.log("Redirecting to QuickBooks login...");
    window.location.href = authUri;
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello");
  }
}

async function deleteClicked(id: number) {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await fetch(baseUrlUser + `/${id}`, {
      ...requestOptions,
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getUsers();
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello");
  }
}

async function deleteAccountClicked(id: number) {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await fetch(baseUrlAccount + `/${id}`, {
      ...requestOptions,
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getAccounts();
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello");
  }
}
function editClicked(id: number) {}

function editAccountClicked(id: number) {
  const account = accounts.value.find((account) => account.id === id);
  accountName.value = account?.name!!;

  selectedUserId.value = String(
    users.value.find((user) => user.id === account?.refundUserId)?.id!!
  );

  editedAccountID.value = account?.id!!;

  isRefund.value = account?.refundUserId != undefined;

  editingAccount.value = true;
}

function showAddAccountForm() {
  addingAccount.value = true;
}

function handleSubmit(obj) {
  if (addingAccount.value) {
    const formData = new FormData();
    formData.append("title", obj.name);
    formData.append("accountType", obj.type);
    formData.append("refundUserId", obj.refundUserId);
    addAccount(formData);
  } else {
    const formData = new FormData();
    formData.append("title", obj.name);
    formData.append("accountType", obj.type);
    formData.append("refundUserId", obj.refundUserId);
    editAccount(formData);
  }

  closeAddAccountForm();
}

function closeAddAccountForm() {
  addingAccount.value = false;
  editingAccount.value = false;
  selectedUserId.value = "";
  accountName.value = "";
  isRefund.value = false;
}

function handleSubmitUser(obj) {
  const formData = new FormData();
  formData.append("name", obj.name);
  formData.append("email", obj.email);
  addingUser.value = false;
  addUser(formData);
}

async function addAccount(formData: FormData) {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(baseUrlAccount, {
      ...requestOptions,
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getAccounts();
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello");
  }
}
async function editAccount(formData: FormData) {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(baseUrlAccount + `/${editedAccountID.value}`, {
      ...requestOptions,
      method: "PUT",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getAccounts();
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello");
  }
}
async function addUser(formData: FormData) {
  try {
    const token = await auth0.getAccessTokenSilently();

    const requestOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    };

    const response = await fetch(baseUrlUser, {
      ...requestOptions,
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    await getUsers();
  } catch (err: any) {
    console.error(`Failed to add user:`, err.message);
  } finally {
    console.log("hello");
  }
}

async function getUsers() {
  try {
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
    users.value = data;
  } catch (err) {
    console.log(err.message);
  }
}
async function getAccounts() {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlAccount, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    accounts.value = data;
  } catch (err) {
    console.log(err.message);
  }
}
async function getCompanyInfo() {
  try {
    const token = await auth0.getAccessTokenSilently().catch(() => {
      auth0.loginWithRedirect();
    });

    const response = await fetch(baseUrlCompanyInfo, {
      headers: { Authorization: "Bearer " + token },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
  } catch (err) {
    console.log(err.message);
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
    qbConnected.value = data.connected
  } catch (err) {
    console.log(err.message);
    qbConnected.value = false
  }
}
</script>
