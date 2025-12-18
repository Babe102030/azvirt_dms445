import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";
import { aiAssistantRouter } from "./routers/aiAssistant";
import { bulkImportRouter } from "./routers/bulkImport";
import { notificationsRouter } from "./routers/notifications";
import { notificationTemplatesRouter } from "./routers/notificationTemplates";
import { triggerExecutionRouter } from "./routers/triggerExecution";

export const appRouter = router({
  system: systemRouter,
  ai: aiAssistantRouter,
  bulkImport: bulkImportRouter,
  notifications: notificationsRouter,
  notificationTemplates: notificationTemplatesRouter,
  triggerExecution: triggerExecutionRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    updateSMSSettings: protectedProcedure
      .input(z.object({
        phoneNumber: z.string().min(1),
        smsNotificationsEnabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const success = await db.updateUserSMSSettings(
          ctx.user.id,
          input.phoneNumber,
          input.smsNotificationsEnabled
        );
        return { success };
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
        criticalThreshold: z.number().default(0),
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
        criticalThreshold: z.number().optional(),
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

    checkLowStock: protectedProcedure
      .query(async () => {
        return await db.getLowStockMaterials();
      }),

    recordConsumption: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        quantity: z.number(),
        consumptionDate: z.date(),
        projectId: z.number().optional(),
        deliveryId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.recordConsumption(input);
        return { success: true };
      }),

    getConsumptionHistory: protectedProcedure
      .input(z.object({
        materialId: z.number().optional(),
        days: z.number().default(30),
      }))
      .query(async ({ input }) => {
        return await db.getConsumptionHistory(input.materialId, input.days);
      }),

    generateForecasts: protectedProcedure
      .mutation(async () => {
        const predictions = await db.generateForecastPredictions();
        return { success: true, predictions };
      }),

    getForecasts: protectedProcedure
      .query(async () => {
        return await db.getForecastPredictions();
      }),

    sendLowStockAlert: protectedProcedure
      .mutation(async () => {
        const lowStockMaterials = await db.getLowStockMaterials();
        
        if (lowStockMaterials.length === 0) {
          return { success: true, message: "All materials are adequately stocked" };
        }

        const materialsList = lowStockMaterials
          .map(m => `- ${m.name}: ${m.quantity} ${m.unit} (minimum: ${m.minStock} ${m.unit})`)
          .join("\n");

        const content = `Low Stock Alert\n\nThe following materials have fallen below minimum stock levels:\n\n${materialsList}\n\nPlease reorder these materials to avoid project delays.`;

        const { notifyOwner } = await import("./_core/notification");
        const notified = await notifyOwner({
          title: `⚠️ Low Stock Alert: ${lowStockMaterials.length} Material(s)`,
          content,
        });

        return { 
          success: notified, 
          materialsCount: lowStockMaterials.length,
          message: notified 
            ? `Alert sent for ${lowStockMaterials.length} low-stock material(s)` 
            : "Failed to send notification"
        };
      }),

    checkCriticalStock: protectedProcedure
      .query(async () => {
        return await db.getCriticalStockMaterials();
      }),

    sendCriticalStockSMS: protectedProcedure
      .mutation(async () => {
        const criticalMaterials = await db.getCriticalStockMaterials();
        
        if (criticalMaterials.length === 0) {
          return { success: true, message: "No critical stock alerts needed", smsCount: 0 };
        }

        const adminUsers = await db.getAdminUsersWithSMS();
        
        if (adminUsers.length === 0) {
          return { success: false, message: "No managers with SMS notifications enabled", smsCount: 0 };
        }

        const materialsList = criticalMaterials
          .map((m: any) => `${m.name}: ${m.quantity}/${m.criticalThreshold} ${m.unit}`)
          .join(", ");

        const smsMessage = `CRITICAL STOCK ALERT: ${criticalMaterials.length} material(s) below critical level. ${materialsList}. Immediate reorder required.`;

        const { sendSMS } = await import("./_core/sms");
        const smsResults = await Promise.all(
          adminUsers.map((user: any) => 
            sendSMS({
              phoneNumber: user.phoneNumber!,
              message: smsMessage,
            }).catch((err: any) => {
              console.error(`Failed to send SMS to ${user.phoneNumber}:`, err);
              return { success: false };
            })
          )
        );

        const successCount = smsResults.filter((r: any) => r.success).length;

        return { 
          success: successCount > 0, 
          materialsCount: criticalMaterials.length,
          smsCount: successCount,
          message: `SMS alerts sent to ${successCount} manager(s) for ${criticalMaterials.length} critical material(s)`
        };
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
        status: z.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled"),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
        gpsLocation: z.string().optional(),
        deliveryPhotos: z.string().optional(),
        estimatedArrival: z.number().optional(),
        actualArrivalTime: z.number().optional(),
        actualDeliveryTime: z.number().optional(),
        driverNotes: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
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
        status: z.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).optional(),
        driverName: z.string().optional(),
        vehicleNumber: z.string().optional(),
        notes: z.string().optional(),
        gpsLocation: z.string().optional(),
        deliveryPhotos: z.string().optional(),
        estimatedArrival: z.number().optional(),
        actualArrivalTime: z.number().optional(),
        actualDeliveryTime: z.number().optional(),
        driverNotes: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDelivery(id, data);
        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]),
        gpsLocation: z.string().optional(),
        driverNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, status, gpsLocation, driverNotes } = input;
        const updateData: any = { status };
        
        if (gpsLocation) updateData.gpsLocation = gpsLocation;
        if (driverNotes) updateData.driverNotes = driverNotes;
        
        // Track timestamps
        const now = Math.floor(Date.now() / 1000);
        if (status === 'arrived') updateData.actualArrivalTime = now;
        if (status === 'delivered') updateData.actualDeliveryTime = now;
        
        await db.updateDelivery(id, updateData);
        return { success: true };
      }),

    uploadDeliveryPhoto: protectedProcedure
      .input(z.object({
        deliveryId: z.number(),
        photoData: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const photoBuffer = Buffer.from(input.photoData, 'base64');
        const fileExtension = input.mimeType.split('/')[1] || 'jpg';
        const fileKey = `delivery-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
        
        const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
        
        // Get existing delivery and append photo
        const allDeliveries = await db.getDeliveries();
        const delivery = allDeliveries.find(d => d.id === input.deliveryId);
        if (delivery) {
          const existingPhotos = delivery.deliveryPhotos ? JSON.parse(delivery.deliveryPhotos) : [];
          existingPhotos.push(url);
          await db.updateDelivery(input.deliveryId, { deliveryPhotos: JSON.stringify(existingPhotos) });
        }
        
        return { success: true, url };
      }),

    getActiveDeliveries: protectedProcedure.query(async () => {
      const deliveries = await db.getDeliveries();
      return deliveries.filter(d => 
        ['loaded', 'en_route', 'arrived', 'delivered'].includes(d.status)
      );
    }),

    sendCustomerNotification: protectedProcedure
      .input(z.object({
        deliveryId: z.number(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const allDeliveries = await db.getDeliveries();
        const delivery = allDeliveries.find(d => d.id === input.deliveryId);
        
        if (!delivery || !delivery.customerPhone) {
          return { success: false, message: 'No customer phone number' };
        }

        // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
        // For now, just mark as sent
        await db.updateDelivery(input.deliveryId, { smsNotificationSent: true });
        
        console.log(`[SMS] To: ${delivery.customerPhone}, Message: ${input.message}`);
        return { success: true, message: 'SMS notification sent' };
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
        photoUrls: z.string().optional(), // JSON array
        inspectorSignature: z.string().optional(),
        supervisorSignature: z.string().optional(),
        testLocation: z.string().optional(),
        complianceStandard: z.string().optional(),
        offlineSyncStatus: z.enum(["synced", "pending", "failed"]).default("synced").optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createQualityTest(input);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        photoData: z.string(), // Base64 encoded image
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const photoBuffer = Buffer.from(input.photoData, 'base64');
        const fileExtension = input.mimeType.split('/')[1] || 'jpg';
        const fileKey = `qc-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
        
        const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
        return { success: true, url };
      }),

    syncOfflineTests: protectedProcedure
      .input(z.object({
        tests: z.array(z.object({
          testName: z.string(),
          testType: z.enum(["slump", "strength", "air_content", "temperature", "other"]),
          result: z.string(),
          unit: z.string().optional(),
          status: z.enum(["pass", "fail", "pending"]),
          deliveryId: z.number().optional(),
          projectId: z.number().optional(),
          testedBy: z.string().optional(),
          notes: z.string().optional(),
          photoUrls: z.string().optional(),
          inspectorSignature: z.string().optional(),
          supervisorSignature: z.string().optional(),
          testLocation: z.string().optional(),
          complianceStandard: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        for (const test of input.tests) {
          await db.createQualityTest({ ...test, offlineSyncStatus: 'synced' });
        }
        return { success: true, syncedCount: input.tests.length };
      }),

    getFailedTests: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }).optional())
      .query(async ({ input }) => {
        return await db.getFailedQualityTests(input?.days || 30);
      }),

    getTrends: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }).optional())
      .query(async ({ input }) => {
        return await db.getQualityTestTrends(input?.days || 30);
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
        photoUrls: z.string().optional(),
        inspectorSignature: z.string().optional(),
        supervisorSignature: z.string().optional(),
        testLocation: z.string().optional(),
        complianceStandard: z.string().optional(),
        offlineSyncStatus: z.enum(["synced", "pending", "failed"]).optional(),
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

  timesheets: router({
    list: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getWorkHours(input);
      }),

    clockIn: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        projectId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createWorkHour({
          employeeId: input.employeeId,
          date: new Date(),
          startTime: new Date(),
          projectId: input.projectId,
          notes: input.notes,
          status: "pending",
        });
      }),

    clockOut: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const endTime = new Date();
        await db.updateWorkHour(input.id, { endTime });
        return { success: true };
      }),

    create: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date().optional(),
        hoursWorked: z.number().optional(),
        overtimeHours: z.number().optional(),
        workType: z.enum(["regular", "overtime", "weekend", "holiday"]).optional(),
        projectId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      }))
      .mutation(async ({ input }) => {
        return await db.createWorkHour(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.object({
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          hoursWorked: z.number().optional(),
          overtimeHours: z.number().optional(),
          workType: z.enum(["regular", "overtime", "weekend", "holiday"]).optional(),
          projectId: z.number().optional(),
          notes: z.string().optional(),
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          approvedBy: z.number().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateWorkHour(input.id, input.data);
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateWorkHour(input.id, {
          status: "approved",
          approvedBy: ctx.user.id,
          notes: input.notes,
        });
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateWorkHour(input.id, {
          status: "rejected",
          approvedBy: ctx.user.id,
          notes: input.notes,
        });
        return { success: true };
      }),

    weeklySummary: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        weekStart: z.date(),
      }))
      .query(async ({ input }) => {
        return await db.getWeeklyTimesheetSummary(input.employeeId, input.weekStart);
      }),

    monthlySummary: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        year: z.number(),
        month: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getMonthlyTimesheetSummary(input.employeeId, input.year, input.month);
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

  purchaseOrders: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        materialId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getPurchaseOrders(input);
      }),

    create: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        materialName: z.string(),
        quantity: z.number(),
        supplier: z.string().optional(),
        supplierEmail: z.string().optional(),
        expectedDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createPurchaseOrder({
          ...input,
          status: 'pending',
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'ordered', 'received', 'cancelled']).optional(),
        expectedDelivery: z.date().optional(),
        actualDelivery: z.date().optional(),
        totalCost: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePurchaseOrder(id, data);
        return { success: true };
      }),

    sendToSupplier: protectedProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const orders = await db.getPurchaseOrders();
        const order = orders.find(o => o.id === input.orderId);
        
        if (!order || !order.supplierEmail) {
          return { success: false, message: 'No supplier email found' };
        }

        // Get material to find unit
        const materials = await db.getMaterials();
        const material = materials.find(m => m.id === order.materialId);
        const unit = material?.unit || 'kg';

        const { sendEmail, generatePurchaseOrderEmailHTML } = await import('./_core/email');
        const emailHTML = generatePurchaseOrderEmailHTML({
          id: order.id,
          materialName: order.materialName,
          quantity: order.quantity,
          unit,
          supplier: order.supplier || 'Supplier',
          orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : null,
          notes: order.notes || null,
        });

        const sent = await sendEmail({
          to: order.supplierEmail,
          subject: `Purchase Order #${order.id} - ${order.materialName}`,
          html: emailHTML,
        });

        if (sent) {
          await db.updatePurchaseOrder(input.orderId, { status: 'ordered' });
        }

        return { success: sent };
      }),
  }),

  reports: router({
    dailyProduction: protectedProcedure
      .input(z.object({
        date: z.string(), // YYYY-MM-DD format
      }))
      .query(async ({ input }) => {
        const targetDate = new Date(input.date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get deliveries completed on this date
        const allDeliveries = await db.getDeliveries();
        const completedDeliveries = allDeliveries.filter(d => {
          if (!d.actualDeliveryTime) return false;
          const deliveryDate = new Date(d.actualDeliveryTime);
          return deliveryDate >= targetDate && deliveryDate < nextDay;
        });

        // Calculate total concrete produced
        const totalConcreteProduced = completedDeliveries.reduce((sum, d) => sum + (d.volume || 0), 0);

        // Get material consumption for the day
        const consumptions = await db.getConsumptionHistory(undefined, 1);
        const dayConsumptions = consumptions.filter(c => {
          const cDate = new Date(c.consumptionDate);
          return cDate >= targetDate && cDate < nextDay;
        });

        const materials = await db.getMaterials();
        const materialConsumption = dayConsumptions.map(c => {
          const material = materials.find(m => m.id === c.materialId);
          return {
            name: material?.name || 'Unknown',
            quantity: c.quantity,
            unit: material?.unit || 'units',
          };
        });

        // Get quality tests for the day
        const allTests = await db.getQualityTests();
        const dayTests = allTests.filter(t => {
          const testDate = new Date(t.createdAt);
          return testDate >= targetDate && testDate < nextDay;
        });

        const qualityTests = {
          total: dayTests.length,
          passed: dayTests.filter(t => t.status === 'pass').length,
          failed: dayTests.filter(t => t.status === 'fail').length,
        };

        return {
          date: input.date,
          totalConcreteProduced,
          deliveriesCompleted: completedDeliveries.length,
          materialConsumption,
          qualityTests,
        };
      }),

    sendDailyProductionEmail: protectedProcedure
      .input(z.object({
        date: z.string(),
        recipientEmail: z.string(),
      }))
      .mutation(async ({ input }) => {
        const targetDate = new Date(input.date);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const allDeliveries = await db.getDeliveries();
        const completedDeliveries = allDeliveries.filter(d => {
          if (!d.actualDeliveryTime) return false;
          const deliveryDate = new Date(d.actualDeliveryTime);
          return deliveryDate >= targetDate && deliveryDate < nextDay;
        });

        const totalConcreteProduced = completedDeliveries.reduce((sum, d) => sum + (d.volume || 0), 0);

        const consumptions = await db.getConsumptionHistory(undefined, 1);
        const dayConsumptions = consumptions.filter(c => {
          const cDate = new Date(c.consumptionDate);
          return cDate >= targetDate && cDate < nextDay;
        });

        const materials = await db.getMaterials();
        const materialConsumption = dayConsumptions.map(c => {
          const material = materials.find(m => m.id === c.materialId);
          return {
            name: material?.name || 'Unknown',
            quantity: c.quantity,
            unit: material?.unit || 'units',
          };
        });

        const allTests = await db.getQualityTests();
        const dayTests = allTests.filter(t => {
          const testDate = new Date(t.createdAt);
          return testDate >= targetDate && testDate < nextDay;
        });

        const qualityTests = {
          total: dayTests.length,
          passed: dayTests.filter(t => t.status === 'pass').length,
          failed: dayTests.filter(t => t.status === 'fail').length,
        };

        // Get user's report settings
        const settings = await db.getReportSettings(1); // Default to user ID 1 for now
        
        const { sendEmail, generateDailyProductionReportHTML } = await import('./_core/email');
        const emailHTML = generateDailyProductionReportHTML({
          date: input.date,
          totalConcreteProduced,
          deliveriesCompleted: completedDeliveries.length,
          materialConsumption,
          qualityTests,
        }, settings ? {
          includeProduction: settings.includeProduction,
          includeDeliveries: settings.includeDeliveries,
          includeMaterials: settings.includeMaterials,
          includeQualityControl: settings.includeQualityControl,
        } : undefined);

        const sent = await sendEmail({
          to: input.recipientEmail,
          subject: `Daily Production Report - ${input.date}`,
          html: emailHTML,
        });

        return { success: sent };
      }),
  }),

  branding: router({
    get: protectedProcedure.query(async () => {
      return await db.getEmailBranding();
    }),

    update: protectedProcedure
      .input(z.object({
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        companyName: z.string().optional(),
        footerText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertEmailBranding(input);
        return { success: true };
      }),

    uploadLogo: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64 encoded image
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!allowedTypes.includes(input.mimeType)) {
          throw new Error('Invalid file type. Only PNG, JPG, and SVG are allowed.');
        }

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Check file size (max 2MB)
        if (buffer.length > 2 * 1024 * 1024) {
          throw new Error('File size must be less than 2MB');
        }

        const fileKey = `branding/logo-${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // Update branding with new logo URL
        await db.upsertEmailBranding({ logoUrl: url });

        return { url };
      }),
  }),
});


export type AppRouter = typeof appRouter;
