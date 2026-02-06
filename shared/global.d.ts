/**
 * Minimal ambient declarations for third-party modules that are not
 * present with types in the repository (temporary stop-gaps).
 *
 * These are intentionally permissive (`any`) to unblock type-checking.
 * Replace these with proper types or install @types packages where
 * appropriate in the future.
 */

/* dnd-kit */
declare module "@dnd-kit/core" {
  // Minimal types used by the codebase
  export type DragEndEvent = any;
  export const DndContext: any;
  export const closestCenter: any;
  export const KeyboardSensor: any;
  export const PointerSensor: any;
  export function useSensor(...args: any[]): any;
  export function useSensors(...args: any[]): any;
}

declare module "@dnd-kit/sortable" {
  export const arrayMove: any;
  export const SortableContext: any;
  export const sortableKeyboardCoordinates: any;
  export const verticalListSortingStrategy: any;
  export function useSortable(...args: any[]): any;
}

declare module "@dnd-kit/utilities" {
  // 'CSS' is imported from '@dnd-kit/utilities' in the codebase
  export const CSS: any;
  export default CSS;
}

/* react-dropzone */
declare module "react-dropzone" {
  export function useDropzone(options?: any): any;
  const _default: any;
  export default _default;
}

/* react-redux */
declare module "react-redux" {
  export const Provider: any;
  export function useDispatch<T = any>(): T;
  export function useSelector<TState = any, TResult = any>(
    selector: (state: TState) => TResult,
  ): TResult;
  export type TypedUseSelectorHook<TState> = (
    selector: (state: TState) => any,
  ) => any;
  export function useStore(): any;
  const _default: any;
  export default _default;
}

/* @reduxjs/toolkit */
declare module "@reduxjs/toolkit" {
  export function configureStore(...args: any[]): any;
  export function createSlice(...args: any[]): any;
  export type PayloadAction<T = any> = any;
  const _default: any;
  export default _default;
}

/* Prisma (server) */
declare module "@prisma/client" {
  const PrismaClient: any;
  export default PrismaClient;
  export const Prisma: any;
}

/* Local server-side prisma stub (temporary) */
declare module "../_core/prisma" {
  const prisma: any;
  export default prisma;
}
