<template>
  <fwb-navbar class="flex justify-between items-center px-4 py-2 bg-gray-100 shadow-md">
    <div class="flex items-center space-x-4">
      <fwb-navbar-collapse :is-show-menu="isShowMenu">
        <fwb-navbar-link link="#" v-if="isAdmin">
          <router-link to="/admin">Admin</router-link>
        </fwb-navbar-link>
        <fwb-navbar-link link="#">
          <router-link to="/expenses">Expenses</router-link>
        </fwb-navbar-link>
      </fwb-navbar-collapse>
    </div>
    <div class="flex items-center space-x-8">
      <span v-if="userRef" class="text-gray-700 font-semibold">
        {{ userRef.name || userRef.email }}
      </span>
      <fwb-navbar-link link="#" class="text-blue-500 font-semibold" @click="handleLogout">
        Logout
      </fwb-navbar-link>
    </div>
  </fwb-navbar>
</template>

<script setup>
import { FwbNavbar, FwbNavbarCollapse, FwbNavbarLink } from 'flowbite-vue'
import { ref, onMounted } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import {isAdmin} from "@/utils/authUtils" 

const { user, logout, isAuthenticated } = useAuth0()
const userRef = ref(null)

onMounted(() => {
  if (isAuthenticated.value) {
    userRef.value = user.value
  }
})

const handleLogout = () => {
  logout({ returnTo: window.location.origin })
}
</script>

<style scoped>
.fwb-navbar {
  background-color: #f8fafc;
  padding: 0.75rem 1.5rem;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.items-center {
  align-items: center;
}

.space-x-4 {
  margin-left: 1rem;
  margin-right: 1rem;
}

.space-x-8 {
  margin-left: 2rem;
  margin-right: 2rem;
}

.font-semibold {
  font-weight: 600;
}

.text-gray-700 {
  color: #4a5568;
}

.text-blue-500 {
  color: #3b82f6;
}

.bg-gray-100 {
  background-color: #f8fafc;
}

.shadow-md {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
