<script setup lang="ts">
const {
  tableOptions,
  selectedTable,
  tableRows,
  tableColumns,
  tableLoading,
  tableError,
  showAddRow,
  addLoading,
  loadTable,
  deleteRow,
  addRow,
} = useTramTable()
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <TramToolbar
      v-model="selectedTable"
      :options="tableOptions"
      :loading="tableLoading"
      @refresh="loadTable"
      @add="showAddRow = !showAddRow"
    />

    <div class="flex-1 flex overflow-hidden">
      <TramDataPanel
        v-model:show-add-row="showAddRow"
        :selected-table="selectedTable"
        :columns="tableColumns"
        :rows="tableRows"
        :loading="tableLoading"
        :error="tableError"
        :add-loading="addLoading"
        @delete="deleteRow"
        @save="addRow"
      />

      <TramSearchPanel
        :selected-table="selectedTable"
        :table-columns="tableColumns"
      />
    </div>
  </div>
</template>
