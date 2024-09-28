<template>
  <NavigationBar />
  <div>
    <SimpleTable :header="['ID', 'Name', 'email', 'Actions']" :items="prepareUsers">
      <template #button1="{ item }">
        .<fwb-button @click="editClicked(item.id)" class="bg-blue-700"> Edit </fwb-button>
      </template>
      <template #button2="{ item }">
        .<fwb-button @click="deleteClicked(item.id)" class="bg-blue-700">
          Delete
        </fwb-button>
      </template>
    </SimpleTable>
    <div v-if="!addingOrEditing" class="flex justify-between mb-4">
      <fwb-button @click="showAddAccountForm()">Add New Account</fwb-button>
    </div>
    <AddAccount v-if="addingOrEditing" :users="users" @close="closeAddAccountForm()" @submitClicked="handleSubmit"></AddAccount>
  </div>
</template>

<script setup lang="ts">
import NavigationBar from "./NavigationBar.vue";
import SimpleTable from "./SimpleTable.vue";
import AddAccount from "./AddAccount.vue"
import { User } from "@/users/users";
import { FwbButton } from "flowbite-vue"; // Add this import statement

import { ref, onMounted, computed } from "vue";
import { useAuth0 } from "@auth0/auth0-vue";

const baseUrl = process.env.VUE_APP_API_ADDR + "/users";
const baseUrlAccount = process.env.VUE_APP_API_ADDR + "/account";

const auth0 = useAuth0();

const users = ref<User[]>([]);

const addingOrEditing = ref(false)

onMounted(() => {
  getUsers();
});

const prepareUsers = computed(() => {
  return users.value.map((el) => ({
    id: el.id,
    values: [el.id, el.name, el.email],
  }));
});

function deleteClicked(id: number) {}

function editClicked(id: number) {}

function showAddAccountForm() {
  addingOrEditing.value = true
}

function closeAddAccountForm() {
  addingOrEditing.value = false
}

function handleSubmit(obj) {
  const formData = new FormData()
  formData.append("title", obj.name)
  formData.append("accountType", obj.type)
  formData.append("refundUserId", obj.refundUserId)
  addingOrEditing.value = false
  addAccount(formData)
}

async function addAccount(formData : FormData) {
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

    await getUsers();
  } catch (err: any) {
    console.error(`Failed to add account:`, err.message);
  } finally {
    console.log("hello")
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
</script>
