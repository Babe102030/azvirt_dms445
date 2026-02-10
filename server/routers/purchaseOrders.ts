import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
} from "../db";
import { sendEmail, generatePurchaseOrderEmailHTML } from "../_core/email";

export const purchaseOrdersRouter = router({
  /**
   * List purchase orders
   */
  list: protectedProcedure.query(async () => {
    return await getPurchaseOrders();
  }),

  /**
   * Create a purchase order
   */
  create: protectedProcedure
    .input(
      z.object({
        materialId: z.number().optional(),
        materialName: z.string().optional(), // Used for UI but logic relies on ID
        quantity: z.number().optional(),
        supplier: z.string().optional(),
        supplierEmail: z.string().optional(),
        expectedDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
        orderDate: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const id = await createPurchaseOrder({
        materialId: input.materialId,
        quantity: input.quantity,
        supplier: input.supplier,
        supplierEmail: input.supplierEmail,
        expectedDelivery: input.expectedDelivery,
        totalCost: input.totalCost,
        notes: input.notes,
        status: input.status,
        orderDate: input.orderDate,
      });

      if (!id) {
        throw new Error("Failed to create purchase order");
      }
      return { success: true, id };
    }),

  /**
   * Update a purchase order
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        actualDelivery: z.date().optional(),
        expectedDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await updatePurchaseOrder(input.id, {
        status: input.status,
        actualDeliveryDate: input.actualDelivery,
        expectedDeliveryDate: input.expectedDelivery,
        totalCost: input.totalCost,
        notes: input.notes,
      });
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
      // 1. Get PO details
      const orders = await getPurchaseOrders();
      const po = orders.find((o) => o.id === input.orderId);

      if (!po) {
        throw new Error("Purchase order not found");
      }

      if (!po.supplierEmail) {
        throw new Error("Supplier email not found");
      }

      // 2. Generate Email
      const emailResult = await generatePurchaseOrderEmailHTML({
        id: po.id,
        materialName: po.materialName || "Unknown Material",
        quantity: po.quantity || 0,
        unit: "", // Unit info typically joined in query if available, defaulting to empty for now
        supplier: po.supplierName || "Supplier",
        orderDate: po.orderDate
          ? po.orderDate.toLocaleDateString()
          : new Date().toLocaleDateString(),
        expectedDelivery: po.expectedDelivery
          ? po.expectedDelivery.toLocaleDateString()
          : null,
        notes: po.notes,
      });

      // 3. Send Email
      const sent = await sendEmail({
        to: po.supplierEmail,
        subject: emailResult.subject,
        html: emailResult.html,
      });

      if (!sent) {
        throw new Error("Failed to send email to supplier. Check server logs.");
      }

      // 4. Update status to 'sent'
      await updatePurchaseOrder(po.id, { status: "sent" });

      return { success: true, message: "Email sent to supplier" };
    }),

  /**
   * Receive purchase order and update inventory
   */
  receive: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await receivePurchaseOrder(input.id);
      return {
        success: true,
        message: "Purchase order received and inventory updated",
      };
    }),
});

export default purchaseOrdersRouter;
