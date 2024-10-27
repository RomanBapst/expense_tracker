<template>
  <div class="input-form bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto relative">
    <span class="close absolute top-2 right-2 cursor-pointer text-gray-500 hover:text-gray-800" @click="$emit('close')">&times;</span>
    <h2 class="text-2xl font-bold mb-4">Add User</h2>

    <div class="mb-4">
      <fwb-input
        v-model="nameModel"
        label="Title"
        placeholder="Title"
        size="sm"
      />
    </div>
    <div class="mb-4">
      <fwb-input
        v-model="emailModel"
        label="Email"
        placeholder="Email"
        size="sm"
      />
    </div>
    <div class="text-right">
      <fwb-button @click="handleSubmitClicked" color="green">
        Submit
      </fwb-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineModel, defineProps, defineEmits, ref } from "vue";
import { FwbInput, FwbButton } from "flowbite-vue";

const emits = defineEmits(["submitClicked"]);

const props = defineProps({
  users: Array
})

const nameModel = defineModel("name", { default: "" });
const emailModel = defineModel("email", { default: "" });

function handleSubmitClicked() {
    emits('submitClicked', { name: nameModel.value, email: emailModel.value});
}


</script>

