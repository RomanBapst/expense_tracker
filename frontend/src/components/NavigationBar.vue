<template>
  <fwb-navbar class="flex justify-between items-center px-4 py-2 bg-gray-100 shadow-md">
    <!-- Toggle Button for Mobile -->
    <button 
      class="block md:hidden text-gray-700" 
      @click="toggleMenu"
      aria-label="Toggle navigation menu"
    >
      ☰
    </button>

    <!-- Navbar Links -->
    <div :class="['flex-col md:flex-row', 'md:flex', isShowMenu ? 'flex' : 'hidden', 'items-center', 'space-y-2', 'md:space-y-0', 'space-x-0', 'md:space-x-4']">
      <fwb-navbar-collapse>
        <fwb-navbar-link link="#" v-if="isAdmin">
          <router-link to="/admin">Admin</router-link>
        </fwb-navbar-link>
        <fwb-navbar-link link="#">
          <router-link to="/expenses">Expenses</router-link>
        </fwb-navbar-link>
      </fwb-navbar-collapse>
    </div>

    <!-- User Info and Logout -->
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
import { isAdmin, getIsAdmin } from "@/utils/authUtils" 

const { user, logout, isAuthenticated } = useAuth0()
const userRef = ref(null)
const isShowMenu = ref(false)

onMounted(() => {
  if (isAuthenticated.value) {
    userRef.value = user.value
  }
  getIsAdmin();
})

// Toggle the mobile menu
const toggleMenu = () => {
  isShowMenu.value = !isShowMenu.value
}

const handleLogout = () => {
  logout({ returnTo: window.location.origin })
}
</script>
