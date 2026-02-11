import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
} from "../db";
import { checkTaskCompletionTriggers } from "../services/triggerEvaluation";

export const tasksRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const tasks = await getTasks(ctx.user.id);
      if (input?.status) {
        return tasks.filter((t: any) => t.status === input.status);
      }
      return tasks;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        dueDate: z.string(),
        projectId: z.number().optional(),
        assignedTo: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const taskId = await createTask({
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: new Date(input.dueDate),
        projectId: input.projectId,
        createdBy: ctx.user.id,
        status: "pending",
      });

      if (taskId && input.assignedTo && input.assignedTo.length > 0) {
        for (const userId of input.assignedTo) {
          await assignTask({
            taskId: taskId,
            userId: userId,
            assignedAt: new Date(),
          });
        }
      }
      return { id: taskId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum(["pending", "in_progress", "completed", "cancelled"])
          .optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        assignedTo: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, assignedTo, dueDate, ...updates } = input;
      const updateData: any = { ...updates };

      if (dueDate) {
        updateData.dueDate = new Date(dueDate);
      }

      await updateTask(id, updateData);

      if (updates.status === "completed") {
        await checkTaskCompletionTriggers(id);
      }

      if (assignedTo && assignedTo.length > 0) {
        for (const userId of assignedTo) {
          await assignTask({
            taskId: id,
            userId: userId,
            assignedAt: new Date(),
          });
        }
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTask(input.id);
      return { success: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getTaskById(input.id);
    }),
});
