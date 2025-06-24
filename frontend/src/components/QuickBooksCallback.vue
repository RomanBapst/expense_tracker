<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-6">
      <div v-if="loading" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Connecting to QuickBooks...</h2>
        <p class="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
      
      <div v-else-if="success" class="text-center">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Successfully Connected!</h2>
        <p class="text-gray-600 mb-4">Your QuickBooks account has been connected successfully.</p>
        <button @click="goToExpenses" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Go to Expenses
        </button>
      </div>
      
      <div v-else class="text-center">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Connection Failed</h2>
        <p class="text-gray-600 mb-4">{{ errorMessage }}</p>
        <button @click="goToExpenses" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Go to Expenses
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth0 } from '@auth0/auth0-vue';

const router = useRouter();
const auth0 = useAuth0();

const loading = ref(true);
const success = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  // Check if we have stored QuickBooks parameters
  const storedCode = sessionStorage.getItem('qb_callback_code');
  const storedRealmId = sessionStorage.getItem('qb_callback_realmId');
  const storedState = sessionStorage.getItem('qb_callback_state');
  const storedUrl = sessionStorage.getItem('qb_callback_url');
  
  // Get the current URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') || storedCode;
  const realmId = urlParams.get('realmId') || storedRealmId;
  const state = urlParams.get('state') || storedState;
  
  if (code) {
    // Clear stored parameters
    sessionStorage.removeItem('qb_callback_code');
    sessionStorage.removeItem('qb_callback_realmId');
    sessionStorage.removeItem('qb_callback_state');
    sessionStorage.removeItem('qb_callback_url');
    
    // Construct the callback URL with all parameters
    const callbackUrl = storedUrl || `${window.location.origin}${window.location.pathname}?${window.location.search}`;
    
    // Call the backend to complete the OAuth flow
    const apiUrl = `${import.meta.env.VITE_APP_API_ADDR}/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete QuickBooks authentication');
      }
      
      const data = await response.json();
      
      if (data.success) {
        success.value = true;
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('QuickBooks callback error:', error);
      errorMessage.value = error.message || 'An unexpected error occurred';
      success.value = false;
    } finally {
      loading.value = false;
    }
  } else {
    errorMessage.value = 'No authorization code received from QuickBooks';
    success.value = false;
    loading.value = false;
  }
});

function goToExpenses() {
  router.push('/expenses');
}
</script> 