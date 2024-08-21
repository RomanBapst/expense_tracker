import { createApp } from 'vue'
import App from './App.vue'
import HomePage from './components/HomePage.vue'
import EmployeePage from './components/EmployeePage.vue'
import DepartmentPage from './components/DepartmentPage.vue'
import ExpensePage from './components/ExpensePage.vue'
import LoginPage from './components/LoginPage.vue'
import AdminPage from './components/AdminPage.vue'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { createAuth0, authGuard } from '@auth0/auth0-vue';



import './index.css'

// 2. Define some routes
// Each route should map to a component.
// We'll talk about nested routes later.
const routes = [
  { path: '/', name: 'Login', component: LoginPage },
  { path: '/admin', name: 'Admin', component: AdminPage },
  //{ path: '/home', name: 'Home', component: HomePage },
  //{ path: '/employees', name: 'Employees', component: EmployeePage},
  //{ path: '/departments', name: 'Departments', component: DepartmentPage},
  { path: '/expenses', name: 'Expenses', component: ExpensePage},
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHistory(),
  routes, // short for `routes: routes`
})



const app = createApp(App)
app.use(router)


app.use(
  createAuth0({
    domain: process.env.VUE_APP_DOMAIN,
    clientId: process.env.VUE_APP_CLIENT_ID,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: process.env.VUE_APP_AUDIENCE,
      scope: process.env.VUE_APP_SCOPE
    }
  })
);

app.mount('#app')
