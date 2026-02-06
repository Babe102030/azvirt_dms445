/**
 * Redux slice to store rows imported from CSV / Excel files.
 *
 * - Keeps an array of rows (as generic objects).
 * - Stores optional fileName and a timestamp for when the import occurred.
 *
 * Usage:
 *  - dispatch(setRows({ rows, fileName }))
 *  - dispatch(appendRows(moreRows))
 *  - dispatch(clearRows())
 *
 * Add this reducer to your store under the `importedRows` key (or adjust selectors).
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type Row = Record<string, any>;

interface ImportedState {
  rows: Row[];
  fileName?: string;
  importedAt?: string | null;
}

const initialState: ImportedState = {
  rows: [],
  fileName: undefined,
  importedAt: null,
};

const importedRowsSlice = createSlice({
  name: "importedRows",
  initialState,
  reducers: {
    /**
     * Replace the current rows with a new set.
     * Provide optional fileName.
     */
    setRows(
      state: ImportedState,
      action: PayloadAction<{ rows: Row[]; fileName?: string }>,
    ) {
      state.rows = action.payload.rows;
      state.fileName = action.payload.fileName;
      state.importedAt = new Date().toISOString();
    },

    /**
     * Append additional rows to the existing set (useful for chunked parsing).
     */
    appendRows(state: ImportedState, action: PayloadAction<Row[]>) {
      state.rows = state.rows.concat(action.payload);
      state.importedAt = new Date().toISOString();
    },

    /**
     * Clear imported rows and metadata.
     */
    clearRows(state: ImportedState) {
      state.rows = [];
      state.fileName = undefined;
      state.importedAt = null;
    },
  },
});

export const { setRows, appendRows, clearRows } = importedRowsSlice.actions;
export default importedRowsSlice.reducer;

/**
 * Selectors
 * (Adjust the root state type in your app if you have a typed RootState)
 */
export const selectImportedRows = (state: { importedRows: ImportedState }) =>
  state.importedRows.rows;

export const selectImportedFileName = (state: {
  importedRows: ImportedState;
}) => state.importedRows.fileName;

export const selectImportedAt = (state: { importedRows: ImportedState }) =>
  state.importedRows.importedAt;
