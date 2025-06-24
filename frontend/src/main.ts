import { createApp } from 'vue'
import App from './App.vue'
import ExpensePage from './components/ExpensePage.vue'
import LoginPage from './components/LoginPage.vue'
import AdminPage from './components/AdminPage.vue'
import QuickBooksCallback from './components/QuickBooksCallback.vue'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { createAuth0, authGuard } from '@auth0/auth0-vue';



import './index.css'

// 2. Define some routes
// Each route should map to a component.
// We'll talk about nested routes later.
const routes = [
  { path: '/', name: 'Login', component: LoginPage },
  { path: '/admin', name: 'Admin', component: AdminPage, beforeEnter: authGuard },
  //{ path: '/home', name: 'Home', component: HomePage },
  //{ path: '/employees', name: 'Employees', component: EmployeePage},
  //{ path: '/departments', name: 'Departments', component: DepartmentPage},
  { path: '/expenses', name: 'Expenses', component: ExpensePage, beforeEnter: authGuard},
  { path: '/quickbooks-callback', name: 'QuickBooks Callback', component: QuickBooksCallback },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHistory(import.meta.env.VITE_APP_LOCAL_PATH),
  routes, // short for `routes: routes`
})



const app = createApp(App)
app.use(router)


app.use(
  createAuth0({
    domain: import.meta.env.VITE_APP_DOMAIN,
    clientId: import.meta.env.VITE_APP_CLIENT_ID,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    authorizationParams: {
      redirect_uri: import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin + '/expenses',
      audience: import.meta.env.VITE_APP_AUDIENCE,
      scope: import.meta.env.VITE_APP_SCOPE
    }
  })
);

app.mount('#app')
