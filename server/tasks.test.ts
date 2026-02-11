import { describe, it, expect, vi, beforeEach } from "vitest";
import { tasksRouter } from "./routers/tasks";
import * as db from "./db";
import * as triggerEval from "./services/triggerEvaluation";

// Mock database functions
vi.mock("./db", () => ({
  createTask: vi.fn(),
  getTasks: vi.fn(),
  getTaskById: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  assignTask: vi.fn(),
}));

// Mock trigger evaluation
vi.mock("./services/triggerEvaluation", () => ({
  checkTaskCompletionTriggers: vi.fn(),
}));

describe("Tasks Router", () => {
  const mockUser = {
    id: 1,
    role: "admin",
    name: "Test User",
    email: "test@example.com",
  };

  const mockCtx = {
    user: mockUser,
  };

  const caller = tasksRouter.createCaller(mockCtx as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all tasks for the user", async () => {
      const mockTasks = [
        { id: 1, title: "Task 1", status: "pending", createdBy: 1 },
        { id: 2, title: "Task 2", status: "completed", createdBy: 1 },
      ];

      (db.getTasks as any).mockResolvedValue(mockTasks);

      const result = await caller.list({});

      expect(db.getTasks).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockTasks);
    });

    it("should filter tasks by status", async () => {
      const mockTasks = [
        { id: 1, title: "Task 1", status: "pending", createdBy: 1 },
        { id: 2, title: "Task 2", status: "completed", createdBy: 1 },
      ];

      (db.getTasks as any).mockResolvedValue(mockTasks);

      const result = await caller.list({ status: "pending" });

      expect(db.getTasks).toHaveBeenCalledWith(mockUser.id);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe("create", () => {
    it("should create a task successfully", async () => {
      const input = {
        title: "New Task",
        description: "Description",
        priority: "high" as const,
        dueDate: new Date().toISOString(),
        projectId: 1,
      };

      (db.createTask as any).mockResolvedValue(10);

      const result = await caller.create(input);

      expect(db.createTask).toHaveBeenCalledWith({
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: expect.any(Date),
        projectId: input.projectId,
        createdBy: mockUser.id,
        status: "pending",
      });
      expect(result).toEqual({ id: 10 });
    });

    it("should assign task to users if provided", async () => {
      const input = {
        title: "Assigned Task",
        priority: "medium" as const,
        dueDate: new Date().toISOString(),
        assignedTo: [2, 3],
      };

      (db.createTask as any).mockResolvedValue(11);
      (db.assignTask as any).mockResolvedValue(true);

      await caller.create(input);

      expect(db.assignTask).toHaveBeenCalledTimes(2);
      expect(db.assignTask).toHaveBeenCalledWith(expect.objectContaining({
        taskId: 11,
        userId: 2,
      }));
      expect(db.assignTask).toHaveBeenCalledWith(expect.objectContaining({
        taskId: 11,
        userId: 3,
      }));
    });
  });

  describe("update", () => {
    it("should update task fields", async () => {
      const input = {
        id: 1,
        title: "Updated Title",
        status: "in_progress" as const,
      };

      (db.updateTask as any).mockResolvedValue(true);

      const result = await caller.update(input);

      expect(db.updateTask).toHaveBeenCalledWith(1, expect.objectContaining({
        title: "Updated Title",
        status: "in_progress",
      }));
      expect(result).toEqual({ success: true });
    });

    it("should trigger completion check when status changes to completed", async () => {
      const input = {
        id: 1,
        status: "completed" as const,
      };

      (db.updateTask as any).mockResolvedValue(true);

      await caller.update(input);

      expect(triggerEval.checkTaskCompletionTriggers).toHaveBeenCalledWith(1);
    });

    it("should not trigger completion check when status is not completed", async () => {
      const input = {
        id: 1,
        status: "in_progress" as const,
      };

      (db.updateTask as any).mockResolvedValue(true);

      await caller.update(input);

      expect(triggerEval.checkTaskCompletionTriggers).not.toHaveBeenCalled();
    });

    it("should handle assigning new users during update", async () => {
      const input = {
        id: 1,
        assignedTo: [4],
      };

      (db.updateTask as any).mockResolvedValue(true);
      (db.assignTask as any).mockResolvedValue(true);

      await caller.update(input);

      expect(db.assignTask).toHaveBeenCalledWith(expect.objectContaining({
        taskId: 1,
        userId: 4,
      }));
    });
  });

  describe("delete", () => {
    it("should delete a task", async () => {
      (db.deleteTask as any).mockResolvedValue(true);

      const result = await caller.delete({ id: 1 });

      expect(db.deleteTask).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe("getById", () => {
    it("should return a task by id", async () => {
      const mockTask = { id: 1, title: "Task 1" };
      (db.getTaskById as any).mockResolvedValue(mockTask);

      const result = await caller.getById({ id: 1 });

      expect(db.getTaskById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTask);
    });
  });
});
