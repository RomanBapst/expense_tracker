<template>
 <div v-if="isLoading" class="flex flex-col h-screen my-auto items-center bgimg bg-cover" >Loading ...</div>
  <div v-else class="h-screen flex items-center justify-center">
    <fwb-button v-if="!isAuthenticated" @click="login"> Log in</fwb-button>
  </div>
</template>

<script setup>
import { useAuth0 } from '@auth0/auth0-vue';
import {ref, watch, onMounted} from 'vue'
import {useRouter } from 'vue-router'
import { FwbButton } from "flowbite-vue";


const auth0 = useAuth0();

const router = useRouter()

const isAuthenticated = ref(auth0.isAuthenticated)
const isLoading = ref(auth0.isLoading)

watch(isAuthenticated, () => {
  if (isAuthenticated.value) {
    router.push({name: "Expenses"})
  }
})

onMounted(() => {
  if (isAuthenticated.value) {
    router.push({name: "Expenses"})
  }

});

async function login() {
    await auth0.loginWithPopup()
    router.push({name: "Expenses"})
}


</script>