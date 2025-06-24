<script setup lang="ts">
import { Options, Vue } from 'vue-class-component';
import HelloWorld from './components/HelloWorld.vue';


import {ref, onMounted} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue';

const router = useRouter()
const auth0 = useAuth0();

onMounted(() => {
  // Check if we're on a QuickBooks callback URL and store parameters
  if (window.location.pathname.includes('/quickbooks-callback') && window.location.search.includes('code=')) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const realmId = urlParams.get('realmId');
    const state = urlParams.get('state');
    
    // Store the parameters in sessionStorage
    sessionStorage.setItem('qb_callback_code', code || '');
    sessionStorage.setItem('qb_callback_realmId', realmId || '');
    sessionStorage.setItem('qb_callback_state', state || '');
    sessionStorage.setItem('qb_callback_url', window.location.href);
  }
});

router.beforeEach(function (to, from) {
  const auth = auth0.isAuthenticated
  if (to.path == '/' && auth.value) {
    return { name: 'Expenses' }
  }
})


</script>

<template>
  <div id="app">
  <router-view></router-view>
  </div>
</template>


