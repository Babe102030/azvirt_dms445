/**
 * Store index with configureStore
 *
 * Edit description: Add store index with configureStore
 *
 * Exports:
 * - default store
 * - typed RootState and AppDispatch
 * - typed hooks: useAppDispatch and useAppSelector
 *
 * Note: This file assumes @reduxjs/toolkit and react-redux are installed in the project.
 */

import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import importedRowsReducer from "./importedRowsSlice";

export const store = configureStore({
  reducer: {
    importedRows: importedRowsReducer,
  },
  // Keep default middleware but disable strict serializable check if you plan to store non-serializable items
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: process.env.NODE_ENV !== "production",
});

/**
 * RootState and AppDispatch types inferred from the store
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Typed hooks for usage in React components
 *
 * Example:
 * const dispatch = useAppDispatch();
 * const rows = useAppSelector(state => state.importedRows.rows);
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
