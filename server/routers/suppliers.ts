import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../db";

export const suppliersRouter = router({
  list: protectedProcedure.query(async () => {
    return await getSuppliers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createSupplier({
        name: input.name,
        contactPerson: input.contactPerson,
        email: input.email,
        phone: input.phone,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSupplier(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSupplier(input.id);
      return { success: true };
    }),
});
