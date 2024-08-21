// src/utils/authUtils.js

import {useAuth0} from "@auth0/auth0-vue"; // Adjust the import path as needed
import { ref } from "vue";

const isAdmin = ref(false);

export async function getIsAdmin() {
  try {
    const { getAccessTokenSilently } = useAuth0();
    const token = await getAccessTokenSilently();
    const requestOptions = {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
    };

    const uri = process.env.VUE_APP_API_ADDR + '/isAdmin';

    console.log("fetching from uri " + uri)

    const response = await fetch(uri, requestOptions);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    console.log(data);
    isAdmin.value = data.isAdmin;
  } catch (err) {
    console.error("Failed to fetch admin status:", err.message);
  }
}

export { isAdmin };
