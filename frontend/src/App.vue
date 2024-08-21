
<script setup lang="ts">
import { Options, Vue } from 'vue-class-component';
import HelloWorld from './components/HelloWorld.vue';


import {ref} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue';

const router = useRouter()
const auth0 = useAuth0();

const authenticated = ref(auth0.isAuthenticated)

router.beforeEach(function (to, from) {
  console.log('beforeEach', to.path + ' - Auth: ' + authenticated.value)
  if (to.path !== '/' && !authenticated.value) {
    return { name: 'Login' }
  } else if (to.path === '/' && authenticated.value) {
    return { name: 'Expenses' }
  }
})


</script>

<template>
  <div id="app">
  <router-view></router-view>
  </div>
</template>


