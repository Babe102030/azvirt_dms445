/**
 * server/routers/purchaseOrders.ts
 *
 * Minimal stub router for purchase orders to satisfy imports and provide
 * basic endpoints that the client expects. This is intentionally small
 * and returns placeholder data — replace with proper DB-backed
 * implementations when integrating fully.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

export const purchaseOrdersRouter = router({
  /**
   * List purchase orders
   * Returns an array of purchase order objects (stub: empty array).
   */
  list: protectedProcedure.query(async () => {
    // TODO: Replace with real DB query (e.g. db.getPurchaseOrders())
    return [];
  }),

  /**
   * Create a purchase order
   * Accepts the fields used by the client page and returns a success + id.
   */
  create: protectedProcedure
    .input(
      z.object({
        materialId: z.number(),
        materialName: z.string(),
        quantity: z.number(),
        supplier: z.string().optional(),
        supplierEmail: z.string().optional(),
        expectedDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Minimal stub: return a synthetic id and success flag.
      // In a real implementation you'd persist `input` to the DB here.
      const id = Math.floor(Math.random() * 1_000_000_000);
      return { success: true, id };
    }),

  /**
   * Update a purchase order
   * Accepts id and optional update fields.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        actualDelivery: z.date().optional(),
        materialId: z.number().optional(),
        quantity: z.number().optional(),
        supplier: z.string().optional(),
        supplierEmail: z.string().optional(),
        expectedDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Stub: pretend we performed update
      return { success: true };
    }),

  /**
   * Send purchase order to supplier (email)
   */
  sendToSupplier: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      // Stub: pretend we queued an email or otherwise contacted supplier
      return { success: true, message: "Queued email to supplier" };
    }),
});

export default purchaseOrdersRouter;
