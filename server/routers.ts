import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  documents: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getDocuments(input);
      }),

    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        fileData: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        category: z.enum(["contract", "blueprint", "report", "certificate", "invoice", "other"]),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        const fileExtension = input.mimeType.split('/')[1] || 'bin';
        const fileKey = `documents/${ctx.user.id}/${nanoid()}.${fileExtension}`;
        
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        await db.createDocument({
          name: input.name,
          description: input.description,
          fileKey,
          fileUrl: url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          category: input.category,
          projectId: input.projectId,
          uploadedBy: ctx.user.id,
        });
        
        return { success: true, url };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true };
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getProjects();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(["planning", "active", "completed", "on_hold"]).default("planning"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createProject({
          ...input,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(["planning", "active", "completed", "on_hold"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),
  }),

  materials: router({
    list: protectedProcedure.query(async () => {
      return await db.getMaterials();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum(["cement", "aggregate", "admixture", "water", "other"]),
        unit: z.string(),
        quantity: z.number().default(0),
        minStock: z.number().default(0),
        supplier: z.string().optional(),
        unitPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMaterial(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.enum(["cement", "aggregate", "admixture", "water", "other"]).optional(),
        unit: z.string().optional(),
        quantity: z.number().optional(),
        minStock: z.number().optional(),
        supplier: z.string().optional(),
        unitPrice: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMaterial(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMaterial(input.id);
        return { success: true };
      }),
  }),

  deliveries: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getDeliveries(input);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        projectName: z.string(),
        concreteType: z.string(),
        volume: z.number(),
        scheduledTime: z.date(),
        status: z.enum(["scheduled", "in_transit", "delivered", "cancelled"]).default("scheduled"),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createDelivery({
          ...input,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number().optional(),
        projectName: z.string().optional(),
        concreteType: z.string().optional(),
        volume: z.number().optional(),
        scheduledTime: z.date().optional(),
        actualTime: z.date().optional(),
        status: z.enum(["scheduled", "in_transit", "delivered", "cancelled"]).optional(),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDelivery(id, data);
        return { success: true };
      }),
  }),

  qualityTests: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        deliveryId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getQualityTests(input);
      }),

    create: protectedProcedure
      .input(z.object({
        testName: z.string(),
        testType: z.enum(["slump", "strength", "air_content", "temperature", "other"]),
        result: z.string(),
        unit: z.string().optional(),
        status: z.enum(["pass", "fail", "pending"]).default("pending"),
        deliveryId: z.number().optional(),
        projectId: z.number().optional(),
        testedBy: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createQualityTest(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        testName: z.string().optional(),
        testType: z.enum(["slump", "strength", "air_content", "temperature", "other"]).optional(),
        result: z.string().optional(),
        unit: z.string().optional(),
        status: z.enum(["pass", "fail", "pending"]).optional(),
        deliveryId: z.number().optional(),
        projectId: z.number().optional(),
        testedBy: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateQualityTest(id, data);
        return { success: true };
      }),
  }),

  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const [allProjects, allDocuments, allMaterials, allDeliveries, allTests] = await Promise.all([
        db.getProjects(),
        db.getDocuments(),
        db.getMaterials(),
        db.getDeliveries(),
        db.getQualityTests(),
      ]);

      const activeProjects = allProjects.filter(p => p.status === 'active').length;
      const totalDocuments = allDocuments.length;
      const lowStockMaterials = allMaterials.filter(m => m.quantity <= m.minStock).length;
      const todayDeliveries = allDeliveries.filter(d => {
        const today = new Date();
        const schedDate = new Date(d.scheduledTime);
        return schedDate.toDateString() === today.toDateString();
      }).length;
      const pendingTests = allTests.filter(t => t.status === 'pending').length;

      return {
        activeProjects,
        totalDocuments,
        lowStockMaterials,
        todayDeliveries,
        pendingTests,
        totalProjects: allProjects.length,
        totalMaterials: allMaterials.length,
        totalDeliveries: allDeliveries.length,
      };
    }),

    deliveryTrends: protectedProcedure.query(async () => {
      const deliveries = await db.getDeliveries();
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      // Group deliveries by month
      const monthlyData: Record<string, { month: string; deliveries: number; volume: number }> = {};
      
      deliveries.forEach(delivery => {
        const deliveryDate = new Date(delivery.scheduledTime);
        if (deliveryDate >= sixMonthsAgo) {
          const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;
          const monthName = deliveryDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthName, deliveries: 0, volume: 0 };
          }
          
          monthlyData[monthKey].deliveries++;
          monthlyData[monthKey].volume += delivery.volume;
        }
      });
      
      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    }),

    materialConsumption: protectedProcedure.query(async () => {
      const materials = await db.getMaterials();
      
      // Get top 6 materials by quantity for the chart
      const sortedMaterials = materials
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6)
        .map(m => ({
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          minStock: m.minStock,
        }));
      
      return sortedMaterials;
    }),
  }),

  // Workforce Management
  employees: router({
    list: protectedProcedure
      .input(z.object({
        department: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getEmployees(input);
      }),

    create: protectedProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        employeeNumber: z.string(),
        position: z.string(),
        department: z.enum(["construction", "maintenance", "quality", "administration", "logistics"]),
        phoneNumber: z.string().optional(),
        email: z.string().optional(),
        hourlyRate: z.number().optional(),
        status: z.enum(["active", "inactive", "on_leave"]).default("active"),
        hireDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createEmployee(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          position: z.string().optional(),
          department: z.enum(["construction", "maintenance", "quality", "administration", "logistics"]).optional(),
          phoneNumber: z.string().optional(),
          email: z.string().optional(),
          hourlyRate: z.number().optional(),
          status: z.enum(["active", "inactive", "on_leave"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateEmployee(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEmployee(input.id);
        return { success: true };
      }),
  }),

  workHours: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        projectId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getWorkHours(input);
      }),

    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        projectId: z.number().optional(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date().optional(),
        hoursWorked: z.number().optional(),
        overtimeHours: z.number().optional(),
        workType: z.enum(["regular", "overtime", "weekend", "holiday"]).default("regular"),
        notes: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createWorkHour(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          endTime: z.date().optional(),
          hoursWorked: z.number().optional(),
          overtimeHours: z.number().optional(),
          notes: z.string().optional(),
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          approvedBy: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateWorkHour(input.id, input.data);
        return { success: true };
      }),
  }),

  // Concrete Base Management
  concreteBases: router({
    list: protectedProcedure.query(async () => {
      return await db.getConcreteBases();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        location: z.string(),
        capacity: z.number(),
        status: z.enum(["operational", "maintenance", "inactive"]).default("operational"),
        managerName: z.string().optional(),
        phoneNumber: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createConcreteBase(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          location: z.string().optional(),
          capacity: z.number().optional(),
          status: z.enum(["operational", "maintenance", "inactive"]).optional(),
          managerName: z.string().optional(),
          phoneNumber: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateConcreteBase(input.id, input.data);
        return { success: true };
      }),
  }),

  machines: router({
    list: protectedProcedure
      .input(z.object({
        concreteBaseId: z.number().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getMachines(input);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        machineNumber: z.string(),
        type: z.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        concreteBaseId: z.number().optional(),
        status: z.enum(["operational", "maintenance", "repair", "inactive"]).default("operational"),
      }))
      .mutation(async ({ input }) => {
        return await db.createMachine(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          type: z.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]).optional(),
          status: z.enum(["operational", "maintenance", "repair", "inactive"]).optional(),
          totalWorkingHours: z.number().optional(),
          lastMaintenanceDate: z.date().optional(),
          nextMaintenanceDate: z.date().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateMachine(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMachine(input.id);
        return { success: true };
      }),
  }),

  machineMaintenance: router({
    list: protectedProcedure
      .input(z.object({
        machineId: z.number().optional(),
        maintenanceType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getMachineMaintenance(input);
      }),

    create: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        date: z.date(),
        maintenanceType: z.enum(["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]),
        description: z.string().optional(),
        lubricationType: z.string().optional(),
        lubricationAmount: z.number().optional(),
        fuelType: z.string().optional(),
        fuelAmount: z.number().optional(),
        cost: z.number().optional(),
        performedBy: z.string().optional(),
        hoursAtMaintenance: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createMachineMaintenance(input);
      }),
  }),

  machineWorkHours: router({
    list: protectedProcedure
      .input(z.object({
        machineId: z.number().optional(),
        projectId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getMachineWorkHours(input);
      }),

    create: protectedProcedure
      .input(z.object({
        machineId: z.number(),
        projectId: z.number().optional(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date().optional(),
        hoursWorked: z.number().optional(),
        operatorId: z.number().optional(),
        operatorName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createMachineWorkHour(input);
      }),
  }),

  aggregateInputs: router({
    list: protectedProcedure
      .input(z.object({
        concreteBaseId: z.number().optional(),
        materialType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getAggregateInputs(input);
      }),

    create: protectedProcedure
      .input(z.object({
        concreteBaseId: z.number(),
        date: z.date(),
        materialType: z.enum(["cement", "sand", "gravel", "water", "admixture", "other"]),
        materialName: z.string(),
        quantity: z.number(),
        unit: z.string(),
        supplier: z.string().optional(),
        batchNumber: z.string().optional(),
        receivedBy: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createAggregateInput(input);
      }),
  }),
});


export type AppRouter = typeof appRouter;
