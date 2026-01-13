var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      databaseUrl: process.env.DATABASE_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/_core/notification.ts
var notification_exports = {};
__export(notification_exports, {
  notifyOwner: () => notifyOwner
});
import { TRPCError } from "@trpc/server";
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString(input.content)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification content is required."
        });
      }
      const title = trimValue(input.title);
      const content = trimValue(input.content);
      if (title.length > TITLE_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
        });
      }
      if (content.length > CONTENT_MAX_LENGTH) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
        });
      }
      return { title, content };
    };
  }
});

// server/_core/email.ts
var email_exports = {};
__export(email_exports, {
  generateDailyProductionReportHTML: () => generateDailyProductionReportHTML,
  generateLowStockEmailHTML: () => generateLowStockEmailHTML,
  generatePurchaseOrderEmailHTML: () => generatePurchaseOrderEmailHTML,
  sendEmail: () => sendEmail
});
async function sendEmail(options) {
  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || "AzVirt DMS";
    if (!apiKey || !fromEmail) {
      console.warn("[EMAIL] SendGrid not configured. Email not sent.");
      console.log(`[EMAIL] To: ${options.to}`);
      console.log(`[EMAIL] Subject: ${options.subject}`);
      return false;
    }
    sgMail.setApiKey(apiKey);
    const msg = {
      to: options.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: options.subject,
      html: options.html
    };
    await sgMail.send(msg);
    console.log(`[EMAIL] Successfully sent to: ${options.to}`);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    if (error.response) {
      console.error("[EMAIL] SendGrid error:", error.response.body);
    }
    return false;
  }
}
function generateLowStockEmailHTML(materials2) {
  const materialRows = materials2.map((m) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${m.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="color: #dc2626; font-weight: bold;">${m.quantity} ${m.unit}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${m.reorderLevel} ${m.unit}</td>
    </tr>
  `).join("");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Low Stock Alert - AzVirt DMS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">\u26A0\uFE0F Low Stock Alert</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Upozorenje o niskim zalihama</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      The following materials are running low and need to be reordered:<br>
      <em>Sljede\u0107i materijali su pri kraju i potrebno ih je naru\u010Diti:</em>
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Material / Materijal</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Current Stock / Trenutna zaliha</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Reorder Level / Nivo ponovne narud\u017Ebe</th>
        </tr>
      </thead>
      <tbody>
        ${materialRows}
      </tbody>
    </table>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #991b1b;">Action Required / Potrebna akcija:</p>
      <p style="margin: 10px 0 0 0; color: #7f1d1d;">
        Please create purchase orders for these materials to avoid production delays.<br>
        <em>Molimo kreirajte narud\u017Ebenice za ove materijale kako biste izbjegli ka\u0161njenja u proizvodnji.</em>
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This automated alert is generated by AzVirt DMS.<br>
      Ovo automatsko upozorenje je generirano od strane AzVirt DMS sistema.
    </p>
  </div>
</body>
</html>
  `;
}
function generatePurchaseOrderEmailHTML(po) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order #${po.id} - AzVirt DMS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F4E6} Purchase Order</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">PO #${po.id}</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Dear ${po.supplier},<br>
      <em>Po\u0161tovani ${po.supplier},</em>
    </p>
    
    <p>
      We would like to place the following order:<br>
      <em>\u017Delimo da naru\u010Dimo sljede\u0107e:</em>
    </p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Material / Materijal:</td>
          <td style="padding: 8px 0; text-align: right;">${po.materialName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Quantity / Koli\u010Dina:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 20px; color: #2563eb;">${po.quantity} ${po.unit}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Order Date / Datum narud\u017Ebe:</td>
          <td style="padding: 8px 0; text-align: right;">${po.orderDate}</td>
        </tr>
        ${po.expectedDelivery ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Expected Delivery / O\u010Dekivana isporuka:</td>
          <td style="padding: 8px 0; text-align: right;">${po.expectedDelivery}</td>
        </tr>
        ` : ""}
      </table>
    </div>
    
    ${po.notes ? `
    <div style="margin: 20px 0;">
      <p style="font-weight: bold; margin-bottom: 10px;">Additional Notes / Dodatne napomene:</p>
      <p style="background: #fef3c7; padding: 15px; border-radius: 4px; margin: 0;">${po.notes}</p>
    </div>
    ` : ""}
    
    <p style="margin-top: 30px;">
      Please confirm receipt of this order and provide delivery timeline.<br>
      <em>Molimo potvrdite prijem ove narud\u017Ebe i dostavite rok isporuke.</em>
    </p>
    
    <p style="margin-top: 20px;">
      Best regards,<br>
      <strong>AzVirt Team</strong>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This purchase order is generated by AzVirt DMS.<br>
      Ova narud\u017Ebenica je generirana od strane AzVirt DMS sistema.
    </p>
  </div>
</body>
</html>
  `;
}
function generateDailyProductionReportHTML(report, settings) {
  const include = {
    production: settings?.includeProduction ?? true,
    deliveries: settings?.includeDeliveries ?? true,
    materials: settings?.includeMaterials ?? true,
    qualityControl: settings?.includeQualityControl ?? true
  };
  const materialRows = report.materialConsumption.map((m) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${m.quantity} ${m.unit}</td>
    </tr>
  `).join("");
  const passRate = report.qualityTests.total > 0 ? (report.qualityTests.passed / report.qualityTests.total * 100).toFixed(1) : "0";
  let metricsHTML = "";
  if (include.production) {
    metricsHTML += `
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #f97316;">${report.totalConcreteProduced}</div>
        <div style="font-size: 14px; color: #78350f; margin-top: 5px;">m\xB3 Concrete<br>Betona</div>
      </div>`;
  }
  if (include.deliveries) {
    metricsHTML += `
      <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${report.deliveriesCompleted}</div>
        <div style="font-size: 14px; color: #1e3a8a; margin-top: 5px;">Deliveries<br>Isporuka</div>
      </div>`;
  }
  if (include.qualityControl) {
    metricsHTML += `
      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${passRate}%</div>
        <div style="font-size: 14px; color: #14532d; margin-top: 5px;">QC Pass Rate<br>Prolaznost</div>
      </div>`;
  }
  const materialsHTML = include.materials ? `
    <h2 style="color: #111827; font-size: 20px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
      Material Consumption / Potro\u0161nja materijala
    </h2>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Material</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${materialRows}
      </tbody>
    </table>
  ` : "";
  const qcHTML = include.qualityControl ? `
    <h2 style="color: #111827; font-size: 20px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
      Quality Control / Kontrola kvaliteta
    </h2>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Total Tests / Ukupno testova:</span>
        <strong>${report.qualityTests.total}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="color: #16a34a;">\u2713 Passed / Pro\u0161lo:</span>
        <strong style="color: #16a34a;">${report.qualityTests.passed}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #dc2626;">\u2717 Failed / Palo:</span>
        <strong style="color: #dc2626;">${report.qualityTests.failed}</strong>
      </div>
    </div>
  ` : "";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Production Report - AzVirt DMS</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">\u{1F4CA} Daily Production Report</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">${report.date}</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    
    <!-- Key Metrics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px;">
      ${metricsHTML}
    </div>
    
    ${materialsHTML}
    ${qcHTML}
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This automated report is generated daily by AzVirt DMS.<br>
      Ovaj automatski izvje\u0161taj se generi\u0161e dnevno od strane AzVirt DMS sistema.
    </p>
  </div>
</body>
</html>
  `;
}
var init_email = __esm({
  "server/_core/email.ts"() {
    "use strict";
  }
});

// server/_core/sms.ts
var sms_exports = {};
__export(sms_exports, {
  sendSMS: () => sendSMS
});
import { TRPCError as TRPCError6 } from "@trpc/server";
async function sendSMS(payload) {
  const { phoneNumber, message } = validatePayload2(payload);
  if (!ENV.forgeApiKey) {
    throw new TRPCError6({
      code: "INTERNAL_SERVER_ERROR",
      message: "SMS service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl2(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ phoneNumber, message })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[SMS] Failed to send SMS to ${phoneNumber} (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.warn(`[SMS] Error calling SMS service for ${phoneNumber}:`, error);
    return { success: false };
  }
}
var PHONE_MAX_LENGTH, MESSAGE_MAX_LENGTH, trimValue2, isNonEmptyString2, buildEndpointUrl2, validatePayload2;
var init_sms = __esm({
  "server/_core/sms.ts"() {
    "use strict";
    init_env();
    PHONE_MAX_LENGTH = 20;
    MESSAGE_MAX_LENGTH = 160;
    trimValue2 = (value) => value.trim();
    isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl2 = (baseUrl) => {
      if (!baseUrl) {
        throw new TRPCError6({
          code: "INTERNAL_SERVER_ERROR",
          message: "SMS service URL is not configured."
        });
      }
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendSMS",
        normalizedBase
      ).toString();
    };
    validatePayload2 = (input) => {
      if (!isNonEmptyString2(input.phoneNumber)) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: "Phone number is required."
        });
      }
      if (!isNonEmptyString2(input.message)) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: "SMS message is required."
        });
      }
      const phoneNumber = trimValue2(input.phoneNumber);
      const message = trimValue2(input.message);
      if (phoneNumber.length > PHONE_MAX_LENGTH) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: `Phone number must be at most ${PHONE_MAX_LENGTH} characters.`
        });
      }
      if (message.length > MESSAGE_MAX_LENGTH) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: `SMS message must be at most ${MESSAGE_MAX_LENGTH} characters. Current length: ${message.length}`
        });
      }
      return { phoneNumber, message };
    };
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/clerk.ts
import { requireAuth, clerkClient } from "@clerk/express";

// server/db/neo4j.ts
import neo4j from "neo4j-driver";
import dotenv from "dotenv";
dotenv.config();
var uri = process.env.NEO4J_URI || "neo4j+s://placeholder.databases.neo4j.io";
var user = process.env.NEO4J_USER || "neo4j";
var password = process.env.NEO4J_PASSWORD || "";
var driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
var getSession = () => {
  return driver.session();
};
var toNativeTypes = (v) => {
  if (v === null || v === void 0) return v;
  if (neo4j.isInt(v)) {
    return v.toNumber();
  }
  if (neo4j.isDate(v) || neo4j.isDateTime(v) || neo4j.isLocalDateTime(v) || neo4j.isTime(v) || neo4j.isLocalTime(v) || neo4j.isDuration(v)) {
    return v.toString();
  }
  if (Array.isArray(v)) {
    return v.map(toNativeTypes);
  }
  if (typeof v === "object") {
    if (v.properties) {
      const obj2 = {};
      for (const key in v.properties) {
        obj2[key] = toNativeTypes(v.properties[key]);
      }
      return obj2;
    }
    const obj = {};
    for (const key in v) {
      obj[key] = toNativeTypes(v[key]);
    }
    return obj;
  }
  return v;
};
var recordToNative = (record, key = "n") => {
  if (!record || !record.has(key)) return null;
  const item = record.get(key);
  return toNativeTypes(item);
};

// server/db.ts
init_env();
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aggregateInputs: () => aggregateInputs,
  aiConversations: () => aiConversations,
  aiMessages: () => aiMessages,
  aiModels: () => aiModels,
  batchIngredients: () => batchIngredients,
  breakRecords: () => breakRecords,
  breakRules: () => breakRules,
  complianceAuditTrail: () => complianceAuditTrail,
  concreteBases: () => concreteBases,
  concreteRecipes: () => concreteRecipes,
  dailyTasks: () => dailyTasks,
  deliveries: () => deliveries,
  documents: () => documents,
  emailBranding: () => emailBranding,
  emailTemplates: () => emailTemplates,
  employeeAvailability: () => employeeAvailability,
  employees: () => employees,
  forecastPredictions: () => forecastPredictions,
  geofenceViolations: () => geofenceViolations,
  geofences: () => geofences,
  jobSites: () => jobSites,
  locationLogs: () => locationLogs,
  machineMaintenance: () => machineMaintenance,
  machineWorkHours: () => machineWorkHours,
  machines: () => machines,
  materialConsumptionLog: () => materialConsumptionLog,
  materials: () => materials,
  mixingLogs: () => mixingLogs,
  notificationHistory: () => notificationHistory,
  notificationPreferences: () => notificationPreferences,
  notificationTemplates: () => notificationTemplates,
  notificationTriggers: () => notificationTriggers,
  projects: () => projects,
  purchaseOrders: () => purchaseOrders,
  qualityTests: () => qualityTests,
  recipeIngredients: () => recipeIngredients,
  reportRecipients: () => reportRecipients,
  reportSettings: () => reportSettings,
  shiftTemplates: () => shiftTemplates,
  shifts: () => shifts,
  taskAssignments: () => taskAssignments,
  taskNotifications: () => taskNotifications,
  taskStatusHistory: () => taskStatusHistory,
  timesheetApprovals: () => timesheetApprovals,
  timesheetOfflineCache: () => timesheetOfflineCache,
  triggerExecutionLog: () => triggerExecutionLog,
  users: () => users,
  workHours: () => workHours
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  smsNotificationsEnabled: boolean("smsNotificationsEnabled").default(false).notNull(),
  languagePreference: varchar("languagePreference", { length: 10 }).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  status: mysqlEnum("status", ["planning", "active", "completed", "on_hold"]).default("planning").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1e3 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  category: mysqlEnum("category", ["contract", "blueprint", "report", "certificate", "invoice", "other"]).default("other").notNull(),
  projectId: int("projectId"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["cement", "aggregate", "admixture", "water", "other"]).default("other").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  minStock: int("minStock").notNull().default(0),
  criticalThreshold: int("criticalThreshold").notNull().default(0),
  supplier: varchar("supplier", { length: 255 }),
  unitPrice: int("unitPrice"),
  lowStockEmailSent: boolean("lowStockEmailSent").default(false),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  supplierEmail: varchar("supplierEmail", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  concreteType: varchar("concreteType", { length: 100 }).notNull(),
  volume: int("volume").notNull(),
  scheduledTime: timestamp("scheduledTime").notNull(),
  actualTime: timestamp("actualTime"),
  status: mysqlEnum("status", ["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled").notNull(),
  driverName: varchar("driverName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 100 }),
  notes: text("notes"),
  gpsLocation: varchar("gpsLocation", { length: 100 }),
  // "lat,lng"
  deliveryPhotos: text("deliveryPhotos"),
  // JSON array of photo URLs
  estimatedArrival: int("estimatedArrival"),
  // Unix timestamp (seconds)
  actualArrivalTime: int("actualArrivalTime"),
  actualDeliveryTime: int("actualDeliveryTime"),
  driverNotes: text("driverNotes"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 50 }),
  smsNotificationSent: boolean("smsNotificationSent").default(false),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var qualityTests = mysqlTable("qualityTests", {
  id: int("id").autoincrement().primaryKey(),
  testName: varchar("testName", { length: 255 }).notNull(),
  testType: mysqlEnum("testType", ["slump", "strength", "air_content", "temperature", "other"]).default("other").notNull(),
  result: varchar("result", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  status: mysqlEnum("status", ["pass", "fail", "pending"]).default("pending").notNull(),
  deliveryId: int("deliveryId"),
  projectId: int("projectId"),
  testedBy: varchar("testedBy", { length: 255 }),
  notes: text("notes"),
  photoUrls: text("photoUrls"),
  // JSON array of S3 photo URLs
  inspectorSignature: text("inspectorSignature"),
  // Base64 signature image
  supervisorSignature: text("supervisorSignature"),
  // Base64 signature image
  testLocation: varchar("testLocation", { length: 100 }),
  // GPS coordinates "lat,lng"
  complianceStandard: varchar("complianceStandard", { length: 50 }),
  // EN 206, ASTM C94, etc.
  offlineSyncStatus: mysqlEnum("offlineSyncStatus", ["synced", "pending", "failed"]).default("synced"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  employeeNumber: varchar("employeeNumber", { length: 50 }).notNull().unique(),
  position: varchar("position", { length: 100 }).notNull(),
  department: mysqlEnum("department", ["construction", "maintenance", "quality", "administration", "logistics"]).default("construction").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  email: varchar("email", { length: 320 }),
  hourlyRate: int("hourlyRate"),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
  hireDate: timestamp("hireDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var workHours = mysqlTable("workHours", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId"),
  date: timestamp("date").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  hoursWorked: int("hoursWorked"),
  overtimeHours: int("overtimeHours").default(0),
  workType: mysqlEnum("workType", ["regular", "overtime", "weekend", "holiday"]).default("regular").notNull(),
  notes: text("notes"),
  approvedBy: int("approvedBy"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var concreteBases = mysqlTable("concreteBases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  capacity: int("capacity").notNull(),
  status: mysqlEnum("status", ["operational", "maintenance", "inactive"]).default("operational").notNull(),
  managerName: varchar("managerName", { length: 255 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  machineNumber: varchar("machineNumber", { length: 100 }).notNull().unique(),
  type: mysqlEnum("type", ["mixer", "pump", "truck", "excavator", "crane", "other"]).default("other").notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  year: int("year"),
  concreteBaseId: int("concreteBaseId"),
  status: mysqlEnum("status", ["operational", "maintenance", "repair", "inactive"]).default("operational").notNull(),
  totalWorkingHours: int("totalWorkingHours").default(0),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  nextMaintenanceDate: timestamp("nextMaintenanceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var machineMaintenance = mysqlTable("machineMaintenance", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  date: timestamp("date").notNull(),
  maintenanceType: mysqlEnum("maintenanceType", ["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]).default("other").notNull(),
  description: text("description"),
  lubricationType: varchar("lubricationType", { length: 100 }),
  lubricationAmount: int("lubricationAmount"),
  fuelType: varchar("fuelType", { length: 100 }),
  fuelAmount: int("fuelAmount"),
  cost: int("cost"),
  performedBy: varchar("performedBy", { length: 255 }),
  hoursAtMaintenance: int("hoursAtMaintenance"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var machineWorkHours = mysqlTable("machineWorkHours", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  projectId: int("projectId"),
  date: timestamp("date").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  hoursWorked: int("hoursWorked"),
  operatorId: int("operatorId"),
  operatorName: varchar("operatorName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var aggregateInputs = mysqlTable("aggregateInputs", {
  id: int("id").autoincrement().primaryKey(),
  concreteBaseId: int("concreteBaseId").notNull(),
  date: timestamp("date").notNull(),
  materialType: mysqlEnum("materialType", ["cement", "sand", "gravel", "water", "admixture", "other"]).default("other").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  batchNumber: varchar("batchNumber", { length: 100 }),
  receivedBy: varchar("receivedBy", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var materialConsumptionLog = mysqlTable("material_consumption_log", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  quantity: int("quantity").notNull(),
  consumptionDate: timestamp("consumptionDate").notNull(),
  projectId: int("projectId"),
  deliveryId: int("deliveryId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  supplier: varchar("supplier", { length: 255 }),
  supplierEmail: varchar("supplierEmail", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "ordered", "received", "cancelled"]).default("pending").notNull(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  expectedDelivery: timestamp("expectedDelivery"),
  actualDelivery: timestamp("actualDelivery"),
  totalCost: int("totalCost"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var forecastPredictions = mysqlTable("forecast_predictions", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  currentStock: int("currentStock").notNull(),
  dailyConsumptionRate: int("dailyConsumptionRate").notNull(),
  predictedRunoutDate: timestamp("predictedRunoutDate"),
  daysUntilStockout: int("daysUntilStockout"),
  recommendedOrderQty: int("recommendedOrderQty"),
  confidence: int("confidence"),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull()
});
var reportSettings = mysqlTable("report_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  includeProduction: boolean("includeProduction").default(true).notNull(),
  includeDeliveries: boolean("includeDeliveries").default(true).notNull(),
  includeMaterials: boolean("includeMaterials").default(true).notNull(),
  includeQualityControl: boolean("includeQualityControl").default(true).notNull(),
  reportTime: varchar("reportTime", { length: 10 }).default("18:00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var reportRecipients = mysqlTable("report_recipients", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlTemplate: text("htmlTemplate").notNull(),
  variables: text("variables"),
  // JSON string of available variables
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var emailBranding = mysqlTable("email_branding", {
  id: int("id").autoincrement().primaryKey(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#f97316").notNull(),
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#ea580c").notNull(),
  companyName: varchar("companyName", { length: 255 }).default("AzVirt").notNull(),
  footerText: text("footerText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var aiConversations = mysqlTable("ai_conversations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  modelName: varchar("modelName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var aiMessages = mysqlTable("ai_messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system", "tool"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 100 }),
  audioUrl: text("audioUrl"),
  imageUrl: text("imageUrl"),
  thinkingProcess: text("thinkingProcess"),
  // JSON string
  toolCalls: text("toolCalls"),
  // JSON string
  metadata: text("metadata"),
  // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var aiModels = mysqlTable("ai_models", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["text", "vision", "code"]).notNull(),
  size: varchar("size", { length: 20 }),
  isAvailable: boolean("isAvailable").default(false),
  lastUsed: timestamp("lastUsed"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var dailyTasks = mysqlTable("daily_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  assignedTo: int("assignedTo"),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  attachments: json("attachments"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var taskAssignments = mysqlTable("task_assignments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  assignedTo: int("assignedTo").notNull(),
  assignedBy: int("assignedBy").notNull(),
  responsibility: varchar("responsibility", { length: 255 }).notNull(),
  completionPercentage: int("completionPercentage").default(0).notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var taskStatusHistory = mysqlTable("task_status_history", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var taskNotifications = mysqlTable("task_notifications", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["overdue_reminder", "completion_confirmation", "assignment", "status_change", "comment"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "read"]).default("pending").notNull(),
  channels: json("channels"),
  // Array of 'email', 'sms', 'in_app'
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  smsEnabled: boolean("smsEnabled").default(false).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  overdueReminders: boolean("overdueReminders").default(true).notNull(),
  completionNotifications: boolean("completionNotifications").default(true).notNull(),
  assignmentNotifications: boolean("assignmentNotifications").default(true).notNull(),
  statusChangeNotifications: boolean("statusChangeNotifications").default(true).notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }),
  // HH:MM format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }),
  // HH:MM format
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId").notNull(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "in_app"]).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "bounced", "opened"]).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  openedAt: timestamp("openedAt"),
  metadata: json("metadata")
  // Additional tracking data
});
var notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyText: text("bodyText").notNull(),
  bodyHtml: text("bodyHtml"),
  channels: json("channels").$type().notNull(),
  variables: json("variables").$type(),
  tags: json("tags").$type(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notificationTriggers = mysqlTable("notification_triggers", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  templateId: int("templateId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  triggerCondition: json("triggerCondition").$type().notNull(),
  actions: json("actions").$type().notNull(),
  isActive: boolean("isActive").notNull().default(true),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: int("triggerCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var triggerExecutionLog = mysqlTable("trigger_execution_log", {
  id: int("id").autoincrement().primaryKey(),
  triggerId: int("triggerId").notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId").notNull(),
  conditionsMet: boolean("conditionsMet").notNull(),
  notificationsSent: int("notificationsSent").notNull().default(0),
  error: text("error"),
  executedAt: timestamp("executedAt").defaultNow().notNull()
});
var shiftTemplates = mysqlTable("shift_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  // HH:MM format
  endTime: varchar("endTime", { length: 5 }).notNull(),
  // HH:MM format
  breakDuration: int("breakDuration").default(0),
  // in minutes
  daysOfWeek: json("daysOfWeek").$type().notNull(),
  // 0-6 (Sunday-Saturday)
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  shiftDate: timestamp("shiftDate").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  breakDuration: int("breakDuration").default(0),
  // in minutes
  projectId: int("projectId"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var employeeAvailability = mysqlTable("employee_availability", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(),
  // 0-6 (Sunday-Saturday)
  isAvailable: boolean("isAvailable").notNull().default(true),
  startTime: varchar("startTime", { length: 5 }),
  // HH:MM format
  endTime: varchar("endTime", { length: 5 }),
  // HH:MM format
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var breakRules = mysqlTable("break_rules", {
  id: int("id").autoincrement().primaryKey(),
  jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),
  // e.g., "US-CA", "US-NY", "EU"
  name: varchar("name", { length: 255 }).notNull(),
  dailyWorkHours: int("dailyWorkHours").notNull(),
  // hours before break required
  breakDuration: int("breakDuration").notNull(),
  // minutes
  breakType: mysqlEnum("breakType", ["meal", "rest", "combined"]).notNull(),
  isRequired: boolean("isRequired").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var breakRecords = mysqlTable("break_records", {
  id: int("id").autoincrement().primaryKey(),
  workHourId: int("workHourId").notNull(),
  employeeId: int("employeeId").notNull(),
  breakStart: timestamp("breakStart").notNull(),
  breakEnd: timestamp("breakEnd"),
  breakDuration: int("breakDuration"),
  // in minutes
  breakType: mysqlEnum("breakType", ["meal", "rest", "combined"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var complianceAuditTrail = mysqlTable("compliance_audit_trail", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  auditDate: timestamp("auditDate").notNull(),
  auditType: mysqlEnum("auditType", ["daily_hours", "weekly_hours", "break_compliance", "overtime", "wage_calculation"]).notNull(),
  status: mysqlEnum("status", ["compliant", "warning", "violation"]).notNull(),
  details: json("details").$type().notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("low").notNull(),
  actionTaken: text("actionTaken"),
  resolvedAt: timestamp("resolvedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var timesheetOfflineCache = mysqlTable("timesheet_offline_cache", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  deviceId: varchar("deviceId", { length: 255 }).notNull(),
  entryData: json("entryData").$type().notNull(),
  syncStatus: mysqlEnum("syncStatus", ["pending", "syncing", "synced", "failed"]).default("pending").notNull(),
  syncAttempts: int("syncAttempts").default(0),
  lastSyncAttempt: timestamp("lastSyncAttempt"),
  syncedAt: timestamp("syncedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var jobSites = mysqlTable("job_sites", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  geofenceRadius: int("geofenceRadius").default(100).notNull(),
  // in meters
  address: varchar("address", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var geofences = mysqlTable("geofences", {
  id: int("id").autoincrement().primaryKey(),
  jobSiteId: int("jobSiteId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  centerLatitude: decimal("centerLatitude", { precision: 10, scale: 8 }).notNull(),
  centerLongitude: decimal("centerLongitude", { precision: 11, scale: 8 }).notNull(),
  radiusMeters: int("radiusMeters").notNull(),
  geofenceType: mysqlEnum("geofenceType", ["circular", "polygon"]).default("circular").notNull(),
  polygonCoordinates: json("polygonCoordinates").$type(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var locationLogs = mysqlTable("location_logs", {
  id: int("id").autoincrement().primaryKey(),
  shiftId: int("shiftId").notNull(),
  employeeId: int("employeeId").notNull(),
  jobSiteId: int("jobSiteId").notNull(),
  eventType: mysqlEnum("eventType", ["check_in", "check_out", "location_update"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: int("accuracy"),
  // GPS accuracy in meters
  isWithinGeofence: boolean("isWithinGeofence").default(false).notNull(),
  distanceFromGeofence: int("distanceFromGeofence"),
  // distance in meters if outside geofence
  deviceId: varchar("deviceId", { length: 255 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var geofenceViolations = mysqlTable("geofence_violations", {
  id: int("id").autoincrement().primaryKey(),
  locationLogId: int("locationLogId").notNull(),
  employeeId: int("employeeId").notNull(),
  jobSiteId: int("jobSiteId").notNull(),
  violationType: mysqlEnum("violationType", ["outside_geofence", "check_in_outside", "check_out_outside"]).notNull(),
  distanceFromGeofence: int("distanceFromGeofence").notNull(),
  // distance in meters
  severity: mysqlEnum("severity", ["warning", "violation"]).default("warning").notNull(),
  isResolved: boolean("isResolved").default(false).notNull(),
  resolvedBy: int("resolvedBy"),
  resolutionNotes: text("resolutionNotes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var concreteRecipes = mysqlTable("concrete_recipes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  concreteType: varchar("concreteType", { length: 100 }),
  // e.g., C25/30, C30/37, Torket
  yieldVolume: int("yieldVolume").notNull().default(1e3),
  // Volume in liters (1 m³ = 1000 L)
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var recipeIngredients = mysqlTable("recipe_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  recipeId: int("recipeId").notNull(),
  materialId: int("materialId"),
  // Reference to materials table (null for water)
  materialName: varchar("materialName", { length: 255 }).notNull(),
  // Name for display
  quantity: int("quantity").notNull(),
  // Quantity in base unit (kg or L)
  unit: varchar("unit", { length: 50 }).notNull(),
  // kg, L, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var mixingLogs = mysqlTable("mixing_logs", {
  id: int("id").autoincrement().primaryKey(),
  batchNumber: varchar("batchNumber", { length: 100 }).notNull().unique(),
  // e.g., BATCH-2025-001
  recipeId: int("recipeId").notNull(),
  // Reference to concrete_recipes
  recipeName: varchar("recipeName", { length: 255 }).notNull(),
  // Recipe name for quick reference
  volume: int("volume").notNull(),
  // Volume in liters (1 m³ = 1000 L)
  volumeM3: decimal("volumeM3", { precision: 10, scale: 2 }).notNull(),
  // Volume in m³
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "rejected"]).default("planned").notNull(),
  projectId: int("projectId"),
  // Optional: associated project
  deliveryId: int("deliveryId"),
  // Optional: associated delivery
  startTime: timestamp("startTime"),
  endTime: timestamp("endTime"),
  producedBy: int("producedBy"),
  // User ID who created the batch
  approvedBy: int("approvedBy"),
  // User ID who approved the batch
  notes: text("notes"),
  // Additional notes about the batch
  qualityNotes: text("qualityNotes"),
  // Quality control notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var batchIngredients = mysqlTable("batch_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  // Reference to mixing_logs
  materialId: int("materialId"),
  // Reference to materials table (null for water)
  materialName: varchar("materialName", { length: 255 }).notNull(),
  // Material name
  plannedQuantity: int("plannedQuantity").notNull(),
  // Planned quantity based on recipe
  actualQuantity: int("actualQuantity"),
  // Actual quantity used (null if not completed)
  unit: varchar("unit", { length: 50 }).notNull(),
  // kg, L, etc.
  inventoryDeducted: boolean("inventoryDeducted").default(false).notNull(),
  // Whether inventory was deducted
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var timesheetApprovals = mysqlTable("timesheet_approvals", {
  id: int("id").autoincrement().primaryKey(),
  timesheetId: int("timesheetId").notNull(),
  approverId: int("approverId").notNull(),
  // Manager ID
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  comments: text("comments"),
  rejectionReason: text("rejectionReason"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/db.ts
var recordToObj = recordToNative;
var sqliteClient = createClient({
  url: process.env.DATABASE_URL || "file:local.db"
});
var db = drizzle(sqliteClient, { schema: schema_exports });
async function getDb2() {
  return db;
}
async function upsertUser(user2) {
  if (!user2.openId) throw new Error("User openId is required for upsert");
  const session = getSession();
  try {
    const role = user2.role || (user2.openId === ENV.ownerOpenId ? "admin" : "user");
    await session.run(`
      MERGE (u:User {openId: $openId})
      ON CREATE SET 
        u.id = toInteger(timestamp()),  // Simple ID generation for new users
        u.name = $name,
        u.email = $email,
        u.loginMethod = $loginMethod,
        u.role = $role,
        u.lastSignedIn = datetime(),
        u.createdAt = datetime(),
        u.updatedAt = datetime()
      ON MATCH SET
        u.name = COALESCE($name, u.name),
        u.email = COALESCE($email, u.email),
        u.loginMethod = COALESCE($loginMethod, u.loginMethod),
        u.lastSignedIn = datetime(),
        u.updatedAt = datetime()
    `, {
      openId: user2.openId,
      name: user2.name || null,
      email: user2.email || null,
      loginMethod: user2.loginMethod || null,
      role
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  } finally {
    await session.close();
  }
}
async function getUserByOpenId(openId) {
  const session = getSession();
  try {
    const result = await session.run(
      "MATCH (u:User {openId: $openId}) RETURN u",
      { openId }
    );
    if (result.records.length === 0) return void 0;
    return recordToObj(result.records[0], "u");
  } finally {
    await session.close();
  }
}
async function createDocument(doc) {
  const session = getSession();
  try {
    const query = `
      CREATE (d:Document {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        fileKey: $fileKey,
        fileUrl: $fileUrl,
        mimeType: $mimeType,
        fileSize: $fileSize,
        category: $category,
        uploadedBy: $uploadedBy,
        projectId: $projectId,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH d
      MATCH (u:User {id: $uploadedBy})
      MERGE (u)-[:UPLOADED]->(d)
      WITH d
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (p)-[:HAS_DOCUMENT]->(d)
      )
      RETURN d
    `;
    await session.run(query, {
      name: doc.name,
      description: doc.description || "",
      fileKey: doc.fileKey,
      fileUrl: doc.fileUrl,
      mimeType: doc.mimeType || "",
      fileSize: doc.fileSize || 0,
      category: doc.category || "other",
      uploadedBy: doc.uploadedBy,
      projectId: doc.projectId || null
    });
  } catch (e) {
    console.error("Failed to create document", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getDocuments(filters) {
  const session = getSession();
  try {
    let query = "MATCH (d:Document)";
    let params = {};
    let whereClauses = [];
    if (filters?.projectId) {
      query = "MATCH (p:Project {id: $projectId})-[:HAS_DOCUMENT]->(d)";
      params.projectId = filters.projectId;
    }
    if (filters?.category) {
      whereClauses.push("d.category = $category");
      params.category = filters.category;
    }
    if (filters?.search) {
      whereClauses.push("(toLower(d.name) CONTAINS toLower($search) OR toLower(d.description) CONTAINS toLower($search))");
      params.search = filters.search;
    }
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }
    query += " RETURN d ORDER BY d.createdAt DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "d"));
  } finally {
    await session.close();
  }
}
async function deleteDocument(id) {
  const session = getSession();
  try {
    await session.run("MATCH (d:Document {id: $id}) DETACH DELETE d", { id });
  } finally {
    await session.close();
  }
}
async function createProject(project) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $createdBy})
      CREATE (p:Project {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        location: $location,
        status: $status,
        startDate: datetime($startDate),
        endDate: datetime($endDate),
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:CREATED]->(p)
      RETURN p
    `;
    await session.run(query, {
      name: project.name,
      description: project.description || "",
      location: project.location || "",
      status: project.status,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
      createdBy: project.createdBy
    });
  } catch (e) {
    console.error("Failed to create project", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getProjects() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (p:Project) RETURN p ORDER BY p.createdAt DESC");
    return result.records.map((r) => recordToObj(r, "p"));
  } finally {
    await session.close();
  }
}
async function updateProject(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      sets.push(`p.${key} = $${key}`);
      if (data[key] instanceof Date) {
        sets.push(`p.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        params[key] = data[key];
      }
    });
    sets.push("p.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (p:Project {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function createMaterial(material) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (m:Material {
        id: toInteger(timestamp()),
        name: $name,
        category: $category,
        unit: $unit,
        quantity: toInteger($quantity),
        minStock: toInteger($minStock),
        criticalThreshold: toInteger($criticalThreshold),
        supplier: $supplier,
        unitPrice: toInteger($unitPrice),
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity: material.quantity || 0,
      minStock: material.minStock || 0,
      criticalThreshold: material.criticalThreshold || 0,
      supplier: material.supplier || null,
      unitPrice: material.unitPrice || 0
    });
  } catch (e) {
    console.error("Failed to create material", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getMaterials() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (m:Material) RETURN m ORDER BY m.name");
    return result.records.map((r) => recordToObj(r, "m"));
  } finally {
    await session.close();
  }
}
async function updateMaterial(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (["quantity", "minStock", "criticalThreshold", "unitPrice"].includes(key)) {
        sets.push(`m.${key} = toInteger($${key})`);
      } else {
        sets.push(`m.${key} = $${key}`);
      }
      params[key] = data[key];
    });
    sets.push("m.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (m:Material {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function deleteMaterial(id) {
  const session = getSession();
  try {
    await session.run("MATCH (m:Material {id: $id}) DETACH DELETE m", { id });
  } finally {
    await session.close();
  }
}
async function createDelivery(delivery) {
  const session = getSession();
  try {
    const query = `
      CREATE (d:Delivery {
        id: toInteger(timestamp()),
        projectId: $projectId,
        projectName: $projectName,
        concreteType: $concreteType,
        volume: toInteger($volume),
        scheduledTime: datetime($scheduledTime),
        status: $status,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH d
      MATCH (u:User {id: $createdBy})
      MERGE (u)-[:CREATED]->(d)
      WITH d
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d)-[:DELIVERED_TO]->(p)
      )
      RETURN d
    `;
    await session.run(query, {
      projectId: delivery.projectId || null,
      projectName: delivery.projectName,
      concreteType: delivery.concreteType,
      volume: delivery.volume,
      scheduledTime: delivery.scheduledTime.toISOString(),
      status: delivery.status,
      createdBy: delivery.createdBy
    });
  } catch (e) {
    console.error("Failed to create delivery", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getDeliveries(filters) {
  const session = getSession();
  try {
    let query = "MATCH (d:Delivery)";
    let params = {};
    let where = [];
    if (filters?.projectId) {
      where.push("d.projectId = $projectId");
      params.projectId = filters.projectId;
    }
    if (filters?.status) {
      where.push("d.status = $status");
      params.status = filters.status;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN d ORDER BY d.scheduledTime DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "d"));
  } finally {
    await session.close();
  }
}
async function updateDelivery(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      sets.push(`d.${key} = $${key}`);
      if (data[key] instanceof Date) {
        sets.push(`d.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        params[key] = data[key];
      }
    });
    sets.push("d.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (d:Delivery {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function createQualityTest(test) {
  const session = getSession();
  try {
    const query = `
      CREATE (q:QualityTest {
        id: toInteger(timestamp()),
        testName: $testName,
        testType: $testType,
        result: $result,
        unit: $unit,
        status: $status,
        deliveryId: $deliveryId,
        projectId: $projectId,
        testedBy: $testedBy,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH q
      OPTIONAL MATCH (d:Delivery {id: $deliveryId})
      FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
        MERGE (d)-[:HAS_TEST]->(q)
      )
      WITH q
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (p)-[:HAS_TEST]->(q)
      )
      RETURN q
    `;
    await session.run(query, {
      testName: test.testName,
      testType: test.testType,
      result: test.result,
      unit: test.unit || "",
      status: test.status,
      deliveryId: test.deliveryId || null,
      projectId: test.projectId || null,
      testedBy: test.testedBy || "",
      notes: test.notes || ""
    });
  } catch (e) {
    console.error("Failed to create quality test", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getQualityTests(filters) {
  const session = getSession();
  try {
    let query = "MATCH (q:QualityTest)";
    let params = {};
    let where = [];
    if (filters?.projectId) {
      where.push("q.projectId = $projectId");
      params.projectId = filters.projectId;
    }
    if (filters?.deliveryId) {
      where.push("q.deliveryId = $deliveryId");
      params.deliveryId = filters.deliveryId;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN q ORDER BY q.createdAt DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "q"));
  } finally {
    await session.close();
  }
}
async function updateQualityTest(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      sets.push(`q.${key} = $${key}`);
      params[key] = data[key];
    });
    sets.push("q.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (q:QualityTest {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function getFailedQualityTests(days = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
        MATCH (q:QualityTest) 
        WHERE q.status = 'fail' AND q.createdAt >= datetime() - duration({days: $days})
        RETURN q ORDER BY q.createdAt DESC
    `, { days });
    return result.records.map((r) => recordToObj(r, "q"));
  } finally {
    await session.close();
  }
}
async function getQualityTestTrends(days = 30) {
  const session = getSession();
  try {
    const query = `
        MATCH (q:QualityTest)
        WHERE q.createdAt >= datetime() - duration({days: $days})
        RETURN 
          count(q) as total,
          sum(CASE WHEN q.status = 'pass' THEN 1 ELSE 0 END) as passed,
          sum(CASE WHEN q.status = 'fail' THEN 1 ELSE 0 END) as failed,
          sum(CASE WHEN q.status = 'pending' THEN 1 ELSE 0 END) as pending,
          q.testType as type,
          count(q.testType) as typeCount
    `;
    const result = await session.run(`
        MATCH (q:QualityTest)
        WHERE q.createdAt >= datetime() - duration({days: $days})
        RETURN q.status as status, q.testType as testType
    `, { days });
    const records = result.records.map((r) => ({ status: r.get("status"), testType: r.get("testType") }));
    const totalTests = records.length;
    if (totalTests === 0) return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };
    const passCount = records.filter((t2) => t2.status === "pass").length;
    const failCount = records.filter((t2) => t2.status === "fail").length;
    const pendingCount = records.filter((t2) => t2.status === "pending").length;
    const byTypeMap = /* @__PURE__ */ new Map();
    records.forEach((r) => {
      const type = r.testType || "other";
      byTypeMap.set(type, (byTypeMap.get(type) || 0) + 1);
    });
    const byType = Array.from(byTypeMap.entries()).map(([type, total]) => ({ type, total }));
    return {
      passRate: passCount / totalTests * 100,
      failRate: failCount / totalTests * 100,
      pendingRate: pendingCount / totalTests * 100,
      totalTests,
      byType
    };
  } finally {
    await session.close();
  }
}
async function createEmployee(employee) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (e:Employee {
        id: toInteger(timestamp()),
        firstName: $firstName,
        lastName: $lastName,
        employeeNumber: $employeeNumber,
        position: $position,
        department: $department,
        phoneNumber: $phoneNumber,
        email: $email,
        hourlyRate: toInteger($hourlyRate),
        status: $status,
        hireDate: datetime($hireDate),
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeNumber: employee.employeeNumber,
      position: employee.position,
      department: employee.department,
      phoneNumber: employee.phoneNumber || "",
      email: employee.email || "",
      hourlyRate: employee.hourlyRate || 0,
      status: employee.status,
      hireDate: employee.hireDate ? employee.hireDate.toISOString() : null
    });
  } catch (e) {
    console.error("Failed to create employee", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getEmployees(filters) {
  const session = getSession();
  try {
    let query = "MATCH (e:Employee)";
    let params = {};
    let where = [];
    if (filters?.department) {
      where.push("e.department = $department");
      params.department = filters.department;
    }
    if (filters?.status) {
      where.push("e.status = $status");
      params.status = filters.status;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN e ORDER BY e.createdAt DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "e"));
  } finally {
    await session.close();
  }
}
async function getEmployeeById(id) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (e:Employee {id: $id}) RETURN e", { id });
    if (result.records.length === 0) return void 0;
    return recordToObj(result.records[0], "e");
  } finally {
    await session.close();
  }
}
async function updateEmployee(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (key === "hourlyRate") {
        sets.push(`e.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`e.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`e.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });
    sets.push("e.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (e:Employee {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function deleteEmployee(id) {
  const session = getSession();
  try {
    await session.run("MATCH (e:Employee {id: $id}) DETACH DELETE e", { id });
  } finally {
    await session.close();
  }
}
async function createWorkHour(workHour) {
  const session = getSession();
  try {
    const query = `
      CREATE (w:WorkHour {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        projectId: $projectId,
        date: datetime($date),
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        hoursWorked: toInteger($hoursWorked),
        overtimeHours: toInteger($overtimeHours),
        workType: $workType,
        notes: $notes,
        status: $status,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH w
      MATCH (e:Employee {id: $employeeId})
      MERGE (e)-[:LOGGED]->(w)
      WITH w
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (w)-[:LOGGED_FOR]->(p)
      )
      RETURN w
    `;
    await session.run(query, {
      employeeId: workHour.employeeId,
      projectId: workHour.projectId || null,
      date: workHour.date.toISOString(),
      startTime: workHour.startTime.toISOString(),
      endTime: workHour.endTime ? workHour.endTime.toISOString() : null,
      hoursWorked: workHour.hoursWorked || 0,
      overtimeHours: workHour.overtimeHours || 0,
      workType: workHour.workType,
      notes: workHour.notes || "",
      status: workHour.status
    });
  } catch (e) {
    console.error("Failed to create work hour", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getWorkHours(filters) {
  const session = getSession();
  try {
    let query = "MATCH (w:WorkHour)";
    let params = {};
    let where = [];
    if (filters?.employeeId) {
      where.push("w.employeeId = $employeeId");
      params.employeeId = filters.employeeId;
    }
    if (filters?.projectId) {
      where.push("w.projectId = $projectId");
      params.projectId = filters.projectId;
    }
    if (filters?.status) {
      where.push("w.status = $status");
      params.status = filters.status;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN w ORDER BY w.date DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "w"));
  } finally {
    await session.close();
  }
}
async function updateWorkHour(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (["hoursWorked", "overtimeHours"].includes(key)) {
        sets.push(`w.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`w.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`w.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });
    sets.push("w.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (w:WorkHour {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function createConcreteBase(base) {
  const session = getSession();
  try {
    await session.run(`
      CREATE (c:ConcreteBase {
        id: toInteger(timestamp()),
        name: $name,
        location: $location,
        status: $status,
        capacity: toInteger($capacity),
        isActive: $isActive,
        createdAt: datetime(),
        updatedAt: datetime()
      })
    `, {
      name: base.name,
      location: base.location || "",
      status: base.status || "active",
      capacity: base.capacity || 0,
      isActive: base.isActive
    });
  } catch (e) {
    console.error("Failed to create concrete base", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getConcreteBases() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (c:ConcreteBase) RETURN c ORDER BY c.createdAt DESC");
    return result.records.map((r) => recordToObj(r, "c"));
  } finally {
    await session.close();
  }
}
async function updateConcreteBase(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (key === "capacity") {
        sets.push(`c.${key} = toInteger($${key})`);
      } else {
        sets.push(`c.${key} = $${key}`);
      }
      params[key] = data[key];
    });
    sets.push("c.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (c:ConcreteBase {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function createMachine(machine) {
  const session = getSession();
  try {
    const query = `
      CREATE (m:Machine {
        id: toInteger(timestamp()),
        name: $name,
        machineNumber: $machineNumber,
        type: $type,
        manufacturer: $manufacturer,
        model: $model,
        year: toInteger($year),
        concreteBaseId: $concreteBaseId,
        status: $status,
        totalWorkingHours: toInteger($totalWorkingHours),
        lastMaintenanceDate: datetime($lastMaintenanceDate),
        nextMaintenanceDate: datetime($nextMaintenanceDate),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH m
      OPTIONAL MATCH (c:ConcreteBase {id: $concreteBaseId})
      FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
        MERGE (m)-[:LOCATED_AT]->(c)
      )
      RETURN m
    `;
    await session.run(query, {
      name: machine.name,
      machineNumber: machine.machineNumber,
      type: machine.type,
      manufacturer: machine.manufacturer || "",
      model: machine.model || "",
      year: machine.year || 0,
      concreteBaseId: machine.concreteBaseId || null,
      status: machine.status,
      totalWorkingHours: machine.totalWorkingHours || 0,
      lastMaintenanceDate: machine.lastMaintenanceDate ? machine.lastMaintenanceDate.toISOString() : null,
      nextMaintenanceDate: machine.nextMaintenanceDate ? machine.nextMaintenanceDate.toISOString() : null
    });
  } catch (e) {
    console.error("Failed to create machine", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getMachines(filters) {
  const session = getSession();
  try {
    let query = "MATCH (m:Machine)";
    let params = {};
    let where = [];
    if (filters?.concreteBaseId) {
      where.push("m.concreteBaseId = $concreteBaseId");
      params.concreteBaseId = filters.concreteBaseId;
    }
    if (filters?.type) {
      where.push("m.type = $type");
      params.type = filters.type;
    }
    if (filters?.status) {
      where.push("m.status = $status");
      params.status = filters.status;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN m ORDER BY m.createdAt DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "m"));
  } finally {
    await session.close();
  }
}
async function updateMachine(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (["year", "totalWorkingHours"].includes(key)) {
        sets.push(`m.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`m.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`m.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });
    sets.push("m.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (m:Machine {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function deleteMachine(id) {
  const session = getSession();
  try {
    await session.run("MATCH (m:Machine {id: $id}) DETACH DELETE m", { id });
  } finally {
    await session.close();
  }
}
async function createMachineMaintenance(maintenance) {
  const session = getSession();
  try {
    const query = `
      CREATE (mm:MachineMaintenance {
        id: toInteger(timestamp()),
        machineId: $machineId,
        type: $maintenanceType,
        date: datetime($date),
        description: $description,
        cost: toInteger($cost),
        performedBy: $performedBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH mm
      MATCH (m:Machine {id: $machineId})
      MERGE (m)-[:UNDERWENT]->(mm)
      RETURN mm
    `;
    await session.run(query, {
      machineId: maintenance.machineId,
      maintenanceType: maintenance.maintenanceType,
      date: maintenance.date ? maintenance.date.toISOString() : null,
      description: maintenance.description || "",
      cost: maintenance.cost || 0,
      performedBy: maintenance.performedBy || ""
    });
  } catch (e) {
    console.error("Failed to create machine maintenance", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getMachineMaintenance(filters) {
  const session = getSession();
  try {
    let query = "MATCH (mm:MachineMaintenance)";
    let params = {};
    let where = [];
    if (filters?.machineId) {
      where.push("mm.machineId = $machineId");
      params.machineId = filters.machineId;
    }
    if (filters?.maintenanceType) {
      where.push("mm.type = $maintenanceType");
      params.maintenanceType = filters.maintenanceType;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN mm ORDER BY mm.date DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "mm"));
  } finally {
    await session.close();
  }
}
async function createMachineWorkHour(workHour) {
  const session = getSession();
  try {
    const query = `
      CREATE (mw:MachineWorkHour {
        id: toInteger(timestamp()),
        machineId: $machineId,
        projectId: $projectId,
        date: datetime($date),
        hours: toInteger($hours),
        operatorId: $operatorId,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH mw
      MATCH (m:Machine {id: $machineId})
      MERGE (m)-[:WORKED]->(mw)
      WITH mw
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (mw)-[:WORKED_ON]->(p)
      )
      RETURN mw
    `;
    await session.run(query, {
      machineId: workHour.machineId,
      projectId: workHour.projectId || null,
      date: workHour.date.toISOString(),
      hours: workHour.hours,
      operatorId: workHour.operatorId || null,
      notes: workHour.notes || ""
    });
  } catch (e) {
    console.error("Failed to create machine work hour", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getMachineWorkHours(filters) {
  const session = getSession();
  try {
    let query = "MATCH (mw:MachineWorkHour)";
    let params = {};
    let where = [];
    if (filters?.machineId) {
      where.push("mw.machineId = $machineId");
      params.machineId = filters.machineId;
    }
    if (filters?.projectId) {
      where.push("mw.projectId = $projectId");
      params.projectId = filters.projectId;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN mw ORDER BY mw.date DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "mw"));
  } finally {
    await session.close();
  }
}
async function createAggregateInput(input) {
  const session = getSession();
  try {
    const query = `
      CREATE (ai:AggregateInput {
        id: toInteger(timestamp()),
        concreteBaseId: $concreteBaseId,
        materialType: $materialType,
        quantity: toInteger($quantity),
        source: $source,
        date: datetime($date),
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH ai
      MATCH (c:ConcreteBase {id: $concreteBaseId})
      MERGE (c)-[:USED_INPUT]->(ai)
      RETURN ai
    `;
    await session.run(query, {
      concreteBaseId: input.concreteBaseId,
      materialType: input.materialType,
      quantity: input.quantity || 0,
      source: input.source || "",
      date: input.date.toISOString()
    });
  } catch (e) {
    console.error("Failed to create aggregate input", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getAggregateInputs(filters) {
  const session = getSession();
  try {
    let query = "MATCH (ai:AggregateInput)";
    let params = {};
    let where = [];
    if (filters?.concreteBaseId) {
      where.push("ai.concreteBaseId = $concreteBaseId");
      params.concreteBaseId = filters.concreteBaseId;
    }
    if (filters?.materialType) {
      where.push("ai.materialType = $materialType");
      params.materialType = filters.materialType;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN ai ORDER BY ai.date DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "ai"));
  } finally {
    await session.close();
  }
}
async function getLowStockMaterials() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (m:Material) WHERE m.quantity <= m.minStock RETURN m");
    return result.records.map((r) => recordToObj(r, "m"));
  } finally {
    await session.close();
  }
}
async function getCriticalStockMaterials() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (m:Material) WHERE m.quantity <= m.criticalThreshold AND m.criticalThreshold > 0 RETURN m");
    return result.records.map((r) => recordToObj(r, "m"));
  } finally {
    await session.close();
  }
}
async function getAdminUsersWithSMS() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (u:User {role: 'admin', smsNotificationsEnabled: true}) WHERE u.phoneNumber IS NOT NULL RETURN u");
    return result.records.map((r) => recordToObj(r, "u"));
  } finally {
    await session.close();
  }
}
async function updateUserSMSSettings(userId, phoneNumber, enabled) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (u:User {id: $id})
      SET u.phoneNumber = $phoneNumber,
          u.smsNotificationsEnabled = $enabled,
          u.updatedAt = datetime()
    `, { id: userId, phoneNumber, enabled });
    return true;
  } catch (error) {
    console.error("Failed to update SMS settings:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function recordConsumption(consumption) {
  const session = getSession();
  try {
    const query = `
      CREATE (l:MaterialConsumptionLog {
        id: toInteger(timestamp()),
        materialId: $materialId,
        quantity: toInteger($quantity),
        reason: $reason,
        projectId: $projectId,
        consumptionDate: datetime($consumptionDate),
        recordedBy: $recordedBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH l
      MATCH (m:Material {id: $materialId})
      MERGE (m)-[:CONSUMED]->(l)
      WITH l, m
      SET m.quantity = CASE WHEN m.quantity - l.quantity < 0 THEN 0 ELSE m.quantity - l.quantity END,
          m.updatedAt = datetime()
      WITH l
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (l)-[:USED_FOR]->(p)
      )
    `;
    await session.run(query, {
      materialId: consumption.materialId,
      quantity: consumption.quantity,
      reason: consumption.reason || "",
      projectId: consumption.projectId || null,
      consumptionDate: consumption.consumptionDate.toISOString(),
      recordedBy: consumption.recordedBy || null
    });
  } catch (e) {
    console.error("Failed to record consumption", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getConsumptionHistory(materialId, days = 30) {
  const session = getSession();
  try {
    let query = `
      MATCH (l:MaterialConsumptionLog)
      WHERE l.consumptionDate >= datetime() - duration({days: $days})
    `;
    let params = { days };
    if (materialId) {
      query += " AND l.materialId = $materialId";
      params.materialId = materialId;
    }
    query += " RETURN l ORDER BY l.consumptionDate DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "l"));
  } finally {
    await session.close();
  }
}
async function calculateDailyConsumptionRate(materialId, days = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (l:MaterialConsumptionLog)
      WHERE l.materialId = $materialId AND l.consumptionDate >= datetime() - duration({days: $days})
      RETURN 
        sum(l.quantity) as totalConsumed,
        count(DISTINCT date(l.consumptionDate)) as uniqueDays
    `, { materialId, days });
    if (result.records.length === 0) return 0;
    const record = result.records[0];
    const total = record.get("totalConsumed").toNumber();
    const uniqueDays = record.get("uniqueDays").toNumber();
    return uniqueDays > 0 ? total / uniqueDays : 0;
  } finally {
    await session.close();
  }
}
async function generateForecastPredictions() {
  const session = getSession();
  try {
    const allMaterials = await getMaterials();
    const predictions = [];
    await session.run("MATCH (fp:ForecastPrediction) DETACH DELETE fp");
    for (const material of allMaterials) {
      const dailyRate = await calculateDailyConsumptionRate(material.id, 30);
      if (dailyRate > 0) {
        const daysUntilStockout = Math.floor(material.quantity / dailyRate);
        const predictedRunoutDate = /* @__PURE__ */ new Date();
        predictedRunoutDate.setDate(predictedRunoutDate.getDate() + daysUntilStockout);
        const recommendedOrderQty = Math.ceil(dailyRate * 14 * 1.2);
        const history = await getConsumptionHistory(material.id, 30);
        const confidence = Math.min(95, history.length * 3);
        const prediction = {
          materialId: material.id,
          materialName: material.name,
          currentStock: material.quantity,
          dailyConsumptionRate: Math.round(dailyRate),
          predictedRunoutDate: predictedRunoutDate.toISOString(),
          daysUntilStockout,
          recommendedOrderQty,
          confidence,
          calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        predictions.push(prediction);
        await session.run(`
          CREATE (fp:ForecastPrediction {
            id: toInteger(timestamp()),
            materialId: $materialId,
            materialName: $materialName,
            currentStock: toInteger($currentStock),
            dailyConsumptionRate: toInteger($dailyConsumptionRate),
            predictedRunoutDate: datetime($predictedRunoutDate),
            daysUntilStockout: toInteger($daysUntilStockout),
            recommendedOrderQty: toInteger($recommendedOrderQty),
            confidence: toInteger($confidence),
            calculatedAt: datetime($calculatedAt)
          })
          WITH fp
          MATCH (m:Material {id: $materialId})
          MERGE (m)-[:HAS_PREDICTION]->(fp)
        `, prediction);
      }
    }
    return predictions;
  } finally {
    await session.close();
  }
}
async function getForecastPredictions() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (fp:ForecastPrediction) RETURN fp ORDER BY fp.daysUntilStockout");
    return result.records.map((r) => recordToObj(r, "fp"));
  } finally {
    await session.close();
  }
}
async function createPurchaseOrder(order) {
  const session = getSession();
  try {
    const query = `
      CREATE (po:PurchaseOrder {
        id: toInteger(timestamp()),
        materialId: $materialId,
        quantity: toInteger($quantity),
        orderDate: datetime($orderDate),
        expectedDeliveryDate: datetime($expectedDeliveryDate),
        status: $status,
        supplier: $supplier,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH po
      MATCH (m:Material {id: $materialId})
      MERGE (po)-[:FOR_MATERIAL]->(m)
      RETURN po
    `;
    await session.run(query, {
      materialId: order.materialId,
      quantity: order.quantity,
      orderDate: order.orderDate.toISOString(),
      expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString() : null,
      status: order.status || "pending",
      supplier: order.supplier || "",
      notes: order.notes || ""
    });
  } catch (e) {
    console.error("Failed to create purchase order", e);
    throw e;
  } finally {
    await session.close();
  }
}
async function getPurchaseOrders(filters) {
  const session = getSession();
  try {
    let query = "MATCH (po:PurchaseOrder)";
    let params = {};
    let where = [];
    if (filters?.status) {
      where.push("po.status = $status");
      params.status = filters.status;
    }
    if (filters?.materialId) {
      where.push("po.materialId = $materialId");
      params.materialId = filters.materialId;
    }
    if (where.length > 0) {
      query += " WHERE " + where.join(" AND ");
    }
    query += " RETURN po ORDER BY po.createdAt DESC";
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "po"));
  } finally {
    await session.close();
  }
}
async function updatePurchaseOrder(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (key === "quantity") {
        sets.push(`po.${key} = toInteger($${key})`);
      } else if (data[key] instanceof Date) {
        sets.push(`po.${key} = datetime($${key})`);
        params[key] = data[key].toISOString();
      } else {
        sets.push(`po.${key} = $${key}`);
      }
      if (!(data[key] instanceof Date)) params[key] = data[key];
    });
    sets.push("po.updatedAt = datetime()");
    if (sets.length === 0) return;
    await session.run(`MATCH (po:PurchaseOrder {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function getReportSettings(userId) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (u:User {id: $userId})-[:HAS_SETTINGS]->(rs:ReportSettings) RETURN rs", { userId });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], "rs");
  } finally {
    await session.close();
  }
}
async function getEmailBranding() {
  const session = getSession();
  try {
    const result = await session.run("MATCH (eb:EmailBranding) RETURN eb LIMIT 1");
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], "eb");
  } finally {
    await session.close();
  }
}
async function upsertEmailBranding(data) {
  const session = getSession();
  try {
    const query = `
      MERGE (eb:EmailBranding {id: 1})
      ON CREATE SET
        eb.logoUrl = $logoUrl,
        eb.primaryColor = $primaryColor,
        eb.secondaryColor = $secondaryColor,
        eb.companyName = $companyName,
        eb.footerText = $footerText,
        eb.createdAt = datetime(),
        eb.updatedAt = datetime()
      ON MATCH SET
        eb.logoUrl = COALESCE($logoUrl, eb.logoUrl),
        eb.primaryColor = COALESCE($primaryColor, eb.primaryColor),
        eb.secondaryColor = COALESCE($secondaryColor, eb.secondaryColor),
        eb.companyName = COALESCE($companyName, eb.companyName),
        eb.footerText = COALESCE($footerText, eb.footerText),
        eb.updatedAt = datetime()
      RETURN eb.id as id
    `;
    const result = await session.run(query, {
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || "#f97316",
      secondaryColor: data.secondaryColor || "#ea580c",
      companyName: data.companyName || "AzVirt",
      footerText: data.footerText || null
    });
    return result.records[0]?.get("id").toNumber() || 0;
  } finally {
    await session.close();
  }
}
async function createAiConversation(data) {
  const session = getSession();
  try {
    const query = `
      CREATE (c:AiConversation {
        id: toInteger(timestamp()),
        userId: $userId,
        title: $title,
        modelName: $modelName,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH c
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_CONVERSATION]->(c)
      RETURN c.id as id
    `;
    const result = await session.run(query, {
      userId: data.userId,
      title: data.title || "New Conversation",
      modelName: data.modelName || null
    });
    return result.records[0]?.get("id").toNumber();
  } finally {
    await session.close();
  }
}
async function getAiConversations(userId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (c:AiConversation {userId: $userId})
      RETURN c
      ORDER BY c.updatedAt DESC
    `, { userId });
    return result.records.map((r) => recordToObj(r, "c"));
  } finally {
    await session.close();
  }
}
async function deleteAiConversation(conversationId) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (c:AiConversation {id: $conversationId})
      OPTIONAL MATCH (c)-[:HAS_MESSAGE]->(m:AiMessage)
      DETACH DELETE c, m
    `, { conversationId });
  } finally {
    await session.close();
  }
}
async function createAiMessage(data) {
  const session = getSession();
  try {
    const query = `
      MATCH (c:AiConversation {id: $conversationId})
      CREATE (m:AiMessage {
        id: toInteger(timestamp()),
        conversationId: $conversationId,
        role: $role,
        content: $content,
        model: $model,
        audioUrl: $audioUrl,
        imageUrl: $imageUrl,
        thinkingProcess: $thinkingProcess,
        toolCalls: $toolCalls,
        metadata: $metadata,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (c)-[:HAS_MESSAGE]->(m)
      SET c.updatedAt = datetime()
      RETURN m.id as id
    `;
    const result = await session.run(query, {
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      model: data.model || null,
      audioUrl: data.audioUrl || null,
      imageUrl: data.imageUrl || null,
      thinkingProcess: data.thinkingProcess || null,
      toolCalls: data.toolCalls || null,
      metadata: data.metadata || null
    });
    return result.records[0]?.get("id").toNumber();
  } finally {
    await session.close();
  }
}
async function getAiMessages(conversationId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (c:AiConversation {id: $conversationId})-[:HAS_MESSAGE]->(m:AiMessage)
      RETURN m
      ORDER BY m.createdAt ASC
    `, { conversationId });
    return result.records.map((r) => recordToObj(r, "m"));
  } finally {
    await session.close();
  }
}
async function getOverdueTasks(userId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (t:DailyTask {userId: $userId})
      WHERE t.dueDate < datetime() AND t.status <> 'completed'
      RETURN t 
      ORDER BY t.dueDate
    `, { userId });
    return result.records.map((r) => recordToObj(r, "t"));
  } finally {
    await session.close();
  }
}
async function getNotifications(userId, limit = 50) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {userId: $userId})
      RETURN n 
      ORDER BY n.createdAt DESC
      LIMIT toInteger($limit)
    `, { userId, limit });
    return result.records.map((r) => recordToObj(r, "n"));
  } finally {
    await session.close();
  }
}
async function getUnreadNotifications(userId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (n:TaskNotification {userId: $userId})
      WHERE n.status <> 'read'
      RETURN n 
      ORDER BY n.createdAt DESC
    `, { userId });
    return result.records.map((r) => recordToObj(r, "n"));
  } finally {
    await session.close();
  }
}
async function markNotificationAsRead(notificationId) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (n:TaskNotification {id: $notificationId})
      SET n.status = 'read', n.readAt = datetime(), n.updatedAt = datetime()
    `, { notificationId });
  } finally {
    await session.close();
  }
}
async function getOrCreateNotificationPreferences(userId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})
      MERGE (u)-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      ON CREATE SET
        np.id = toInteger(timestamp()),
        np.userId = $userId,
        np.emailEnabled = true,
        np.smsEnabled = false,
        np.inAppEnabled = true,
        np.overdueReminders = true,
        np.completionNotifications = true,
        np.assignmentNotifications = true,
        np.statusChangeNotifications = true,
        np.timezone = 'UTC',
        np.createdAt = datetime(),
        np.updatedAt = datetime()
      RETURN np
    `, { userId });
    return recordToObj(result.records[0], "np");
  } finally {
    await session.close();
  }
}
async function updateNotificationPreferences(userId, preferences) {
  const session = getSession();
  try {
    let sets = [];
    let params = { userId };
    Object.keys(preferences).forEach((key) => {
      if (key === "id" || key === "userId") return;
      sets.push(`np.${key} = $${key}`);
      params[key] = preferences[key];
    });
    if (sets.length === 0) return;
    sets.push("np.updatedAt = datetime()");
    await session.run(`
      MATCH (u:User {id: $userId})-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      SET ${sets.join(", ")}
    `, params);
  } finally {
    await session.close();
  }
}
async function getNotificationPreferences(userId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $userId})-[:HAS_PREFERENCES]->(np:NotificationPreferences)
      RETURN np
    `, { userId });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], "np");
  } finally {
    await session.close();
  }
}
async function getNotificationHistoryByUser(userId, days = 30) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (h:NotificationHistory {userId: $userId})
      WHERE h.sentAt >= datetime() - duration({days: $days})
      RETURN h 
      ORDER BY h.sentAt DESC
    `, { userId, days });
    return result.records.map((r) => recordToObj(r, "h"));
  } finally {
    await session.close();
  }
}
async function getNotificationTemplates(limit = 50, offset = 0) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (nt:NotificationTemplate) 
      RETURN nt 
      ORDER BY nt.createdAt DESC 
      SKIP toInteger($offset) 
      LIMIT toInteger($limit)
    `, { limit, offset });
    return result.records.map((r) => recordToObj(r, "nt"));
  } finally {
    await session.close();
  }
}
async function getNotificationTemplate(id) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (nt:NotificationTemplate {id: $id}) RETURN nt", { id });
    if (result.records.length === 0) return void 0;
    return recordToObj(result.records[0], "nt");
  } finally {
    await session.close();
  }
}
async function createNotificationTemplate(data) {
  const session = getSession();
  try {
    const query = `
      CREATE (nt:NotificationTemplate {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        subject: $subject,
        bodyText: $bodyText,
        bodyHtml: $bodyHtml,
        channels: $channels,
        variables: $variables,
        tags: $tags,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH nt
      MATCH (u:User {id: $createdBy})
      MERGE (u)-[:CREATED_TEMPLATE]->(nt)
      RETURN nt.id as id
    `;
    const result = await session.run(query, {
      createdBy: data.createdBy,
      name: data.name,
      description: data.description || null,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml || null,
      channels: JSON.stringify(data.channels),
      variables: data.variables ? JSON.stringify(data.variables) : null,
      tags: data.tags ? JSON.stringify(data.tags) : null
    });
    return { insertId: result.records[0]?.get("id").toNumber() };
  } finally {
    await session.close();
  }
}
async function updateNotificationTemplate(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (["channels", "variables", "tags"].includes(key) && typeof data[key] !== "string") {
        sets.push(`nt.${key} = $${key}`);
        params[key] = JSON.stringify(data[key]);
      } else {
        sets.push(`nt.${key} = $${key}`);
        params[key] = data[key];
      }
    });
    if (sets.length === 0) return;
    sets.push("nt.updatedAt = datetime()");
    await session.run(`MATCH (nt:NotificationTemplate {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function deleteNotificationTemplate(id) {
  const session = getSession();
  try {
    await session.run("MATCH (nt:NotificationTemplate {id: $id}) DETACH DELETE nt", { id });
  } finally {
    await session.close();
  }
}
async function getNotificationTriggers(limit = 50, offset = 0) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger) 
      RETURN tr 
      ORDER BY tr.createdAt DESC 
      SKIP toInteger($offset) 
      LIMIT toInteger($limit)
    `, { limit, offset });
    return result.records.map((r) => recordToObj(r, "tr"));
  } finally {
    await session.close();
  }
}
async function getNotificationTrigger(id) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (tr:NotificationTrigger {id: $id}) RETURN tr", { id });
    if (result.records.length === 0) return void 0;
    return recordToObj(result.records[0], "tr");
  } finally {
    await session.close();
  }
}
async function getTriggersByEventType(eventType) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (tr:NotificationTrigger {eventType: $eventType})
      RETURN tr 
      ORDER BY tr.createdAt DESC
    `, { eventType });
    return result.records.map((r) => recordToObj(r, "tr"));
  } finally {
    await session.close();
  }
}
async function createNotificationTrigger(data) {
  const session = getSession();
  try {
    const query = `
      CREATE (tr:NotificationTrigger {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        eventType: $eventType,
        triggerCondition: $triggerCondition,
        actions: $actions,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH tr
      MATCH (nt:NotificationTemplate {id: $templateId})
      MATCH (u:User {id: $createdBy})
      MERGE (tr)-[:USES_TEMPLATE]->(nt)
      MERGE (u)-[:CREATED_TRIGGER]->(tr)
      RETURN tr.id as id
    `;
    const result = await session.run(query, {
      createdBy: data.createdBy,
      templateId: data.templateId,
      name: data.name,
      description: data.description || null,
      eventType: data.eventType,
      triggerCondition: JSON.stringify(data.triggerCondition),
      actions: JSON.stringify(data.actions)
    });
    return { insertId: result.records[0]?.get("id").toNumber() };
  } finally {
    await session.close();
  }
}
async function updateNotificationTrigger(id, data) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(data).forEach((key) => {
      if (key === "id") return;
      if (["triggerCondition", "actions"].includes(key) && typeof data[key] !== "string") {
        sets.push(`tr.${key} = $${key}`);
        params[key] = JSON.stringify(data[key]);
      } else {
        sets.push(`tr.${key} = $${key}`);
        params[key] = data[key];
      }
    });
    if (sets.length === 0) return;
    sets.push("tr.updatedAt = datetime()");
    await session.run(`MATCH (tr:NotificationTrigger {id: $id}) SET ${sets.join(", ")}`, params);
  } finally {
    await session.close();
  }
}
async function deleteNotificationTrigger(id) {
  const session = getSession();
  try {
    await session.run("MATCH (tr:NotificationTrigger {id: $id}) DETACH DELETE tr", { id });
  } finally {
    await session.close();
  }
}
async function recordTriggerExecution(data) {
  const session = getSession();
  try {
    const query = `
      CREATE (te:TriggerExecutionLog {
        id: toInteger(timestamp()),
        triggerId: $triggerId,
        entityType: $entityType,
        entityId: $entityId,
        conditionsMet: $conditionsMet,
        notificationsSent: $notificationsSent,
        error: $error,
        executedAt: datetime()
      })
      WITH te
      MATCH (tr:NotificationTrigger {id: $triggerId})
      MERGE (tr)-[:HAS_EXECUTION]->(te)
    `;
    await session.run(query, {
      triggerId: data.triggerId,
      entityType: data.entityType,
      entityId: data.entityId,
      conditionsMet: data.conditionsMet,
      notificationsSent: data.notificationsSent,
      error: data.error || null
    });
  } finally {
    await session.close();
  }
}
async function updateUserLanguagePreference(userId, language) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (u:User {id: $userId})
      SET u.languagePreference = $language, u.updatedAt = datetime()
    `, { userId, language });
    return true;
  } catch (error) {
    console.error("Failed to update language preference:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function createShift(shift) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})
      CREATE (s:Shift {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        projectId: $projectId,
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        breakDuration: $breakDuration,
        notes: $notes,
        status: $status,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_SHIFT]->(s)
      WITH s
      OPTIONAL MATCH (p:Project {id: $projectId})
      FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
        MERGE (s)-[:FOR_PROJECT]->(p)
      )
      RETURN s.id as id
    `;
    const result = await session.run(query, {
      employeeId: shift.employeeId,
      projectId: shift.projectId || null,
      startTime: new Date(shift.startTime).toISOString(),
      endTime: shift.endTime ? new Date(shift.endTime).toISOString() : null,
      breakDuration: shift.breakDuration || 0,
      notes: shift.notes || null,
      status: shift.status || "scheduled"
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to create shift:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function getAllShifts() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (s:Shift)
      RETURN s 
      ORDER BY s.startTime DESC
    `);
    return result.records.map((r) => recordToObj(r, "s"));
  } catch (error) {
    console.error("Failed to get all shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getShiftsByEmployee(employeeId, startDate, endDate) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s 
      ORDER BY s.startTime DESC
    `, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map((r) => recordToObj(r, "s"));
  } catch (error) {
    console.error("Failed to get shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function updateShift(id, updates) {
  const session = getSession();
  try {
    let sets = [];
    let params = { id };
    Object.keys(updates).forEach((key) => {
      if (key === "id") return;
      if (["startTime", "endTime"].includes(key)) {
        sets.push(`s.${key} = datetime($${key})`);
        params[key] = new Date(updates[key]).toISOString();
      } else {
        sets.push(`s.${key} = $${key}`);
        params[key] = updates[key];
      }
    });
    if (sets.length === 0) return true;
    sets.push("s.updatedAt = datetime()");
    await session.run(`MATCH (s:Shift {id: $id}) SET ${sets.join(", ")}`, params);
    return true;
  } catch (error) {
    console.error("Failed to update shift:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getShiftById(id) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (s:Shift {id: $id}) RETURN s", { id });
    if (result.records.length === 0) return null;
    return recordToObj(result.records[0], "s");
  } catch (error) {
    console.error("Failed to get shift by id:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function createShiftTemplate(template) {
  const session = getSession();
  try {
    const query = `
      CREATE (st:ShiftTemplate {
        id: toInteger(timestamp()),
        name: $name,
        startTime: $startTime,
        endTime: $endTime,
        duration: $duration,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN st.id as id
    `;
    const result = await session.run(query, {
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      duration: template.duration,
      createdBy: template.createdBy
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to create shift template:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function getShiftTemplates() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (st:ShiftTemplate {isActive: true})
      RETURN st
      ORDER BY st.name
    `);
    return result.records.map((r) => recordToObj(r, "st"));
  } catch (error) {
    console.error("Failed to get shift templates:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function setEmployeeAvailability(availability) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (u:User {id: $employeeId})-[r:HAS_AVAILABILITY]->(ea:EmployeeAvailability {dayOfWeek: $dayOfWeek})
      DELETE r, ea
    `, { employeeId: availability.employeeId, dayOfWeek: availability.dayOfWeek });
    const query = `
      MATCH (u:User {id: $employeeId})
      CREATE (ea:EmployeeAvailability {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        dayOfWeek: $dayOfWeek,
        startTime: $startTime,
        endTime: $endTime,
        isAvailable: $isAvailable,
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_AVAILABILITY]->(ea)
    `;
    await session.run(query, {
      employeeId: availability.employeeId,
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      isAvailable: availability.isAvailable !== void 0 ? availability.isAvailable : true
    });
    return true;
  } catch (error) {
    console.error("Failed to set employee availability:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getEmployeeAvailability(employeeId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_AVAILABILITY]->(ea:EmployeeAvailability)
      RETURN ea
      ORDER BY ea.dayOfWeek
    `, { employeeId });
    return result.records.map((r) => recordToObj(r, "ea"));
  } catch (error) {
    console.error("Failed to get employee availability:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function logComplianceAudit(audit) {
  const session = getSession();
  try {
    const query = `
      CREATE (ca:ComplianceAuditTrail {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        eventType: $eventType,
        description: $description,
        auditDate: datetime($auditDate),
        severity: $severity,
        metadata: $metadata,
        createdAt: datetime()
      })
      WITH ca
      MATCH (u:User {id: $employeeId})
      MERGE (u)-[:HAS_COMPLIANCE_EVENT]->(ca)
    `;
    await session.run(query, {
      employeeId: audit.employeeId,
      eventType: audit.eventType,
      description: audit.description || null,
      auditDate: new Date(audit.auditDate).toISOString(),
      severity: audit.severity || "info",
      metadata: audit.metadata ? JSON.stringify(audit.metadata) : null
    });
    return true;
  } catch (error) {
    console.error("Failed to log compliance audit:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getComplianceAudits(employeeId, startDate, endDate) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_COMPLIANCE_EVENT]->(ca:ComplianceAuditTrail)
      WHERE ca.auditDate >= datetime($startDate) AND ca.auditDate <= datetime($endDate)
      RETURN ca
      ORDER BY ca.auditDate DESC
    `, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map((r) => recordToObj(r, "ca"));
  } catch (error) {
    console.error("Failed to get compliance audits:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function recordBreak(breakRecord) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $shiftId})
      CREATE (b:BreakRecord {
        id: toInteger(timestamp()),
        shiftId: $shiftId,
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        duration: $duration,
        type: $type,
        createdAt: datetime()
      })
      MERGE (s)-[:HAS_BREAK]->(b)
    `;
    await session.run(query, {
      shiftId: breakRecord.shiftId,
      startTime: new Date(breakRecord.startTime).toISOString(),
      endTime: breakRecord.endTime ? new Date(breakRecord.endTime).toISOString() : null,
      duration: breakRecord.duration || 0,
      type: breakRecord.type || "standard"
    });
    return true;
  } catch (error) {
    console.error("Failed to record break:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getBreakRules(jurisdiction) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (br:BreakRule {jurisdiction: $jurisdiction})
      RETURN br
    `, { jurisdiction });
    return result.records.map((r) => recordToObj(r, "br"));
  } catch (error) {
    console.error("Failed to get break rules:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function cacheOfflineEntry(cache) {
  const session = getSession();
  try {
    const query = `
      CREATE (toc:TimesheetOfflineCache {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        data: $data,
        capturedAt: datetime($capturedAt),
        syncStatus: $syncStatus,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      WITH toc
      MATCH (u:User {id: $employeeId})
      MERGE (u)-[:HAS_OFFLINE_ENTRY]->(toc)
    `;
    await session.run(query, {
      employeeId: cache.employeeId,
      data: JSON.stringify(cache.data),
      capturedAt: new Date(cache.capturedAt).toISOString(),
      syncStatus: cache.syncStatus || "pending"
    });
    return true;
  } catch (error) {
    console.error("Failed to cache offline entry:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getPendingOfflineEntries(employeeId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_OFFLINE_ENTRY]->(toc:TimesheetOfflineCache)
      WHERE toc.syncStatus = 'pending'
      RETURN toc
      ORDER BY toc.capturedAt ASC
    `, { employeeId });
    return result.records.map((r) => recordToObj(r, "toc"));
  } catch (error) {
    console.error("Failed to get pending offline entries:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function updateOfflineSyncStatus(id, status, syncedAt) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (toc:TimesheetOfflineCache {id: $id})
      SET toc.syncStatus = $status, toc.syncedAt = datetime($syncedAt), toc.updatedAt = datetime()
    `, {
      id,
      status,
      syncedAt: syncedAt ? syncedAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    });
    return true;
  } catch (error) {
    console.error("Failed to update offline sync status:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function createJobSite(input) {
  const session = getSession();
  try {
    const query = `
      MATCH (p:Project {id: $projectId})
      CREATE (js:JobSite {
        id: toInteger(timestamp()),
        projectId: $projectId,
        name: $name,
        description: $description,
        latitude: $latitude,
        longitude: $longitude,
        geofenceRadius: $geofenceRadius,
        address: $address,
        isActive: true,
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (p)-[:HAS_JOB_SITE]->(js)
      RETURN js.id as id
    `;
    const result = await session.run(query, {
      projectId: input.projectId,
      name: input.name,
      description: input.description || null,
      latitude: input.latitude,
      longitude: input.longitude,
      geofenceRadius: input.geofenceRadius || 100,
      address: input.address || null,
      createdBy: input.createdBy
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to create job site:", error);
    throw error;
  } finally {
    await session.close();
  }
}
async function getJobSites(projectId) {
  const session = getSession();
  try {
    let query = `MATCH (js:JobSite) WHERE js.isActive = true RETURN js`;
    let params = {};
    if (projectId) {
      query = `MATCH (p:Project {id: $projectId})-[:HAS_JOB_SITE]->(js:JobSite) WHERE js.isActive = true RETURN js`;
      params = { projectId };
    }
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "js"));
  } catch (error) {
    console.error("Failed to get job sites:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function createLocationLog(input) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})
      MATCH (s:Shift {id: $shiftId})
      MATCH (js:JobSite {id: $jobSiteId})
      CREATE (ll:LocationLog {
        id: toInteger(timestamp()),
        shiftId: $shiftId,
        employeeId: $employeeId,
        jobSiteId: $jobSiteId,
        eventType: $eventType,
        latitude: $latitude,
        longitude: $longitude,
        accuracy: $accuracy,
        isWithinGeofence: $isWithinGeofence,
        distanceFromGeofence: $distanceFromGeofence,
        deviceId: $deviceId,
        ipAddress: $ipAddress,
        userAgent: $userAgent,
        timestamp: datetime()
      })
      MERGE (s)-[:HAS_LOCATION_LOG]->(ll)
      MERGE (u)-[:LOGGED_LOCATION]->(ll)
      MERGE (ll)-[:AT_SITE]->(js)
      RETURN ll.id as id
    `;
    const result = await session.run(query, {
      shiftId: input.shiftId,
      employeeId: input.employeeId,
      jobSiteId: input.jobSiteId,
      eventType: input.eventType,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy || null,
      isWithinGeofence: input.isWithinGeofence,
      distanceFromGeofence: input.distanceFromGeofence || null,
      deviceId: input.deviceId || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to create location log:", error);
    throw error;
  } finally {
    await session.close();
  }
}
async function recordGeofenceViolation(input) {
  const session = getSession();
  try {
    const query = `
      MATCH (ll:LocationLog {id: $locationLogId})
      MATCH (u:User {id: $employeeId})
      MATCH (js:JobSite {id: $jobSiteId})
      CREATE (gv:GeofenceViolation {
        id: toInteger(timestamp()),
        locationLogId: $locationLogId,
        employeeId: $employeeId,
        jobSiteId: $jobSiteId,
        violationType: $violationType,
        distanceFromGeofence: $distanceFromGeofence,
        severity: $severity,
        isResolved: false,
        timestamp: datetime()
      })
      MERGE (ll)-[:HAS_VIOLATION]->(gv)
      MERGE (u)-[:COMMITTED_VIOLATION]->(gv)
      MERGE (gv)-[:AT_SITE]->(js)
      RETURN gv.id as id
    `;
    const result = await session.run(query, {
      locationLogId: input.locationLogId,
      employeeId: input.employeeId,
      jobSiteId: input.jobSiteId,
      violationType: input.violationType,
      distanceFromGeofence: input.distanceFromGeofence,
      severity: input.severity || "warning"
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to record geofence violation:", error);
    throw error;
  } finally {
    await session.close();
  }
}
async function getLocationHistory(employeeId, limit = 50) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:LOGGED_LOCATION]->(ll:LocationLog)
      RETURN ll
      ORDER BY ll.timestamp DESC
      LIMIT toInteger($limit)
    `, { employeeId, limit });
    return result.records.map((r) => recordToObj(r, "ll"));
  } catch (error) {
    console.error("Failed to get location history:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getGeofenceViolations(employeeId, resolved) {
  const session = getSession();
  try {
    let query = `MATCH (gv:GeofenceViolation)`;
    let whereClauses = [];
    let params = {};
    if (employeeId) {
      whereClauses.push(`gv.employeeId = $employeeId`);
      params.employeeId = employeeId;
    }
    if (resolved !== void 0) {
      whereClauses.push(`gv.isResolved = $resolved`);
      params.resolved = resolved;
    }
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    query += ` RETURN gv ORDER BY gv.timestamp DESC`;
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj(r, "gv"));
  } catch (error) {
    console.error("Failed to get geofence violations:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function resolveGeofenceViolation(violationId, resolvedBy, notes) {
  const session = getSession();
  try {
    await session.run(`
      MATCH (gv:GeofenceViolation {id: $violationId})
      SET gv.isResolved = true, 
          gv.resolvedBy = $resolvedBy, 
          gv.resolutionNotes = $notes, 
          gv.resolvedAt = datetime()
    `, { violationId, resolvedBy, notes });
    return true;
  } catch (error) {
    console.error("Failed to resolve geofence violation:", error);
    return false;
  } finally {
    await session.close();
  }
}

// server/_core/clerk.ts
var clerk = clerkClient;
var clerkAuthMiddleware = requireAuth();
async function syncClerkUser(req) {
  try {
    const { userId } = req.auth;
    if (!userId) {
      throw new Error("No user ID found in Clerk session");
    }
    const clerkUser = await clerk.users.getUser(userId);
    if (!clerkUser) {
      throw new Error("User not found in Clerk");
    }
    const userData = {
      openId: userId,
      name: clerkUser.firstName && clerkUser.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser.username || `user_${userId}`,
      email: clerkUser.emailAddresses[0]?.emailAddress || null,
      loginMethod: "clerk",
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    await upsertUser(userData);
    const user2 = await getUserByOpenId(userId);
    if (!user2) {
      throw new Error("Failed to retrieve user after upsert");
    }
    return user2;
  } catch (error) {
    console.error("[Clerk] Error syncing user:", error);
    throw error;
  }
}
function registerClerkRoutes(app) {
  app.post("/api/clerk/webhook", async (req, res) => {
    try {
      const svixId = req.headers["svix-id"];
      const svixTimestamp = req.headers["svix-timestamp"];
      const svixSignature = req.headers["svix-signature"];
      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: "Missing webhook headers" });
      }
      const payload = req.body;
      if (payload.type === "user.created" || payload.type === "user.updated") {
        const userId = payload.data.id;
        try {
          const clerkUser = await clerk.users.getUser(userId);
          const userData = {
            openId: userId,
            name: clerkUser.firstName && clerkUser.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser.username || `user_${userId}`,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            loginMethod: "clerk",
            lastSignedIn: /* @__PURE__ */ new Date()
          };
          await upsertUser(userData);
        } catch (error) {
          console.error("[Clerk Webhook] Error syncing user:", error);
        }
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Clerk Webhook] Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app.get("/api/clerk/health", (req, res) => {
    res.json({ status: "healthy", clerk: "ready" });
  });
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
init_notification();
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z15 } from "zod";

// server/storage.ts
init_env();
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

// server/routers.ts
import { nanoid } from "nanoid";

// server/routers/aiAssistant.ts
import { z as z2 } from "zod";

// server/_core/ollama.ts
import axios from "axios";
var OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
var OllamaService = class {
  client;
  constructor() {
    this.client = axios.create({
      baseURL: OLLAMA_BASE_URL,
      timeout: 3e5,
      // 5 minutes for large model responses
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Chat with Ollama model (streaming or non-streaming)
   */
  async chat(model, messages, options) {
    const requestBody = {
      model,
      messages,
      stream: options?.stream ?? false,
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        top_k: options?.top_k ?? 40,
        num_predict: options?.num_predict ?? -1
      }
    };
    if (options?.stream) {
      return this.streamChat(requestBody);
    }
    const response = await this.client.post("/api/chat", requestBody);
    return response.data;
  }
  /**
   * Stream chat responses
   */
  async *streamChat(requestBody) {
    const response = await this.client.post("/api/chat", requestBody, {
      responseType: "stream"
    });
    const stream = response.data;
    let buffer = "";
    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            yield data;
          } catch (e) {
            console.error("Failed to parse Ollama stream chunk:", e);
          }
        }
      }
    }
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        yield data;
      } catch (e) {
        console.error("Failed to parse final Ollama chunk:", e);
      }
    }
  }
  /**
   * Generate completion (simpler interface for single prompts)
   */
  async generate(model, prompt, options) {
    const requestBody = {
      model,
      prompt,
      stream: options?.stream ?? false,
      images: options?.images,
      system: options?.system
    };
    const response = await this.client.post("/api/generate", requestBody);
    return response.data;
  }
  /**
   * List all available models
   */
  async listModels() {
    try {
      const response = await this.client.get("/api/tags");
      return response.data.models || [];
    } catch (error) {
      console.error("Failed to list Ollama models:", error);
      return [];
    }
  }
  /**
   * Get model information
   */
  async showModel(modelName) {
    try {
      const response = await this.client.post("/api/show", {
        name: modelName
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get info for model ${modelName}:`, error);
      return null;
    }
  }
  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName, onProgress) {
    try {
      const response = await this.client.post(
        "/api/pull",
        { name: modelName, stream: true },
        { responseType: "stream" }
      );
      const stream = response.data;
      let buffer = "";
      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (onProgress) {
                onProgress(data);
              }
              if (data.status === "success") {
                return true;
              }
            } catch (e) {
              console.error("Failed to parse pull progress:", e);
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      return false;
    }
  }
  /**
   * Delete a model
   */
  async deleteModel(modelName) {
    try {
      await this.client.delete("/api/delete", {
        data: { name: modelName }
      });
      return true;
    } catch (error) {
      console.error(`Failed to delete model ${modelName}:`, error);
      return false;
    }
  }
  /**
   * Check if Ollama is running
   */
  async isAvailable() {
    try {
      await this.client.get("/");
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Analyze image with vision model
   */
  async analyzeImage(model, imageBase64, prompt) {
    const messages = [
      {
        role: "user",
        content: prompt,
        images: [imageBase64]
      }
    ];
    const response = await this.chat(model, messages);
    return response.message.content;
  }
};
var ollamaService = new OllamaService();

// server/_core/aiTools.ts
import { like, eq, and, gte, lte, desc } from "drizzle-orm";
var searchMaterialsTool = {
  name: "search_materials",
  description: "Search materials inventory by name or check stock levels. Returns current stock, supplier info, and low stock warnings.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: 'Material name to search for (e.g., "cement", "gravel")'
      },
      checkLowStock: {
        type: "boolean",
        description: "If true, returns only materials below minimum stock level"
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    let query = db2.select().from(materials);
    if (params.query) {
      query = query.where(like(materials.name, `%${params.query}%`));
    }
    const results = await query;
    if (params.checkLowStock) {
      return results.filter((m) => m.quantity <= m.minStock);
    }
    return results.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      quantity: m.quantity,
      unit: m.unit,
      minStock: m.minStock,
      supplier: m.supplier,
      isLowStock: m.quantity <= m.minStock,
      isCritical: m.quantity <= m.criticalThreshold
    }));
  }
};
var getDeliveryStatusTool = {
  name: "get_delivery_status",
  description: "Get real-time delivery status, GPS location, and ETA. Can search by delivery ID, project name, or status.",
  parameters: {
    type: "object",
    properties: {
      deliveryId: {
        type: "number",
        description: "Specific delivery ID to lookup"
      },
      projectName: {
        type: "string",
        description: "Project name to filter deliveries"
      },
      status: {
        type: "string",
        description: "Delivery status to filter",
        enum: ["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed"]
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const conditions = [];
    if (params.deliveryId) {
      conditions.push(eq(deliveries.id, params.deliveryId));
    }
    if (params.projectName) {
      conditions.push(like(deliveries.projectName, `%${params.projectName}%`));
    }
    if (params.status) {
      conditions.push(eq(deliveries.status, params.status));
    }
    const results = await db2.select().from(deliveries).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(deliveries.scheduledTime)).limit(10);
    return results.map((d) => ({
      id: d.id,
      projectName: d.projectName,
      concreteType: d.concreteType,
      volume: d.volume,
      status: d.status,
      scheduledTime: d.scheduledTime,
      driverName: d.driverName,
      vehicleNumber: d.vehicleNumber,
      gpsLocation: d.gpsLocation,
      estimatedArrival: d.estimatedArrival,
      notes: d.notes
    }));
  }
};
var searchDocumentsTool = {
  name: "search_documents",
  description: "Search documents by name, category, or project. Returns document metadata and download URLs.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Document name to search for"
      },
      category: {
        type: "string",
        description: "Document category to filter",
        enum: ["contract", "blueprint", "report", "certificate", "invoice", "other"]
      },
      projectId: {
        type: "number",
        description: "Project ID to filter documents"
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const conditions = [];
    if (params.query) {
      conditions.push(like(documents.name, `%${params.query}%`));
    }
    if (params.category) {
      conditions.push(eq(documents.category, params.category));
    }
    if (params.projectId) {
      conditions.push(eq(documents.projectId, params.projectId));
    }
    const results = await db2.select().from(documents).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(documents.createdAt)).limit(20);
    return results.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      category: d.category,
      fileUrl: d.fileUrl,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      createdAt: d.createdAt
    }));
  }
};
var getQualityTestsTool = {
  name: "get_quality_tests",
  description: "Retrieve quality control test results. Can filter by status, test type, or delivery.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Test status to filter",
        enum: ["pass", "fail", "pending"]
      },
      testType: {
        type: "string",
        description: "Type of test to filter",
        enum: ["slump", "strength", "air_content", "temperature", "other"]
      },
      deliveryId: {
        type: "number",
        description: "Delivery ID to get tests for"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 10)"
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const conditions = [];
    if (params.status) {
      conditions.push(eq(qualityTests.status, params.status));
    }
    if (params.testType) {
      conditions.push(eq(qualityTests.testType, params.testType));
    }
    if (params.deliveryId) {
      conditions.push(eq(qualityTests.deliveryId, params.deliveryId));
    }
    const results = await db2.select().from(qualityTests).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(qualityTests.createdAt)).limit(params.limit || 10);
    return results.map((t2) => ({
      id: t2.id,
      testName: t2.testName,
      testType: t2.testType,
      result: t2.result,
      unit: t2.unit,
      status: t2.status,
      testedBy: t2.testedBy,
      complianceStandard: t2.complianceStandard,
      notes: t2.notes,
      createdAt: t2.createdAt
    }));
  }
};
var generateForecastTool = {
  name: "generate_forecast",
  description: "Generate inventory forecast predictions showing when materials will run out and recommended order quantities.",
  parameters: {
    type: "object",
    properties: {
      materialId: {
        type: "number",
        description: "Specific material ID to forecast (optional, forecasts all if not provided)"
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    let query = db2.select().from(forecastPredictions).orderBy(forecastPredictions.daysUntilStockout);
    if (params.materialId) {
      query = query.where(eq(forecastPredictions.materialId, params.materialId));
    }
    const results = await query.limit(20);
    return results.map((f) => ({
      materialId: f.materialId,
      materialName: f.materialName,
      currentStock: f.currentStock,
      dailyConsumptionRate: f.dailyConsumptionRate,
      daysUntilStockout: f.daysUntilStockout,
      predictedRunoutDate: f.predictedRunoutDate,
      recommendedOrderQty: f.recommendedOrderQty,
      confidence: f.confidence,
      status: f.daysUntilStockout && f.daysUntilStockout < 7 ? "critical" : f.daysUntilStockout && f.daysUntilStockout < 14 ? "warning" : "ok"
    }));
  }
};
var calculateStatsTool = {
  name: "calculate_stats",
  description: "Calculate statistics and aggregations (total deliveries, average test results, etc.)",
  parameters: {
    type: "object",
    properties: {
      metric: {
        type: "string",
        description: "Metric to calculate",
        enum: ["total_deliveries", "total_concrete_volume", "qc_pass_rate", "active_projects"]
      },
      startDate: {
        type: "string",
        description: "Start date for filtering (ISO format)"
      },
      endDate: {
        type: "string",
        description: "End date for filtering (ISO format)"
      }
    },
    required: ["metric"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { metric, startDate, endDate } = params;
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(deliveries.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateConditions.push(lte(deliveries.createdAt, new Date(endDate)));
    }
    switch (metric) {
      case "total_deliveries": {
        const results = await db2.select().from(deliveries).where(dateConditions.length > 0 ? and(...dateConditions) : void 0);
        return {
          metric: "total_deliveries",
          value: results.length,
          period: { startDate, endDate }
        };
      }
      case "total_concrete_volume": {
        const results = await db2.select().from(deliveries).where(dateConditions.length > 0 ? and(...dateConditions) : void 0);
        const totalVolume = results.reduce((sum, d) => sum + (d.volume || 0), 0);
        return {
          metric: "total_concrete_volume",
          value: totalVolume,
          unit: "m\xB3",
          period: { startDate, endDate }
        };
      }
      case "qc_pass_rate": {
        const allTests = await db2.select().from(qualityTests);
        const passedTests = allTests.filter((t2) => t2.status === "pass");
        const passRate = allTests.length > 0 ? passedTests.length / allTests.length * 100 : 0;
        return {
          metric: "qc_pass_rate",
          value: Math.round(passRate * 10) / 10,
          unit: "%",
          totalTests: allTests.length,
          passedTests: passedTests.length
        };
      }
      default:
        return { error: "Unknown metric" };
    }
  }
};
var logWorkHoursTool = {
  name: "log_work_hours",
  description: "Log or record work hours for an employee. Use this to track employee working time, overtime, and project assignments.",
  parameters: {
    type: "object",
    properties: {
      employeeId: {
        type: "number",
        description: "ID of the employee"
      },
      projectId: {
        type: "number",
        description: "ID of the project (optional)"
      },
      date: {
        type: "string",
        description: "Date of work in ISO format (YYYY-MM-DD)"
      },
      startTime: {
        type: "string",
        description: "Start time in ISO format"
      },
      endTime: {
        type: "string",
        description: "End time in ISO format (optional if ongoing)"
      },
      workType: {
        type: "string",
        description: "Type of work",
        enum: ["regular", "overtime", "weekend", "holiday"]
      },
      notes: {
        type: "string",
        description: "Additional notes about the work"
      }
    },
    required: ["employeeId", "date", "startTime"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { employeeId, projectId, date, startTime, endTime, workType, notes } = params;
    let hoursWorked = null;
    let overtimeHours = 0;
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      hoursWorked = Math.round(diffMs / (1e3 * 60 * 60));
      if (hoursWorked > 8) {
        overtimeHours = hoursWorked - 8;
      }
    }
    const [result] = await db2.insert(workHours).values({
      employeeId,
      projectId: projectId || null,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      hoursWorked,
      overtimeHours,
      workType: workType || "regular",
      notes: notes || null,
      status: "pending"
    });
    return {
      success: true,
      workHourId: result.insertId,
      hoursWorked,
      overtimeHours,
      message: "Work hours logged successfully"
    };
  }
};
var getWorkHoursSummaryTool = {
  name: "get_work_hours_summary",
  description: "Get summary of work hours for an employee or project. Returns total hours, overtime, and breakdown by work type.",
  parameters: {
    type: "object",
    properties: {
      employeeId: {
        type: "number",
        description: "Filter by employee ID"
      },
      projectId: {
        type: "number",
        description: "Filter by project ID"
      },
      startDate: {
        type: "string",
        description: "Start date for summary (YYYY-MM-DD)"
      },
      endDate: {
        type: "string",
        description: "End date for summary (YYYY-MM-DD)"
      },
      status: {
        type: "string",
        description: "Filter by approval status",
        enum: ["pending", "approved", "rejected"]
      }
    },
    required: []
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { employeeId, projectId, startDate, endDate, status } = params;
    let query = db2.select().from(workHours);
    const conditions = [];
    if (employeeId) conditions.push(eq(workHours.employeeId, employeeId));
    if (projectId) conditions.push(eq(workHours.projectId, projectId));
    if (status) conditions.push(eq(workHours.status, status));
    if (startDate) conditions.push(gte(workHours.date, new Date(startDate)));
    if (endDate) conditions.push(lte(workHours.date, new Date(endDate)));
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const results = await query;
    const totalHours = results.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
    const totalOvertime = results.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const byWorkType = results.reduce((acc, r) => {
      acc[r.workType] = (acc[r.workType] || 0) + (r.hoursWorked || 0);
      return acc;
    }, {});
    return {
      totalEntries: results.length,
      totalHours,
      totalOvertime,
      regularHours: totalHours - totalOvertime,
      byWorkType,
      entries: results.slice(0, 10)
      // Return first 10 entries
    };
  }
};
var logMachineHoursTool = {
  name: "log_machine_hours",
  description: "Log work hours for machinery/equipment. Track equipment usage, operator, and project assignment.",
  parameters: {
    type: "object",
    properties: {
      machineId: {
        type: "number",
        description: "ID of the machine/equipment"
      },
      projectId: {
        type: "number",
        description: "ID of the project (optional)"
      },
      date: {
        type: "string",
        description: "Date of operation (YYYY-MM-DD)"
      },
      startTime: {
        type: "string",
        description: "Start time in ISO format"
      },
      endTime: {
        type: "string",
        description: "End time in ISO format (optional)"
      },
      operatorId: {
        type: "number",
        description: "ID of the operator/employee"
      },
      operatorName: {
        type: "string",
        description: "Name of the operator"
      },
      notes: {
        type: "string",
        description: "Notes about machine operation"
      }
    },
    required: ["machineId", "date", "startTime"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { machineId, projectId, date, startTime, endTime, operatorId, operatorName, notes } = params;
    let hoursWorked = null;
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      hoursWorked = Math.round(diffMs / (1e3 * 60 * 60));
    }
    const [result] = await db2.insert(machineWorkHours).values({
      machineId,
      projectId: projectId || null,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      hoursWorked,
      operatorId: operatorId || null,
      operatorName: operatorName || null,
      notes: notes || null
    });
    return {
      success: true,
      machineWorkHourId: result.insertId,
      hoursWorked,
      message: "Machine hours logged successfully"
    };
  }
};
var updateDocumentTool = {
  name: "update_document",
  description: "Update document metadata such as name, description, category, or project assignment.",
  parameters: {
    type: "object",
    properties: {
      documentId: {
        type: "number",
        description: "ID of the document to update"
      },
      name: {
        type: "string",
        description: "New document name"
      },
      description: {
        type: "string",
        description: "New description"
      },
      category: {
        type: "string",
        description: "Document category",
        enum: ["contract", "blueprint", "report", "certificate", "invoice", "other"]
      },
      projectId: {
        type: "number",
        description: "Assign to project ID"
      }
    },
    required: ["documentId"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { documentId, name, description, category, projectId } = params;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (projectId !== void 0) updates.projectId = projectId;
    await db2.update(documents).set(updates).where(eq(documents.id, documentId));
    return {
      success: true,
      documentId,
      updated: Object.keys(updates).filter((k) => k !== "updatedAt"),
      message: "Document updated successfully"
    };
  }
};
var deleteDocumentTool = {
  name: "delete_document",
  description: "Delete a document from the system. This permanently removes the document record.",
  parameters: {
    type: "object",
    properties: {
      documentId: {
        type: "number",
        description: "ID of the document to delete"
      }
    },
    required: ["documentId"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { documentId } = params;
    await db2.delete(documents).where(eq(documents.id, documentId));
    return {
      success: true,
      documentId,
      message: "Document deleted successfully"
    };
  }
};
var createMaterialTool = {
  name: "create_material",
  description: "Add a new material to inventory. Use this to register new materials for tracking.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Material name"
      },
      category: {
        type: "string",
        description: "Material category",
        enum: ["cement", "aggregate", "admixture", "water", "other"]
      },
      unit: {
        type: "string",
        description: "Unit of measurement (kg, m\xB3, L, etc.)"
      },
      quantity: {
        type: "number",
        description: "Initial quantity"
      },
      minStock: {
        type: "number",
        description: "Minimum stock level for alerts"
      },
      supplier: {
        type: "string",
        description: "Supplier name"
      },
      unitPrice: {
        type: "number",
        description: "Price per unit"
      }
    },
    required: ["name", "unit"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { name, category, unit, quantity, minStock, supplier, unitPrice } = params;
    const [result] = await db2.insert(materials).values({
      name,
      category: category || "other",
      unit,
      quantity: quantity || 0,
      minStock: minStock || 0,
      criticalThreshold: minStock ? Math.floor(minStock * 0.5) : 0,
      supplier: supplier || null,
      unitPrice: unitPrice || null
    });
    return {
      success: true,
      materialId: result.insertId,
      message: `Material "${name}" created successfully`
    };
  }
};
var updateMaterialQuantityTool = {
  name: "update_material_quantity",
  description: "Update the quantity of a material in inventory. Use for stock adjustments, additions, or consumption.",
  parameters: {
    type: "object",
    properties: {
      materialId: {
        type: "number",
        description: "ID of the material"
      },
      quantity: {
        type: "number",
        description: "New quantity value"
      },
      adjustment: {
        type: "number",
        description: "Amount to add (positive) or subtract (negative) from current quantity"
      }
    },
    required: ["materialId"]
  },
  execute: async (params, userId) => {
    const db2 = await getDb2();
    if (!db2) return { error: "Database not available" };
    const { materialId, quantity, adjustment } = params;
    if (quantity !== void 0) {
      await db2.update(materials).set({ quantity, updatedAt: /* @__PURE__ */ new Date() }).where(eq(materials.id, materialId));
      return {
        success: true,
        materialId,
        newQuantity: quantity,
        message: "Material quantity updated"
      };
    } else if (adjustment !== void 0) {
      const [material] = await db2.select().from(materials).where(eq(materials.id, materialId));
      if (!material) {
        return { error: "Material not found" };
      }
      const newQuantity = material.quantity + adjustment;
      await db2.update(materials).set({ quantity: newQuantity, updatedAt: /* @__PURE__ */ new Date() }).where(eq(materials.id, materialId));
      return {
        success: true,
        materialId,
        previousQuantity: material.quantity,
        adjustment,
        newQuantity,
        message: `Material quantity ${adjustment > 0 ? "increased" : "decreased"} by ${Math.abs(adjustment)}`
      };
    }
    return { error: "Either quantity or adjustment must be provided" };
  }
};
var bulkImportTool = {
  name: "bulk_import_data",
  description: "Import bulk data from CSV or Excel files for work hours, materials, or documents.",
  parameters: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the CSV or Excel file to import"
      },
      importType: {
        type: "string",
        enum: ["work_hours", "materials", "documents"],
        description: "Type of data to import"
      },
      sheetName: {
        type: "string",
        description: "Sheet name for Excel files (optional)"
      }
    },
    required: ["filePath", "importType"]
  },
  execute: async (params, userId) => {
    const { filePath, importType } = params;
    if (!filePath || !importType) {
      return { error: "filePath and importType are required" };
    }
    return {
      success: true,
      message: "Use bulkImport procedures to complete the import"
    };
  }
};
var AI_TOOLS = [
  // Read-only tools
  searchMaterialsTool,
  getDeliveryStatusTool,
  searchDocumentsTool,
  getQualityTestsTool,
  generateForecastTool,
  calculateStatsTool,
  // Data manipulation tools
  logWorkHoursTool,
  getWorkHoursSummaryTool,
  logMachineHoursTool,
  updateDocumentTool,
  deleteDocumentTool,
  createMaterialTool,
  updateMaterialQuantityTool,
  // Bulk import tool
  bulkImportTool
];
async function executeTool(toolName, parameters, userId) {
  const tool = AI_TOOLS.find((t2) => t2.name === toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  try {
    const result = await tool.execute(parameters, userId);
    return {
      success: true,
      toolName,
      parameters,
      result
    };
  } catch (error) {
    console.error(`Tool execution failed for ${toolName}:`, error);
    return {
      success: false,
      toolName,
      parameters,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// shared/promptTemplates.ts
var PROMPT_TEMPLATES = [
  // Data Entry & Manipulation Templates
  {
    id: "log-employee-hours",
    category: "inventory",
    title: "Evidentiraj radne sate zaposlenika",
    description: "Zabilje\u017Ei radne sate za zaposlenika sa automatskim ra\u010Dunanjem prekovremenog rada",
    prompt: "Evidentiraj radne sate za zaposlenika ID [broj] na projektu [naziv projekta]. Radio je od [vrijeme po\u010Detka] do [vrijeme kraja] dana [datum]. Tip rada: [regular/overtime/weekend/holiday].",
    icon: "Clock",
    tags: ["radni sati", "zaposlenici", "evidencija"]
  },
  {
    id: "get-hours-summary",
    category: "reports",
    title: "Sa\u017Eetak radnih sati",
    description: "Prika\u017Ei ukupne radne sate za zaposlenika ili projekat",
    prompt: "Prika\u017Ei mi sa\u017Eetak radnih sati za zaposlenika ID [broj] u periodu od [datum po\u010Detka] do [datum kraja]. Uklju\u010Di ukupne sate, prekovremeni rad, i podjelu po tipu rada.",
    icon: "BarChart",
    tags: ["izvje\u0161taj", "radni sati", "sa\u017Eetak"]
  },
  {
    id: "log-machine-hours",
    category: "inventory",
    title: "Evidentiraj rad ma\u0161ine",
    description: "Zabilje\u017Ei sate rada opreme/ma\u0161ine",
    prompt: "Evidentiraj rad ma\u0161ine ID [broj] na projektu [naziv]. Ma\u0161ina je radila od [vrijeme po\u010Detka] do [vrijeme kraja] dana [datum]. Operater: [ime operatera].",
    icon: "Settings",
    tags: ["ma\u0161ine", "oprema", "evidencija"]
  },
  {
    id: "add-new-material",
    category: "inventory",
    title: "Dodaj novi materijal",
    description: "Kreiraj novi materijal u inventaru",
    prompt: 'Dodaj novi materijal u inventar: naziv "[naziv]", kategorija [cement/aggregate/admixture/water/other], jedinica [kg/m\xB3/L], po\u010Detna koli\u010Dina [broj], minimalne zalihe [broj], dobavlja\u010D "[naziv dobavlja\u010Da]", cijena po jedinici [broj].',
    icon: "Plus",
    tags: ["materijal", "inventar", "kreiranje"]
  },
  {
    id: "update-stock-quantity",
    category: "inventory",
    title: "A\u017Euriraj koli\u010Dinu zaliha",
    description: "Promijeni koli\u010Dinu materijala u inventaru",
    prompt: "A\u017Euriraj koli\u010Dinu materijala ID [broj]: postavi na [nova koli\u010Dina] ili dodaj/oduzmi [+/- broj] od trenutne koli\u010Dine.",
    icon: "RefreshCw",
    tags: ["zalihe", "a\u017Euriranje", "inventar"]
  },
  {
    id: "update-document-info",
    category: "reports",
    title: "A\u017Euriraj informacije dokumenta",
    description: "Promijeni naziv, opis, ili kategoriju dokumenta",
    prompt: 'A\u017Euriraj dokument ID [broj]: promijeni naziv na "[novi naziv]", opis na "[novi opis]", kategoriju na [contract/blueprint/report/certificate/invoice/other], i dodijeli projektu ID [broj].',
    icon: "Edit",
    tags: ["dokument", "a\u017Euriranje", "metadata"]
  },
  {
    id: "delete-document",
    category: "reports",
    title: "Obri\u0161i dokument",
    description: "Trajno ukloni dokument iz sistema",
    prompt: "Obri\u0161i dokument ID [broj] iz sistema. Potvrdi brisanje.",
    icon: "Trash2",
    tags: ["dokument", "brisanje", "upravljanje"]
  },
  // Inventory Management Templates (existing)
  {
    id: "check-low-stock",
    category: "inventory",
    title: "Provjeri materijale sa niskim zalihama",
    description: "Prika\u017Ei sve materijale koji su ispod minimalnog nivoa zaliha",
    prompt: "Koji materijali trenutno imaju niske zalihe? Prika\u017Ei mi listu sa trenutnim koli\u010Dinama i minimalnim nivoima.",
    icon: "AlertTriangle",
    tags: ["zalihe", "upozorenje", "materijali"]
  },
  {
    id: "search-material",
    category: "inventory",
    title: "Pretra\u017Ei specifi\u010Dan materijal",
    description: "Prona\u0111i informacije o odre\u0111enom materijalu",
    prompt: "Prika\u017Ei mi sve informacije o [naziv materijala] - trenutnu koli\u010Dinu, dobavlja\u010Da, cijenu i historiju potro\u0161nje.",
    icon: "Search",
    tags: ["pretraga", "materijal", "detalji"]
  },
  {
    id: "inventory-summary",
    category: "inventory",
    title: "Sa\u017Eetak zaliha",
    description: "Pregled ukupnog stanja zaliha",
    prompt: "Daj mi sa\u017Eetak trenutnog stanja zaliha - ukupan broj materijala, kriti\u010Dni nivoi, i ukupna vrijednost.",
    icon: "ClipboardList",
    tags: ["sa\u017Eetak", "pregled", "zalihe"]
  },
  {
    id: "order-recommendations",
    category: "inventory",
    title: "Preporuke za narud\u017Ebe",
    description: "Dobij preporuke \u0161ta treba naru\u010Diti",
    prompt: "Na osnovu trenutnih zaliha i historije potro\u0161nje, koje materijale trebam naru\u010Diti i u kojim koli\u010Dinama?",
    icon: "ShoppingCart",
    tags: ["narud\u017Eba", "preporuke", "planiranje"]
  },
  // Delivery Management Templates
  {
    id: "active-deliveries",
    category: "deliveries",
    title: "Aktivne isporuke",
    description: "Prika\u017Ei sve trenutno aktivne isporuke",
    prompt: "Prika\u017Ei mi sve aktivne isporuke danas - status, destinaciju, i o\u010Dekivano vrijeme dolaska.",
    icon: "Truck",
    tags: ["isporuke", "aktivno", "pra\u0107enje"]
  },
  {
    id: "delivery-history",
    category: "deliveries",
    title: "Historija isporuka za projekat",
    description: "Pregled svih isporuka za odre\u0111eni projekat",
    prompt: "Prika\u017Ei mi sve isporuke za projekat [naziv projekta] - datume, koli\u010Dine, i status.",
    icon: "History",
    tags: ["historija", "projekat", "isporuke"]
  },
  {
    id: "delivery-performance",
    category: "deliveries",
    title: "Performanse isporuka",
    description: "Analiza efikasnosti isporuka",
    prompt: "Analiziraj performanse isporuka za posljednjih 30 dana - procenat isporuka na vrijeme, ka\u0161njenja, i prosje\u010Dno vrijeme.",
    icon: "BarChart",
    tags: ["performanse", "analiza", "metrike"]
  },
  {
    id: "delayed-deliveries",
    category: "deliveries",
    title: "Zaka\u0161njele isporuke",
    description: "Identifikuj isporuke sa ka\u0161njenjem",
    prompt: "Koje isporuke kasne ili su imale ka\u0161njenja u posljednje vrijeme? Prika\u017Ei razloge i trajanje ka\u0161njenja.",
    icon: "Clock",
    tags: ["ka\u0161njenje", "problemi", "pra\u0107enje"]
  },
  // Quality Control Templates
  {
    id: "recent-tests",
    category: "quality",
    title: "Nedavni testovi kvaliteta",
    description: "Pregled posljednjih testova",
    prompt: "Prika\u017Ei mi rezultate testova kvaliteta iz posljednje sedmice - tip testa, rezultati, i status prolaska.",
    icon: "FlaskConical",
    tags: ["testovi", "kvalitet", "rezultati"]
  },
  {
    id: "failed-tests",
    category: "quality",
    title: "Neuspjeli testovi",
    description: "Identifikuj testove koji nisu pro\u0161li",
    prompt: "Koji testovi kvaliteta nisu pro\u0161li u posljednjih 30 dana? Prika\u017Ei detalje i razloge neuspjeha.",
    icon: "XCircle",
    tags: ["neuspjeh", "problemi", "kvalitet"]
  },
  {
    id: "quality-trends",
    category: "quality",
    title: "Trendovi kvaliteta",
    description: "Analiza trendova u kvalitetu betona",
    prompt: "Analiziraj trendove u kvalitetu betona tokom posljednjih 3 mjeseca - \u010Dvrsto\u0107a, slump test, i stopa prolaska.",
    icon: "TrendingUp",
    tags: ["trendovi", "analiza", "kvalitet"]
  },
  {
    id: "compliance-check",
    category: "quality",
    title: "Provjera uskla\u0111enosti",
    description: "Provjeri uskla\u0111enost sa standardima",
    prompt: "Da li su svi testovi kvaliteta u skladu sa standardima EN 206 i ASTM C94? Prika\u017Ei eventualna odstupanja.",
    icon: "CheckCircle",
    tags: ["uskla\u0111enost", "standardi", "provjera"]
  },
  // Reporting Templates
  {
    id: "weekly-summary",
    category: "reports",
    title: "Sedmi\u010Dni izvje\u0161taj",
    description: "Generi\u0161i sa\u017Eetak sedmice",
    prompt: "Napravi sa\u017Eetak aktivnosti za ovu sedmicu - broj isporuka, potro\u0161nja materijala, testovi kvaliteta, i klju\u010Dni doga\u0111aji.",
    icon: "Calendar",
    tags: ["izvje\u0161taj", "sedmi\u010Dno", "sa\u017Eetak"]
  },
  {
    id: "monthly-report",
    category: "reports",
    title: "Mjese\u010Dni izvje\u0161taj",
    description: "Detaljan mjese\u010Dni pregled",
    prompt: "Generi\u0161i detaljan mjese\u010Dni izvje\u0161taj - ukupne isporuke, potro\u0161nja po materijalu, kvalitet, i finansijski pregled.",
    icon: "FileText",
    tags: ["izvje\u0161taj", "mjese\u010Dno", "detalji"]
  },
  {
    id: "project-summary",
    category: "reports",
    title: "Sa\u017Eetak projekta",
    description: "Pregled specifi\u010Dnog projekta",
    prompt: "Napravi sa\u017Eetak za projekat [naziv projekta] - isporuke, potro\u0161nja materijala, tro\u0161kovi, i status.",
    icon: "Folder",
    tags: ["projekat", "sa\u017Eetak", "pregled"]
  },
  // Analysis Templates
  {
    id: "cost-analysis",
    category: "analysis",
    title: "Analiza tro\u0161kova",
    description: "Analiziraj tro\u0161kove materijala i isporuka",
    prompt: "Analiziraj tro\u0161kove za posljednjih 30 dana - najskuplji materijali, tro\u0161kovi isporuka, i mogu\u0107nosti u\u0161tede.",
    icon: "DollarSign",
    tags: ["tro\u0161kovi", "analiza", "finansije"]
  },
  {
    id: "consumption-patterns",
    category: "analysis",
    title: "Obrasci potro\u0161nje",
    description: "Identifikuj obrasce u potro\u0161nji materijala",
    prompt: "Analiziraj obrasce potro\u0161nje materijala - koji se materijali naj\u010De\u0161\u0107e koriste, sezonske varijacije, i trendovi.",
    icon: "PieChart",
    tags: ["potro\u0161nja", "obrasci", "trendovi"]
  },
  {
    id: "efficiency-metrics",
    category: "analysis",
    title: "Metrike efikasnosti",
    description: "Izra\u010Dunaj klju\u010Dne metrike performansi",
    prompt: "Izra\u010Dunaj klju\u010Dne metrike efikasnosti - iskori\u0161tenost zaliha, vrijeme isporuke, stopa kvaliteta, i produktivnost.",
    icon: "Activity",
    tags: ["metrike", "efikasnost", "KPI"]
  },
  // Forecasting Templates
  {
    id: "demand-forecast",
    category: "forecasting",
    title: "Prognoza potra\u017Enje",
    description: "Predvidi budu\u0107u potra\u017Enju za materijalom",
    prompt: "Na osnovu historijskih podataka, predvidi potra\u017Enju za [naziv materijala] u narednih 30 dana.",
    icon: "LineChart",
    tags: ["prognoza", "potra\u017Enja", "planiranje"]
  },
  {
    id: "stockout-prediction",
    category: "forecasting",
    title: "Predvi\u0111anje nesta\u0161ice",
    description: "Kada \u0107e materijali biti nesta\u0161ici",
    prompt: "Koji materijali \u0107e biti u nesta\u0161ici u narednih 14 dana ako se nastavi trenutni tempo potro\u0161nje?",
    icon: "AlertCircle",
    tags: ["nesta\u0161ica", "upozorenje", "prognoza"]
  },
  {
    id: "seasonal-planning",
    category: "forecasting",
    title: "Sezonsko planiranje",
    description: "Planiranje za sezonske varijacije",
    prompt: "Analiziraj sezonske varijacije u potro\u0161nji i daj preporuke za planiranje zaliha za narednu sezonu.",
    icon: "Sun",
    tags: ["sezonsko", "planiranje", "prognoza"]
  },
  {
    id: "import-work-hours-csv",
    category: "bulk_import",
    title: "Uvezi radne sate iz CSV",
    description: "Ucitaj radne sate zaposlenih iz CSV datoteke",
    prompt: "Uvezi radne sate zaposlenih iz CSV datoteke. Datoteka treba da sadrzi kolone: employeeId, date, startTime, endTime, projectId.",
    icon: "FileUp",
    tags: ["radni sati", "csv", "zaposleni", "uvoz"]
  },
  {
    id: "import-materials-excel",
    category: "bulk_import",
    title: "Uvezi materijale iz Excel",
    description: "Ucitaj materijale u inventar iz Excel datoteke",
    prompt: "Uvezi materijale u inventar iz Excel datoteke. Datoteka treba da sadrzi kolone: name, category, unit, quantity, minStock, supplier, unitPrice.",
    icon: "FileUp",
    tags: ["materijali", "excel", "inventar", "uvoz"]
  },
  {
    id: "import-documents-batch",
    category: "bulk_import",
    title: "Uvezi dokumente u batch",
    description: "Ucitaj vise dokumenata odjednom iz CSV datoteke",
    prompt: "Uvezi dokumente u sistem iz CSV datoteke. Datoteka treba da sadrzi kolone: name, fileUrl, fileKey, category, description, projectId.",
    icon: "FileUp",
    tags: ["dokumenti", "csv", "batch", "uvoz"]
  },
  {
    id: "bulk-update-stock",
    category: "bulk_import",
    title: "Masovna azuriranja zaliha",
    description: "Azuriraj kolicine materijala u batch operaciji",
    prompt: "Azuriraj kolicine vise materijala odjednom. Pripremi CSV datoteku sa kolonama: materialId, quantity ili adjustment za relativnu promenu.",
    icon: "RefreshCw",
    tags: ["zalihe", "azuriranje", "batch", "csv"]
  },
  {
    id: "import-quality-tests",
    category: "bulk_import",
    title: "Uvezi rezultate testova",
    description: "Ucitaj rezultate testova kvaliteta iz datoteke",
    prompt: "Uvezi rezultate testova kvalitete iz CSV datoteke. Datoteka treba da sadrzi: materialId, testType, result, date, notes.",
    icon: "FileUp",
    tags: ["testovi", "kvalitet", "csv", "uvoz"]
  },
  {
    id: "bulk-machine-hours",
    category: "bulk_import",
    title: "Uvezi sate masina",
    description: "Ucitaj sate rada masina iz datoteke",
    prompt: "Uvezi sate rada masina iz CSV datoteke. Datoteka treba da sadrzi: machineId, date, startTime, endTime, operatorId, projectId.",
    icon: "FileUp",
    tags: ["masine", "sati", "csv", "uvoz"]
  }
];
function getTemplatesByCategory(category) {
  return PROMPT_TEMPLATES.filter((t2) => t2.category === category);
}
function searchTemplates(query) {
  const lowerQuery = query.toLowerCase();
  return PROMPT_TEMPLATES.filter(
    (t2) => t2.title.toLowerCase().includes(lowerQuery) || t2.description.toLowerCase().includes(lowerQuery) || t2.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) || t2.prompt.toLowerCase().includes(lowerQuery)
  );
}
function getTemplateById(id) {
  return PROMPT_TEMPLATES.find((t2) => t2.id === id);
}

// server/routers/aiAssistant.ts
var aiAssistantRouter = router({
  /**
   * Chat with AI assistant (streaming support)
   */
  chat: protectedProcedure.input(
    z2.object({
      conversationId: z2.number().optional(),
      message: z2.string().min(1, "Message cannot be empty"),
      model: z2.string().default("llama3.2"),
      imageUrl: z2.string().optional(),
      audioUrl: z2.string().optional(),
      useTools: z2.boolean().default(true)
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const availableModels = await ollamaService.listModels();
      if (!availableModels.some((m) => m.name === input.model)) {
        throw new Error(`Model "${input.model}" is not available. Please pull it first or use an available model.`);
      }
      let conversationId = input.conversationId;
      if (!conversationId) {
        conversationId = await createAiConversation({
          userId,
          title: input.message.substring(0, 50),
          modelName: input.model
        });
      } else {
        const conversations = await getAiConversations(userId);
        if (!conversations.some((c) => c.id === conversationId)) {
          throw new Error("Conversation not found or access denied");
        }
      }
      const finalConversationId = conversationId;
      await createAiMessage({
        conversationId: finalConversationId,
        role: "user",
        content: input.message,
        audioUrl: input.audioUrl,
        imageUrl: input.imageUrl
      });
      const history = await getAiMessages(finalConversationId);
      const messages = history.map((msg) => ({
        role: msg.role,
        content: msg.content,
        images: msg.imageUrl ? [msg.imageUrl] : void 0
      }));
      const systemMessage = {
        role: "system",
        content: `You are an AI assistant for AzVirt DMS (Delivery Management System), a concrete production and delivery management platform. You have access to real-time data AND the ability to create, update, and manage business records.

DATA RETRIEVAL TOOLS:
- search_materials: Search and check inventory levels
- get_delivery_status: Track delivery status and history
- search_documents: Find documents and files
- get_quality_tests: Review quality control test results
- generate_forecast: Get inventory forecasting predictions
- calculate_stats: Calculate business metrics and statistics

DATA MANIPULATION TOOLS:
- log_work_hours: Record employee work hours with overtime tracking
- get_work_hours_summary: Get work hours summary for employees/projects
- log_machine_hours: Track equipment/machinery usage hours
- create_material: Add new materials to inventory
- update_material_quantity: Adjust material stock levels
- update_document: Modify document metadata (name, category, project)
- delete_document: Remove documents from the system

CAPABILITIES:
- Answer questions about inventory, deliveries, quality, and operations
- Create and log work hours for employees and machines
- Add new materials and update stock quantities
- Manage document metadata and organization
- Generate reports and calculate business metrics
- Provide forecasts and trend analysis

GUIDELINES:
- Always confirm before deleting or making significant changes
- When logging hours, calculate overtime automatically (>8 hours)
- For stock updates, show previous and new quantities
- Be precise with dates and times (use ISO format)
- Provide clear success/error messages
- Ask for clarification if parameters are ambiguous

Be helpful, accurate, and professional. Use tools to fetch real data and perform requested operations.`
      };
      const response = await ollamaService.chat(
        input.model,
        [systemMessage, ...messages],
        {
          stream: false,
          temperature: 0.7
        }
      );
      if (!response || !response.message || !response.message.content) {
        throw new Error("Invalid response from AI model");
      }
      const assistantMessageId = await createAiMessage({
        conversationId: finalConversationId,
        role: "assistant",
        content: response.message.content,
        model: input.model
      });
      return {
        conversationId: finalConversationId,
        messageId: assistantMessageId,
        content: response.message.content,
        model: input.model
      };
    } catch (error) {
      console.error("AI chat error:", error);
      throw new Error(`Chat failed: ${error.message || "Unknown error"}`);
    }
  }),
  /**
   * Stream chat response (for real-time streaming)
   */
  streamChat: protectedProcedure.input(
    z2.object({
      conversationId: z2.number(),
      message: z2.string(),
      model: z2.string().default("llama3.2")
    })
  ).mutation(async ({ input, ctx }) => {
    return { message: "Streaming not yet implemented. Use chat endpoint." };
  }),
  /**
   * Transcribe voice audio to text
   */
  transcribeVoice: protectedProcedure.input(
    z2.object({
      audioData: z2.string(),
      // base64 encoded audio
      language: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const audioBuffer = Buffer.from(input.audioData, "base64");
      const timestamp2 = Date.now();
      const { url: audioUrl } = await storagePut(
        `voice/${ctx.user.id}/recording-${timestamp2}.webm`,
        audioBuffer,
        "audio/webm"
      );
      const result = await transcribeAudio({
        audioUrl,
        language: input.language || "en"
      });
      if ("error" in result) {
        throw new Error(result.error);
      }
      return {
        text: result.text,
        language: result.language || input.language || "en",
        audioUrl
      };
    } catch (error) {
      console.error("Voice transcription error:", error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }),
  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getAiConversations(ctx.user.id);
  }),
  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure.input(z2.object({ conversationId: z2.number() })).query(async ({ input, ctx }) => {
    const conversations = await getAiConversations(ctx.user.id);
    const conversation = conversations.find((c) => c.id === input.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    return await getAiMessages(input.conversationId);
  }),
  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure.input(
    z2.object({
      title: z2.string().optional(),
      modelName: z2.string().default("llama3.2")
    })
  ).mutation(async ({ input, ctx }) => {
    const conversationId = await createAiConversation({
      userId: ctx.user.id,
      title: input.title || "New Conversation",
      modelName: input.modelName
    });
    return { conversationId };
  }),
  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure.input(z2.object({ conversationId: z2.number() })).mutation(async ({ input, ctx }) => {
    const conversations = await getAiConversations(ctx.user.id);
    const conversation = conversations.find((c) => c.id === input.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    await deleteAiConversation(input.conversationId);
    return { success: true };
  }),
  /**
   * List available Ollama models
   */
  listModels: protectedProcedure.query(async () => {
    try {
      const models = await ollamaService.listModels();
      return models.map((model) => ({
        name: model.name,
        size: model.size,
        modifiedAt: model.modified_at,
        family: model.details?.family || "unknown",
        parameterSize: model.details?.parameter_size || "unknown"
      }));
    } catch (error) {
      console.error("Failed to list models:", error);
      return [];
    }
  }),
  /**
   * Pull a new model from Ollama registry
   */
  pullModel: protectedProcedure.input(z2.object({ modelName: z2.string() })).mutation(async ({ input }) => {
    try {
      const success = await ollamaService.pullModel(input.modelName);
      return { success, message: success ? "Model pulled successfully" : "Failed to pull model" };
    } catch (error) {
      console.error("Failed to pull model:", error);
      return { success: false, message: error.message };
    }
  }),
  /**
   * Delete a model
   */
  deleteModel: protectedProcedure.input(z2.object({ modelName: z2.string() })).mutation(async ({ input }) => {
    try {
      const success = await ollamaService.deleteModel(input.modelName);
      return { success, message: success ? "Model deleted successfully" : "Failed to delete model" };
    } catch (error) {
      console.error("Failed to delete model:", error);
      return { success: false, message: error.message };
    }
  }),
  /**
   * Get all prompt templates
   */
  getTemplates: publicProcedure.query(async () => {
    return PROMPT_TEMPLATES;
  }),
  /**
   * Get templates by category
   */
  getTemplatesByCategory: publicProcedure.input(z2.object({ category: z2.enum(["inventory", "deliveries", "quality", "reports", "analysis", "forecasting", "bulk_import"]) })).query(async ({ input }) => {
    return getTemplatesByCategory(input.category);
  }),
  /**
   * Search templates
   */
  searchTemplates: publicProcedure.input(z2.object({ query: z2.string() })).query(async ({ input }) => {
    return searchTemplates(input.query);
  }),
  /**
   * Get template by ID
   */
  getTemplate: publicProcedure.input(z2.object({ id: z2.string() })).query(async ({ input }) => {
    const template = getTemplateById(input.id);
    if (!template) {
      throw new Error("Template not found");
    }
    return template;
  }),
  /**
   * Execute an agentic tool
   */
  executeTool: protectedProcedure.input(
    z2.object({
      toolName: z2.string(),
      parameters: z2.record(z2.string(), z2.any())
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const result = await executeTool(
        input.toolName,
        input.parameters,
        ctx.user.id
      );
      return result;
    } catch (error) {
      console.error("Tool execution error:", error);
      return {
        success: false,
        toolName: input.toolName,
        parameters: input.parameters,
        error: error.message || "Unknown error"
      };
    }
  })
});

// server/routers/bulkImport.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/fileParser.ts
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";
function parseCSV(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        if (value && !isNaN(Number(value)) && value.trim() !== "") {
          return Number(value);
        }
        return value === "" ? null : value;
      }
    });
    if (records.length === 0) {
      return { success: false, error: "CSV file is empty" };
    }
    const columns = Object.keys(records[0] || {});
    return {
      success: true,
      data: records,
      rowCount: records.length,
      columns
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse CSV"
    };
  }
}
function parseExcel(filePath, sheetName) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return {
        success: false,
        error: `Sheet "${sheetName || workbook.SheetNames[0]}" not found`
      };
    }
    const records = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      blankrows: false
    });
    if (records.length === 0) {
      return { success: false, error: "Excel sheet is empty" };
    }
    const columns = Object.keys(records[0] || {});
    return {
      success: true,
      data: records,
      rowCount: records.length,
      columns
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse Excel"
    };
  }
}
function parseFile(filePath, sheetName) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") {
    return parseCSV(filePath);
  } else if ([".xlsx", ".xls"].includes(ext)) {
    return parseExcel(filePath, sheetName);
  } else {
    return {
      success: false,
      error: `Unsupported file format: ${ext}. Supported: .csv, .xlsx, .xls`
    };
  }
}
function validateRow(row, schema) {
  const errors = [];
  for (const column of schema) {
    const value = row[column.name];
    if (column.required && (value === null || value === void 0 || value === "")) {
      errors.push(`Missing required field: ${column.name}`);
      continue;
    }
    if (value === null || value === void 0 || value === "") {
      continue;
    }
    switch (column.type) {
      case "number":
        if (isNaN(Number(value))) {
          errors.push(`${column.name} must be a number, got: ${value}`);
        }
        break;
      case "date":
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${column.name} must be a valid date, got: ${value}`);
        }
        break;
      case "boolean":
        if (!["true", "false", "1", "0", "yes", "no"].includes(String(value).toLowerCase())) {
          errors.push(`${column.name} must be boolean, got: ${value}`);
        }
        break;
      case "string":
        if (typeof value !== "string" && typeof value !== "number") {
          errors.push(`${column.name} must be a string, got: ${typeof value}`);
        }
        break;
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function transformRow(row, schema) {
  const transformed = { ...row };
  for (const column of schema) {
    if (column.transform && transformed[column.name] !== null && transformed[column.name] !== void 0) {
      try {
        transformed[column.name] = column.transform(transformed[column.name]);
      } catch (error) {
        console.error(`Transform error for ${column.name}:`, error);
      }
    }
  }
  return transformed;
}
async function batchProcess(rows, processor, options = {}) {
  const { batchSize = 100, onProgress, onError } = options;
  const successful = [];
  const failed = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, Math.min(i + batchSize, rows.length));
    const promises = batch.map(async (row, batchIndex) => {
      const rowIndex = i + batchIndex;
      try {
        const result = await processor(row, rowIndex);
        successful.push(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        failed.push({ rowIndex, error: errorMsg });
        onError?.(rowIndex, errorMsg);
      }
      onProgress?.(i + batchIndex + 1, rows.length);
    });
    await Promise.all(promises);
  }
  return {
    successful,
    failed,
    total: rows.length
  };
}

// server/routers/bulkImport.ts
import * as fs2 from "fs";
import * as path2 from "path";
var WORK_HOURS_SCHEMA = [
  { name: "employeeId", type: "number", required: true },
  { name: "date", type: "date", required: true },
  { name: "startTime", type: "string", required: true },
  { name: "endTime", type: "string", required: false },
  { name: "projectId", type: "number", required: false },
  { name: "workType", type: "string", required: false },
  { name: "notes", type: "string", required: false }
];
var MATERIALS_SCHEMA = [
  { name: "name", type: "string", required: true },
  { name: "category", type: "string", required: false },
  { name: "unit", type: "string", required: true },
  { name: "quantity", type: "number", required: false },
  { name: "minStock", type: "number", required: false },
  { name: "supplier", type: "string", required: false },
  { name: "unitPrice", type: "number", required: false }
];
var DOCUMENTS_SCHEMA = [
  { name: "name", type: "string", required: true },
  { name: "fileUrl", type: "string", required: true },
  { name: "fileKey", type: "string", required: true },
  { name: "category", type: "string", required: false },
  { name: "description", type: "string", required: false },
  { name: "projectId", type: "number", required: false }
];
var bulkImportRouter = router({
  /**
   * Upload and preview file
   */
  previewFile: protectedProcedure.input(
    z3.object({
      filePath: z3.string(),
      importType: z3.enum(["work_hours", "materials", "documents"]),
      sheetName: z3.string().optional()
    })
  ).mutation(async ({ input }) => {
    try {
      const { filePath, importType, sheetName } = input;
      if (!fs2.existsSync(filePath)) {
        throw new TRPCError3({
          code: "NOT_FOUND",
          message: "File not found"
        });
      }
      const parseResult = parseFile(filePath, sheetName);
      if (!parseResult.success) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: parseResult.error || "Failed to parse file"
        });
      }
      let schema = [];
      switch (importType) {
        case "work_hours":
          schema = WORK_HOURS_SCHEMA;
          break;
        case "materials":
          schema = MATERIALS_SCHEMA;
          break;
        case "documents":
          schema = DOCUMENTS_SCHEMA;
          break;
      }
      const preview = parseResult.data.slice(0, 5);
      const validationResults = preview.map((row, idx) => ({
        rowIndex: idx + 1,
        valid: validateRow(row, schema).valid,
        errors: validateRow(row, schema).errors
      }));
      return {
        success: true,
        fileName: path2.basename(filePath),
        totalRows: parseResult.rowCount,
        columns: parseResult.columns,
        preview: preview.slice(0, 3),
        validationResults,
        estimatedRecords: parseResult.rowCount
      };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Preview failed"
      });
    }
  }),
  /**
   * Import work hours from file
   */
  importWorkHours: protectedProcedure.input(
    z3.object({
      filePath: z3.string(),
      sheetName: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const { filePath, sheetName } = input;
      const db2 = await getDb();
      if (!db2) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }
      const parseResult = parseFile(filePath, sheetName);
      if (!parseResult.success) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: parseResult.error || "Failed to parse file"
        });
      }
      const rows = parseResult.data;
      let successCount = 0;
      const errors = [];
      await batchProcess(
        rows,
        async (row, index) => {
          const validation = validateRow(row, WORK_HOURS_SCHEMA);
          if (!validation.valid) {
            throw new Error(validation.errors.join("; "));
          }
          const transformed = transformRow(row, WORK_HOURS_SCHEMA);
          let hoursWorked = null;
          let overtimeHours = 0;
          if (transformed.endTime) {
            const start = new Date(transformed.startTime);
            const end = new Date(transformed.endTime);
            const diffMs = end.getTime() - start.getTime();
            hoursWorked = Math.round(diffMs / (1e3 * 60 * 60));
            if (hoursWorked > 8) {
              overtimeHours = hoursWorked - 8;
            }
          }
          const workType = transformed.workType || "regular";
          const validWorkTypes = ["regular", "overtime", "weekend", "holiday"];
          await createWorkHour({
            employeeId: transformed.employeeId,
            projectId: transformed.projectId || null,
            date: new Date(transformed.date).toISOString(),
            startTime: new Date(transformed.startTime).toISOString(),
            endTime: transformed.endTime ? new Date(transformed.endTime).toISOString() : null,
            hoursWorked,
            overtimeHours,
            workType: validWorkTypes.includes(workType) ? workType : "regular",
            notes: transformed.notes || null,
            status: "pending"
          });
          successCount++;
          return { success: true };
        },
        {
          batchSize: 50,
          onError: (rowIndex, error) => {
            errors.push({ rowIndex: rowIndex + 2, error });
          }
        }
      );
      return {
        success: true,
        imported: successCount,
        failed: errors.length,
        total: rows.length,
        errors: errors.slice(0, 10),
        // Return first 10 errors
        message: `Successfully imported ${successCount} work hour records`
      };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Import failed"
      });
    }
  }),
  /**
   * Import materials from file
   */
  importMaterials: protectedProcedure.input(
    z3.object({
      filePath: z3.string(),
      sheetName: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const { filePath, sheetName } = input;
      const db2 = await getDb();
      if (!db2) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }
      const parseResult = parseFile(filePath, sheetName);
      if (!parseResult.success) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: parseResult.error || "Failed to parse file"
        });
      }
      const rows = parseResult.data;
      let successCount = 0;
      const errors = [];
      await batchProcess(
        rows,
        async (row, index) => {
          const validation = validateRow(row, MATERIALS_SCHEMA);
          if (!validation.valid) {
            throw new Error(validation.errors.join("; "));
          }
          const transformed = transformRow(row, MATERIALS_SCHEMA);
          const category = transformed.category || "other";
          const validCategories = ["cement", "aggregate", "admixture", "water", "other"];
          await createMaterial({
            name: transformed.name,
            category: validCategories.includes(category) ? category : "other",
            unit: transformed.unit,
            quantity: transformed.quantity || 0,
            minStock: transformed.minStock || 0,
            criticalThreshold: transformed.minStock ? Math.floor(transformed.minStock * 0.5) : 0,
            supplier: transformed.supplier || null,
            unitPrice: transformed.unitPrice || null
          });
          successCount++;
          return { success: true };
        },
        {
          batchSize: 50,
          onError: (rowIndex, error) => {
            errors.push({ rowIndex: rowIndex + 2, error });
          }
        }
      );
      return {
        success: true,
        imported: successCount,
        failed: errors.length,
        total: rows.length,
        errors: errors.slice(0, 10),
        message: `Successfully imported ${successCount} material records`
      };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Import failed"
      });
    }
  }),
  /**
   * Import documents from file
   */
  importDocuments: protectedProcedure.input(
    z3.object({
      filePath: z3.string(),
      sheetName: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      const { filePath, sheetName } = input;
      const db2 = await getDb();
      if (!db2) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }
      const parseResult = parseFile(filePath, sheetName);
      if (!parseResult.success) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: parseResult.error || "Failed to parse file"
        });
      }
      const rows = parseResult.data;
      let successCount = 0;
      const errors = [];
      await batchProcess(
        rows,
        async (row, index) => {
          const validation = validateRow(row, DOCUMENTS_SCHEMA);
          if (!validation.valid) {
            throw new Error(validation.errors.join("; "));
          }
          const transformed = transformRow(row, DOCUMENTS_SCHEMA);
          const docCategory = transformed.category || "other";
          const validDocCategories = ["contract", "blueprint", "report", "certificate", "invoice", "other"];
          await createDocument({
            name: transformed.name,
            description: transformed.description || null,
            fileKey: transformed.fileKey,
            fileUrl: transformed.fileUrl,
            category: validDocCategories.includes(docCategory) ? docCategory : "other",
            projectId: transformed.projectId || null,
            uploadedBy: ctx.user.id
          });
          successCount++;
          return { success: true };
        },
        {
          batchSize: 50,
          onError: (rowIndex, error) => {
            errors.push({ rowIndex: rowIndex + 2, error });
          }
        }
      );
      return {
        success: true,
        imported: successCount,
        failed: errors.length,
        total: rows.length,
        errors: errors.slice(0, 10),
        message: `Successfully imported ${successCount} document records`
      };
    } catch (error) {
      if (error instanceof TRPCError3) throw error;
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Import failed"
      });
    }
  })
});

// server/routers/notifications.ts
import { z as z4 } from "zod";

// server/_core/notificationService.ts
init_email();
async function sendEmailNotification(recipientEmail, title, message, taskId, notificationType) {
  try {
    if (!recipientEmail) {
      return { success: false, error: "No recipient email provided" };
    }
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">${title}</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Task Notification</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; line-height: 1.6;">${message}</p>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This is an automated notification from AzVirt Document Management System.
            </p>
          </div>
        </div>
      </div>
    `;
    await sendEmail({
      to: recipientEmail,
      subject: title,
      html: htmlContent
    });
    return { success: true };
  } catch (error) {
    console.error("[NotificationService] Email send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function sendSmsNotification(phoneNumber, message) {
  try {
    if (!phoneNumber) {
      return { success: false, error: "No phone number provided" };
    }
    console.log(`[NotificationService] SMS to ${phoneNumber}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error("[NotificationService] SMS send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// server/routers/notifications.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
var notificationsRouter = router({
  // Get all notifications for current user
  getNotifications: protectedProcedure.input(z4.object({ limit: z4.number().default(50).optional() })).query(async ({ ctx, input }) => {
    try {
      const notifications = await getNotifications(ctx.user.id, input.limit);
      return notifications;
    } catch (error) {
      console.error("[Notifications] Failed to fetch notifications:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch notifications"
      });
    }
  }),
  // Get unread notifications count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const unread = await getUnreadNotifications(ctx.user.id);
      return { count: unread.length };
    } catch (error) {
      console.error("[Notifications] Failed to get unread count:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get unread count"
      });
    }
  }),
  // Mark notification as read
  markAsRead: protectedProcedure.input(z4.object({ notificationId: z4.number() })).mutation(async ({ ctx, input }) => {
    try {
      const notifications = await getNotifications(ctx.user.id, 1e3);
      const notification = notifications.find((n) => n.id === input.notificationId);
      if (!notification) {
        throw new TRPCError4({
          code: "NOT_FOUND",
          message: "Notification not found"
        });
      }
      await markNotificationAsRead(input.notificationId);
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      console.error("[Notifications] Failed to mark as read:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to mark notification as read"
      });
    }
  }),
  // Get notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    try {
      let preferences = await getNotificationPreferences(ctx.user.id);
      if (!preferences) {
        await getOrCreateNotificationPreferences(ctx.user.id);
        preferences = await getNotificationPreferences(ctx.user.id);
      }
      return preferences;
    } catch (error) {
      console.error("[Notifications] Failed to get preferences:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get notification preferences"
      });
    }
  }),
  // Update notification preferences
  updatePreferences: protectedProcedure.input(
    z4.object({
      emailEnabled: z4.boolean().optional(),
      smsEnabled: z4.boolean().optional(),
      inAppEnabled: z4.boolean().optional(),
      overdueReminders: z4.boolean().optional(),
      completionNotifications: z4.boolean().optional(),
      assignmentNotifications: z4.boolean().optional(),
      statusChangeNotifications: z4.boolean().optional(),
      quietHoursStart: z4.string().regex(/^\d{2}:\d{2}$/).optional(),
      quietHoursEnd: z4.string().regex(/^\d{2}:\d{2}$/).optional(),
      timezone: z4.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      await updateNotificationPreferences(ctx.user.id, input);
      const updated = await getNotificationPreferences(ctx.user.id);
      return updated;
    } catch (error) {
      console.error("[Notifications] Failed to update preferences:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update notification preferences"
      });
    }
  }),
  // Send test notification
  sendTestNotification: protectedProcedure.input(
    z4.object({
      channel: z4.enum(["email", "sms", "in_app"])
    })
  ).mutation(async ({ ctx, input }) => {
    try {
      const user2 = ctx.user;
      if (input.channel === "email" && !user2.email) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: "User email not configured"
        });
      }
      if (input.channel === "sms" && !user2.phoneNumber) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: "User phone number not configured"
        });
      }
      const testMessage = "This is a test notification from AzVirt DMS";
      const testTitle = "Test Notification";
      let result = { success: false };
      if (input.channel === "email") {
        result = await sendEmailNotification(
          user2.email,
          testTitle,
          testMessage,
          0,
          "test"
        );
      } else if (input.channel === "sms") {
        result = await sendSmsNotification(user2.phoneNumber, testMessage);
      }
      if (!result.success) {
        throw new TRPCError4({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to send test notification"
        });
      }
      return { success: true, message: "Test notification sent" };
    } catch (error) {
      if (error instanceof TRPCError4) throw error;
      console.error("[Notifications] Failed to send test notification:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send test notification"
      });
    }
  }),
  // Get notification history
  getHistory: protectedProcedure.input(z4.object({ days: z4.number().default(30).optional() })).query(async ({ ctx, input }) => {
    try {
      const history = await getNotificationHistoryByUser(
        ctx.user.id,
        input.days
      );
      return history;
    } catch (error) {
      console.error("[Notifications] Failed to get history:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get notification history"
      });
    }
  }),
  // Clear all notifications
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      console.log(`[Notifications] User ${ctx.user.id} cleared all notifications`);
      return { success: true };
    } catch (error) {
      console.error("[Notifications] Failed to clear notifications:", error);
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear notifications"
      });
    }
  })
});

// server/routers/notificationTemplates.ts
import { z as z5 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";
var TEMPLATE_VARIABLES = {
  user: ["{{user.name}}", "{{user.email}}", "{{user.role}}"],
  task: ["{{task.title}}", "{{task.description}}", "{{task.dueDate}}", "{{task.priority}}", "{{task.status}}"],
  material: ["{{material.name}}", "{{material.quantity}}", "{{material.unit}}", "{{material.minStock}}"],
  delivery: ["{{delivery.date}}", "{{delivery.status}}", "{{delivery.supplier}}", "{{delivery.quantity}}"],
  project: ["{{project.name}}", "{{project.status}}", "{{project.startDate}}", "{{project.endDate}}"],
  system: ["{{system.date}}", "{{system.time}}", "{{system.appName}}"]
};
var CONDITION_FIELDS = [
  { id: "material.quantity", label: "Material Quantity", type: "number" },
  { id: "material.minStock", label: "Material Min Stock", type: "number" },
  { id: "task.status", label: "Task Status", type: "select", options: ["pending", "in_progress", "completed", "cancelled"] },
  { id: "task.priority", label: "Task Priority", type: "select", options: ["low", "medium", "high", "urgent"] },
  { id: "task.daysOverdue", label: "Days Overdue", type: "number" },
  { id: "delivery.status", label: "Delivery Status", type: "select", options: ["scheduled", "in_transit", "delivered", "cancelled"] },
  { id: "delivery.daysUntil", label: "Days Until Delivery", type: "number" },
  { id: "order.daysSinceLastOrder", label: "Days Since Last Order", type: "number" },
  { id: "project.status", label: "Project Status", type: "select", options: ["planning", "active", "on_hold", "completed"] }
];
var CONDITION_OPERATORS = [
  { id: "eq", label: "equals", types: ["number", "string", "select"] },
  { id: "neq", label: "not equals", types: ["number", "string", "select"] },
  { id: "gt", label: "greater than", types: ["number"] },
  { id: "gte", label: "greater than or equal", types: ["number"] },
  { id: "lt", label: "less than", types: ["number"] },
  { id: "lte", label: "less than or equal", types: ["number"] },
  { id: "contains", label: "contains", types: ["string"] },
  { id: "startsWith", label: "starts with", types: ["string"] },
  { id: "endsWith", label: "ends with", types: ["string"] }
];
var conditionSchema = z5.object({
  field: z5.string(),
  operator: z5.string(),
  value: z5.union([z5.string(), z5.number()])
});
var conditionGroupSchema = z5.lazy(
  () => z5.object({
    logic: z5.enum(["AND", "OR"]),
    conditions: z5.array(z5.union([conditionSchema, conditionGroupSchema]))
  })
);
var notificationTemplatesRouter = router({
  // Get available condition fields and operators for the condition builder
  getConditionOptions: protectedProcedure.query(async () => {
    return {
      fields: [
        { id: "stock_quantity", label: "Koli\u010Dina na zalihama", type: "number" },
        { id: "stock_threshold", label: "Minimalna zaliha", type: "number" },
        { id: "material_category", label: "Kategorija materijala", type: "select", options: ["cement", "aggregate", "admixture", "steel", "other"] },
        { id: "days_since_order", label: "Dana od zadnje narud\u017Ebe", type: "number" },
        { id: "task_status", label: "Status zadatka", type: "select", options: ["pending", "in_progress", "completed", "overdue"] },
        { id: "task_priority", label: "Prioritet zadatka", type: "select", options: ["low", "medium", "high", "critical"] },
        { id: "days_overdue", label: "Dana ka\u0161njenja", type: "number" },
        { id: "delivery_status", label: "Status isporuke", type: "select", options: ["scheduled", "in_transit", "delivered", "delayed"] },
        { id: "quality_result", label: "Rezultat testa kvaliteta", type: "select", options: ["pass", "fail", "pending"] }
      ],
      operators: [
        { id: "eq", label: "jednako", types: ["string", "number", "select"] },
        { id: "ne", label: "nije jednako", types: ["string", "number", "select"] },
        { id: "gt", label: "ve\u0107e od", types: ["number"] },
        { id: "gte", label: "ve\u0107e ili jednako", types: ["number"] },
        { id: "lt", label: "manje od", types: ["number"] },
        { id: "lte", label: "manje ili jednako", types: ["number"] },
        { id: "contains", label: "sadr\u017Ei", types: ["string"] },
        { id: "starts_with", label: "po\u010Dinje sa", types: ["string"] }
      ]
    };
  }),
  // Get available template variables
  getVariables: protectedProcedure.query(() => {
    return TEMPLATE_VARIABLES;
  }),
  // Template CRUD
  listTemplates: protectedProcedure.query(async () => {
    return await getNotificationTemplates();
  }),
  getTemplate: protectedProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    const template = await getNotificationTemplate(input.id);
    if (!template) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Template not found" });
    }
    return template;
  }),
  createTemplate: protectedProcedure.input(
    z5.object({
      name: z5.string().min(1, "Name is required"),
      description: z5.string().optional(),
      subject: z5.string().min(1, "Subject is required"),
      bodyHtml: z5.string().min(1, "Body is required"),
      bodyText: z5.string().optional(),
      channels: z5.array(z5.enum(["email", "sms", "in_app"])),
      variables: z5.array(z5.string()).optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const result = await createNotificationTemplate({
      name: input.name,
      description: input.description,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText || "",
      channels: input.channels,
      variables: input.variables,
      createdBy: ctx.user.id
    });
    return { success: true, id: result.insertId };
  }),
  updateTemplate: protectedProcedure.input(
    z5.object({
      id: z5.number(),
      name: z5.string().min(1).optional(),
      description: z5.string().optional(),
      subject: z5.string().min(1).optional(),
      bodyHtml: z5.string().min(1).optional(),
      bodyText: z5.string().optional(),
      channels: z5.string().optional(),
      variables: z5.string().optional(),
      isActive: z5.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await updateNotificationTemplate(id, updates);
    return { success: true };
  }),
  deleteTemplate: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    await deleteNotificationTemplate(input.id);
    return { success: true };
  }),
  // Trigger CRUD
  listTriggers: protectedProcedure.query(async () => {
    return await getNotificationTriggers();
  }),
  getTrigger: protectedProcedure.input(z5.object({ id: z5.number() })).query(async ({ input }) => {
    const trigger = await getNotificationTrigger(input.id);
    if (!trigger) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Trigger not found" });
    }
    return trigger;
  }),
  createTrigger: protectedProcedure.input(
    z5.object({
      name: z5.string().min(1, "Name is required"),
      description: z5.string().optional(),
      eventType: z5.string().min(1, "Event type is required"),
      conditions: z5.string(),
      // JSON stringified condition group
      templateId: z5.number(),
      recipients: z5.string(),
      // JSON array of recipient rules
      isActive: z5.boolean().default(true)
    })
  ).mutation(async ({ input, ctx }) => {
    const result = await createNotificationTrigger({
      name: input.name,
      description: input.description,
      eventType: input.eventType,
      templateId: input.templateId,
      triggerCondition: input.conditions,
      actions: input.recipients,
      createdBy: ctx.user.id
    });
    return { success: true, id: result.insertId };
  }),
  updateTrigger: protectedProcedure.input(
    z5.object({
      id: z5.number(),
      name: z5.string().min(1).optional(),
      description: z5.string().optional(),
      eventType: z5.string().optional(),
      conditions: z5.string().optional(),
      templateId: z5.number().optional(),
      recipients: z5.string().optional(),
      isActive: z5.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await updateNotificationTrigger(id, updates);
    return { success: true };
  }),
  deleteTrigger: protectedProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    await deleteNotificationTrigger(input.id);
    return { success: true };
  }),
  // Preview template with sample data
  previewTemplate: protectedProcedure.input(
    z5.object({
      subject: z5.string(),
      bodyHtml: z5.string()
    })
  ).mutation(({ input }) => {
    const sampleData = {
      user: { name: "Marko Petrovi\u0107", email: "marko@azvirt.com", role: "Supervisor" },
      task: { title: "Provjera kvaliteta betona", description: "Uzorkovanje i testiranje", dueDate: "2024-12-20", priority: "high", status: "pending" },
      material: { name: "Cement Portland", quantity: 45, unit: "tona", minStock: 50 },
      delivery: { date: "2024-12-18", status: "scheduled", supplier: "Holcim d.o.o.", quantity: 100 },
      project: { name: "Autoput Sarajevo-Mostar", status: "active", startDate: "2024-01-15", endDate: "2025-06-30" },
      system: { date: (/* @__PURE__ */ new Date()).toLocaleDateString("bs-BA"), time: (/* @__PURE__ */ new Date()).toLocaleTimeString("bs-BA"), appName: "AzVirt DMS" }
    };
    let previewSubject = input.subject;
    let previewBody = input.bodyHtml;
    Object.entries(sampleData).forEach(([category, values]) => {
      Object.entries(values).forEach(([key, value]) => {
        const variable = `{{${category}.${key}}}`;
        previewSubject = previewSubject.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), String(value));
        previewBody = previewBody.replace(new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), String(value));
      });
    });
    return {
      subject: previewSubject,
      bodyHtml: previewBody
    };
  }),
  // Validate condition syntax
  validateConditions: protectedProcedure.input(z5.object({ conditions: z5.string() })).mutation(({ input }) => {
    try {
      const parsed = JSON.parse(input.conditions);
      if (!parsed.logic || !parsed.conditions) {
        return { valid: false, error: "Invalid condition structure" };
      }
      return { valid: true, humanReadable: generateHumanReadable(parsed) };
    } catch (e) {
      return { valid: false, error: "Invalid JSON format" };
    }
  })
});
function generateHumanReadable(group) {
  if (!group.conditions || group.conditions.length === 0) {
    return "No conditions defined";
  }
  const parts = group.conditions.map((cond) => {
    if (cond.logic) {
      return `(${generateHumanReadable(cond)})`;
    }
    const field = CONDITION_FIELDS.find((f) => f.id === cond.field);
    const operator = CONDITION_OPERATORS.find((o) => o.id === cond.operator);
    return `${field?.label || cond.field} ${operator?.label || cond.operator} ${cond.value}`;
  });
  return parts.join(` ${group.logic} `);
}

// server/routers/triggerExecution.ts
import { z as z6 } from "zod";

// server/services/triggerEvaluation.ts
function evaluateCondition(condition, data) {
  const fieldValue = getNestedValue(data, condition.field);
  const compareValue = condition.value;
  switch (condition.operator) {
    case "equals":
      return fieldValue == compareValue;
    // Loose equality for type flexibility
    case "not_equals":
      return fieldValue != compareValue;
    case "greater_than":
      return Number(fieldValue) > Number(compareValue);
    case "less_than":
      return Number(fieldValue) < Number(compareValue);
    case "greater_than_or_equal":
      return Number(fieldValue) >= Number(compareValue);
    case "less_than_or_equal":
      return Number(fieldValue) <= Number(compareValue);
    case "contains":
      return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case "not_contains":
      return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case "starts_with":
      return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
    case "ends_with":
      return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      return false;
  }
}
function evaluateConditionGroup(group, data) {
  if (group.operator === "AND") {
    return group.conditions.every((condition) => evaluateCondition(condition, data));
  } else if (group.operator === "OR") {
    return group.conditions.some((condition) => evaluateCondition(condition, data));
  }
  return false;
}
function evaluateConditions(conditions, data) {
  if (Array.isArray(conditions)) {
    return conditions.every((condition) => evaluateCondition(condition, data));
  }
  if (conditions.groups && Array.isArray(conditions.groups)) {
    const groupResults = conditions.groups.map(
      (group) => evaluateConditionGroup(group, data)
    );
    const topOperator = conditions.operator || "AND";
    if (topOperator === "AND") {
      return groupResults.every((result) => result);
    } else {
      return groupResults.some((result) => result);
    }
  }
  return false;
}
function getNestedValue(obj, path5) {
  return path5.split(".").reduce((current, key) => current?.[key], obj);
}
function substituteVariables(template, data) {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path5) => {
    const value = getNestedValue(data, path5);
    return value !== void 0 ? String(value) : match;
  });
}
async function executeTrigger(triggerId, data) {
  try {
    const trigger = await getNotificationTrigger(triggerId);
    if (!trigger) {
      return { success: false, message: "Trigger not found" };
    }
    if (!trigger.isActive) {
      return { success: false, message: "Trigger is not active" };
    }
    const conditionsMet = evaluateConditions(trigger.triggerCondition, data);
    if (!conditionsMet) {
      return { success: false, message: "Conditions not met" };
    }
    const template = await getNotificationTemplate(trigger.templateId);
    if (!template) {
      return { success: false, message: "Template not found" };
    }
    if (!template.isActive) {
      return { success: false, message: "Template is not active" };
    }
    const subject = substituteVariables(template.subject, data);
    const body = substituteVariables(template.bodyText, data);
    const recipients = await getRecipients(trigger.eventType, data);
    if (recipients.length === 0) {
      return { success: false, message: "No recipients found" };
    }
    let sentCount = 0;
    for (const recipient of recipients) {
      for (const channel of template.channels) {
        try {
          if (channel === "email" && recipient.email) {
            const result = await sendEmailNotification(
              recipient.email,
              subject,
              body,
              0,
              // taskId not applicable for triggers
              "trigger_notification"
            );
            if (result.success) sentCount++;
          } else if (channel === "sms" && recipient.phoneNumber) {
            const result = await sendSmsNotification(
              recipient.phoneNumber,
              `${subject}: ${body}`
            );
            if (result.success) sentCount++;
          } else if (channel === "in_app") {
            console.log(`In-app notification for user ${recipient.id}: ${subject}`);
            sentCount++;
          }
        } catch (error) {
          console.error(`Failed to send ${channel} notification to user ${recipient.id}:`, error);
        }
      }
    }
    await recordTriggerExecution({
      triggerId,
      entityType: trigger.eventType,
      entityId: 0,
      // Generic trigger execution
      conditionsMet: true,
      notificationsSent: sentCount,
      error: void 0
    });
    await updateNotificationTrigger(triggerId, {
      lastExecutedAt: /* @__PURE__ */ new Date()
    });
    return {
      success: true,
      message: `Trigger executed successfully. Sent ${sentCount} notifications to ${recipients.length} recipients.`,
      recipientCount: recipients.length
    };
  } catch (error) {
    console.error("Error executing trigger:", error);
    try {
      const trigger = await getNotificationTrigger(triggerId);
      await recordTriggerExecution({
        triggerId,
        entityType: trigger?.eventType || "unknown",
        entityId: 0,
        conditionsMet: false,
        notificationsSent: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } catch (logError) {
      console.error("Failed to log trigger execution:", logError);
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function getRecipients(triggerType, data) {
  const adminUsers = await getAdminUsersWithSMS();
  return adminUsers.map((user2) => ({
    id: user2.id,
    email: user2.email,
    phoneNumber: user2.phoneNumber || void 0
  }));
}
async function checkTriggersForEvent(eventType, data) {
  try {
    const triggers = await getTriggersByEventType(eventType);
    for (const trigger of triggers) {
      await executeTrigger(trigger.id, data);
    }
  } catch (error) {
    console.error(`Error checking triggers for event ${eventType}:`, error);
  }
}
async function checkStockLevelTriggers(materialId) {
  const materials2 = await getMaterials();
  const material = materials2.find((m) => m.id === materialId);
  if (!material) return;
  await checkTriggersForEvent("stock_level_change", {
    materialId: material.id,
    materialName: material.name,
    currentStock: material.quantity,
    minStock: material.minStock,
    criticalStock: material.criticalThreshold,
    unit: material.unit
  });
}
async function checkDeliveryStatusTriggers(deliveryId) {
  const deliveries2 = await getDeliveries();
  const delivery = deliveries2.find((d) => d.id === deliveryId);
  if (!delivery) return;
  await checkTriggersForEvent("delivery_status_change", {
    deliveryId: delivery.id,
    status: delivery.status,
    projectId: delivery.projectId,
    scheduledTime: delivery.scheduledTime,
    volume: delivery.volume
  });
}
async function checkQualityTestTriggers(testId) {
  const tests = await getQualityTests();
  const test = tests.find((t2) => t2.id === testId);
  if (!test) return;
  await checkTriggersForEvent("quality_test_result", {
    testId: test.id,
    result: test.result,
    testType: test.testType,
    projectId: test.projectId,
    createdAt: test.createdAt
  });
}
async function checkOverdueTaskTriggers(userId) {
  const overdueTasks = await getOverdueTasks(userId);
  for (const task of overdueTasks) {
    await checkTriggersForEvent("task_overdue", {
      taskId: task.id,
      taskName: task.title,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      priority: task.priority
    });
  }
}

// server/routers/triggerExecution.ts
var triggerExecutionRouter = router({
  /**
   * Test a trigger with sample data
   */
  testTrigger: protectedProcedure.input(
    z6.object({
      triggerId: z6.number(),
      testData: z6.record(z6.string(), z6.any())
    })
  ).mutation(async ({ input }) => {
    const result = await executeTrigger(
      input.triggerId,
      input.testData
    );
    return result;
  }),
  /**
   * Check stock level triggers for a specific material
   */
  checkStockLevels: protectedProcedure.input(
    z6.object({
      materialId: z6.number()
    })
  ).mutation(async ({ input }) => {
    await checkStockLevelTriggers(input.materialId);
    return { success: true, message: "Stock level triggers checked" };
  }),
  /**
   * Check delivery status triggers for a specific delivery
   */
  checkDeliveryStatus: protectedProcedure.input(
    z6.object({
      deliveryId: z6.number()
    })
  ).mutation(async ({ input }) => {
    await checkDeliveryStatusTriggers(input.deliveryId);
    return { success: true, message: "Delivery status triggers checked" };
  }),
  /**
   * Check quality test triggers for a specific test
   */
  checkQualityTest: protectedProcedure.input(
    z6.object({
      testId: z6.number()
    })
  ).mutation(async ({ input }) => {
    await checkQualityTestTriggers(input.testId);
    return { success: true, message: "Quality test triggers checked" };
  }),
  /**
   * Check overdue task triggers for a user
   */
  checkOverdueTasks: protectedProcedure.input(
    z6.object({
      userId: z6.number()
    })
  ).mutation(async ({ input }) => {
    await checkOverdueTaskTriggers(input.userId);
    return { success: true, message: "Overdue task triggers checked" };
  }),
  /**
   * Manually trigger all active triggers for a specific event type
   */
  triggerEvent: protectedProcedure.input(
    z6.object({
      eventType: z6.string(),
      data: z6.record(z6.string(), z6.any())
    })
  ).mutation(async ({ input }) => {
    await checkTriggersForEvent(input.eventType, input.data);
    return { success: true, message: `Triggers for ${input.eventType} executed` };
  })
});

// server/routers/timesheets.ts
import { z as z7 } from "zod";
var timesheetsRouter = router({
  // ============ SHIFT MANAGEMENT ============
  createShift: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    shiftDate: z7.date(),
    startTime: z7.date(),
    endTime: z7.date(),
    breakDuration: z7.number().default(0),
    projectId: z7.number().optional(),
    notes: z7.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const shiftId = await createShift({
      employeeId: input.employeeId,
      shiftDate: input.shiftDate,
      startTime: input.startTime,
      endTime: input.endTime,
      breakDuration: input.breakDuration,
      projectId: input.projectId,
      notes: input.notes,
      status: "scheduled",
      createdBy: ctx.user.id
    });
    return { success: !!shiftId, shiftId };
  }),
  getShifts: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    startDate: z7.date(),
    endDate: z7.date()
  })).query(async ({ input }) => {
    return await getShiftsByEmployee(
      input.employeeId,
      input.startDate,
      input.endDate
    );
  }),
  updateShift: protectedProcedure.input(z7.object({
    shiftId: z7.number(),
    status: z7.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]).optional(),
    notes: z7.string().optional()
  })).mutation(async ({ input }) => {
    const success = await updateShift(input.shiftId, {
      status: input.status,
      notes: input.notes
    });
    return { success };
  }),
  // ============ SHIFT TEMPLATES ============
  createShiftTemplate: protectedProcedure.input(z7.object({
    name: z7.string(),
    description: z7.string().optional(),
    startTime: z7.string(),
    // HH:MM format
    endTime: z7.string(),
    // HH:MM format
    breakDuration: z7.number().default(0),
    daysOfWeek: z7.array(z7.number())
    // 0-6
  })).mutation(async ({ input, ctx }) => {
    const templateId = await createShiftTemplate({
      name: input.name,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      breakDuration: input.breakDuration,
      daysOfWeek: input.daysOfWeek,
      isActive: true,
      createdBy: ctx.user.id
    });
    return { success: !!templateId, templateId };
  }),
  getShiftTemplates: protectedProcedure.query(async () => {
    return await getShiftTemplates();
  }),
  // ============ EMPLOYEE AVAILABILITY ============
  setAvailability: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    dayOfWeek: z7.number(),
    // 0-6
    isAvailable: z7.boolean(),
    startTime: z7.string().optional(),
    // HH:MM format
    endTime: z7.string().optional(),
    // HH:MM format
    notes: z7.string().optional()
  })).mutation(async ({ input }) => {
    const success = await setEmployeeAvailability({
      employeeId: input.employeeId,
      dayOfWeek: input.dayOfWeek,
      isAvailable: input.isAvailable,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes
    });
    return { success };
  }),
  getAvailability: protectedProcedure.input(z7.object({
    employeeId: z7.number()
  })).query(async ({ input }) => {
    return await getEmployeeAvailability(input.employeeId);
  }),
  // ============ COMPLIANCE & AUDIT ============
  logComplianceAudit: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    auditDate: z7.date(),
    auditType: z7.enum(["daily_hours", "weekly_hours", "break_compliance", "overtime", "wage_calculation"]),
    status: z7.enum(["compliant", "warning", "violation"]),
    details: z7.record(z7.string(), z7.any()),
    severity: z7.enum(["low", "medium", "high"]).default("low"),
    actionTaken: z7.string().optional()
  })).mutation(async ({ input, ctx }) => {
    const success = await logComplianceAudit({
      employeeId: input.employeeId,
      auditDate: input.auditDate,
      auditType: input.auditType,
      status: input.status,
      details: input.details,
      severity: input.severity,
      actionTaken: input.actionTaken,
      createdBy: ctx.user.id
    });
    return { success };
  }),
  getComplianceAudits: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    startDate: z7.date(),
    endDate: z7.date()
  })).query(async ({ input }) => {
    return await getComplianceAudits(
      input.employeeId,
      input.startDate,
      input.endDate
    );
  }),
  // ============ BREAK TRACKING ============
  recordBreak: protectedProcedure.input(z7.object({
    workHourId: z7.number(),
    employeeId: z7.number(),
    breakStart: z7.date(),
    breakEnd: z7.date().optional(),
    breakType: z7.enum(["meal", "rest", "combined"]),
    notes: z7.string().optional()
  })).mutation(async ({ input }) => {
    const breakDuration = input.breakEnd ? Math.round((input.breakEnd.getTime() - input.breakStart.getTime()) / (1e3 * 60)) : void 0;
    const success = await recordBreak({
      workHourId: input.workHourId,
      employeeId: input.employeeId,
      breakStart: input.breakStart,
      breakEnd: input.breakEnd,
      breakDuration,
      breakType: input.breakType,
      notes: input.notes
    });
    return { success };
  }),
  getBreakRules: protectedProcedure.input(z7.object({
    jurisdiction: z7.string()
  })).query(async ({ input }) => {
    return await getBreakRules(input.jurisdiction);
  }),
  // ============ OFFLINE SYNC ============
  cacheOfflineEntry: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    deviceId: z7.string(),
    entryData: z7.object({
      date: z7.string(),
      startTime: z7.string(),
      endTime: z7.string(),
      projectId: z7.number().optional(),
      notes: z7.string().optional()
    })
  })).mutation(async ({ input }) => {
    const success = await cacheOfflineEntry({
      employeeId: input.employeeId,
      deviceId: input.deviceId,
      entryData: input.entryData,
      syncStatus: "pending"
    });
    return { success };
  }),
  getPendingOfflineEntries: protectedProcedure.input(z7.object({
    employeeId: z7.number()
  })).query(async ({ input }) => {
    return await getPendingOfflineEntries(input.employeeId);
  }),
  syncOfflineEntry: protectedProcedure.input(z7.object({
    cacheId: z7.number()
  })).mutation(async ({ input }) => {
    const success = await updateOfflineSyncStatus(
      input.cacheId,
      "synced",
      /* @__PURE__ */ new Date()
    );
    return { success };
  }),
  // ============ SUMMARY REPORTS ============
  weeklySummary: protectedProcedure.input(z7.object({
    employeeId: z7.number().optional(),
    weekStart: z7.date()
  })).query(async ({ input }) => {
    const weekEnd = new Date(input.weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (input.employeeId) {
      const shifts2 = await getShiftsByEmployee(input.employeeId, input.weekStart, weekEnd);
      const totalHours = shifts2.reduce((sum, shift) => {
        const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1e3 * 60 * 60);
        return sum + hours;
      }, 0);
      return {
        weekStart: input.weekStart,
        weekEnd,
        employeeId: input.employeeId,
        totalShifts: shifts2.length,
        totalHours: Math.round(totalHours * 100) / 100,
        shifts: shifts2
      };
    }
    return {
      weekStart: input.weekStart,
      weekEnd,
      totalShifts: 0,
      totalHours: 0,
      shifts: []
    };
  }),
  monthlySummary: protectedProcedure.input(z7.object({
    employeeId: z7.number().optional(),
    year: z7.number(),
    month: z7.number()
  })).query(async ({ input }) => {
    const monthStart = new Date(input.year, input.month - 1, 1);
    const monthEnd = new Date(input.year, input.month, 0);
    if (input.employeeId) {
      const shifts2 = await getShiftsByEmployee(input.employeeId, monthStart, monthEnd);
      const totalHours = shifts2.reduce((sum, shift) => {
        const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1e3 * 60 * 60);
        return sum + hours;
      }, 0);
      const audits = await getComplianceAudits(input.employeeId, monthStart, monthEnd);
      const violations = audits.filter((a) => a.status === "violation").length;
      return {
        year: input.year,
        month: input.month,
        employeeId: input.employeeId,
        totalShifts: shifts2.length,
        totalHours: Math.round(totalHours * 100) / 100,
        complianceViolations: violations,
        shifts: shifts2,
        audits
      };
    }
    return {
      year: input.year,
      month: input.month,
      totalShifts: 0,
      totalHours: 0,
      complianceViolations: 0,
      shifts: [],
      audits: []
    };
  }),
  // ============ BACKWARD COMPATIBILITY ============
  // These procedures maintain compatibility with existing UI components
  list: protectedProcedure.input(z7.object({
    employeeId: z7.number().optional(),
    status: z7.enum(["pending", "approved", "rejected"]).optional(),
    startDate: z7.date().optional(),
    endDate: z7.date().optional()
  }).optional()).query(async ({ input }) => {
    if (input?.employeeId && input?.startDate && input?.endDate) {
      return await getShiftsByEmployee(input.employeeId, input.startDate, input.endDate);
    }
    return [];
  }),
  clockIn: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    projectId: z7.number().optional(),
    notes: z7.string().optional()
  })).mutation(async ({ input }) => {
    const shiftId = await createShift({
      employeeId: input.employeeId,
      shiftDate: /* @__PURE__ */ new Date(),
      startTime: /* @__PURE__ */ new Date(),
      endTime: /* @__PURE__ */ new Date(),
      projectId: input.projectId,
      notes: input.notes,
      status: "in_progress",
      createdBy: 1
    });
    return { success: !!shiftId, shiftId: shiftId || 0 };
  }),
  clockOut: protectedProcedure.input(z7.object({
    id: z7.number()
  })).mutation(async ({ input }) => {
    const success = await updateShift(input.id, {
      endTime: /* @__PURE__ */ new Date(),
      status: "completed"
    });
    return { success };
  }),
  create: protectedProcedure.input(z7.object({
    employeeId: z7.number(),
    date: z7.date(),
    startTime: z7.date(),
    endTime: z7.date().optional(),
    hoursWorked: z7.number().optional(),
    overtimeHours: z7.number().optional(),
    workType: z7.enum(["regular", "overtime", "weekend", "holiday"]).optional(),
    projectId: z7.number().optional(),
    notes: z7.string().optional(),
    status: z7.enum(["pending", "approved", "rejected"]).default("pending")
  })).mutation(async ({ input, ctx }) => {
    const shiftId = await createShift({
      employeeId: input.employeeId,
      shiftDate: input.date,
      startTime: input.startTime,
      endTime: input.endTime || /* @__PURE__ */ new Date(),
      projectId: input.projectId,
      notes: input.notes,
      status: input.status === "approved" ? "completed" : "scheduled",
      createdBy: ctx.user.id
    });
    return { success: !!shiftId, shiftId: shiftId || 0 };
  }),
  approve: protectedProcedure.input(z7.object({
    id: z7.number(),
    approvedBy: z7.number()
  })).mutation(async ({ input }) => {
    const success = await updateShift(input.id, {
      status: "completed"
    });
    return { success };
  }),
  reject: protectedProcedure.input(z7.object({
    id: z7.number(),
    reason: z7.string().optional()
  })).mutation(async ({ input }) => {
    const success = await updateShift(input.id, {
      status: "cancelled",
      notes: input.reason
    });
    return { success };
  })
});

// server/routers/geolocation.ts
import { z as z8 } from "zod";

// server/services/geolocation.ts
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(deg) {
  return deg * Math.PI / 180;
}
function isWithinCircularGeofence(userLat, userLon, centerLat, centerLon, radiusMeters) {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radiusMeters;
}
function distanceToGeofence(userLat, userLon, centerLat, centerLon, radiusMeters) {
  const distance = calculateDistance(userLat, userLon, centerLat, centerLon);
  return distance - radiusMeters;
}
function isGPSAccuracyAcceptable(accuracyMeters, threshold = 50) {
  if (!accuracyMeters) return false;
  return accuracyMeters <= threshold;
}
function isValidGPSCoordinate(latitude, longitude) {
  return typeof latitude === "number" && typeof longitude === "number" && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
function generateViolationMessage(employeeName, jobSiteName, distanceMeters, eventType) {
  const action = eventType === "check_in" ? "checked in" : "checked out";
  return `${employeeName} ${action} at ${jobSiteName} but was ${distanceMeters}m outside the geofence`;
}

// server/routers/geolocation.ts
init_notification();
var geolocationRouter = router({
  /**
   * Create a new job site with geofence
   */
  createJobSite: protectedProcedure.input(
    z8.object({
      projectId: z8.number(),
      name: z8.string().min(1),
      description: z8.string().optional(),
      latitude: z8.number().min(-90).max(90),
      longitude: z8.number().min(-180).max(180),
      geofenceRadius: z8.number().min(10).max(5e3).optional(),
      address: z8.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Only admins can create job sites");
    }
    const jobSiteId = await createJobSite({
      ...input,
      createdBy: ctx.user.id
    });
    return { success: true, jobSiteId };
  }),
  /**
   * Get all job sites for a project
   */
  getJobSites: protectedProcedure.input(z8.object({ projectId: z8.number().optional() })).query(async ({ input }) => {
    return await getJobSites(input.projectId);
  }),
  /**
   * Check in with GPS location
   * Validates geofence and logs location
   */
  checkIn: protectedProcedure.input(
    z8.object({
      shiftId: z8.number(),
      jobSiteId: z8.number(),
      latitude: z8.number().min(-90).max(90),
      longitude: z8.number().min(-180).max(180),
      accuracy: z8.number().optional(),
      deviceId: z8.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (!isValidGPSCoordinate(input.latitude, input.longitude)) {
      throw new Error("Invalid GPS coordinates");
    }
    if (input.accuracy && !isGPSAccuracyAcceptable(input.accuracy)) {
      throw new Error(
        `GPS accuracy is ${Math.round(input.accuracy)}m. Please try again in an open area.`
      );
    }
    const shift = await getShiftById(input.shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }
    if (shift.employeeId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new Error("You can only check in for your own shifts");
    }
    const jobSites2 = await getJobSites();
    const jobSite = jobSites2.find((js) => js.id === input.jobSiteId);
    if (!jobSite) {
      throw new Error("Job site not found");
    }
    const jobSiteLat = parseFloat(jobSite.latitude);
    const jobSiteLon = parseFloat(jobSite.longitude);
    const isWithinGeofence = isWithinCircularGeofence(
      input.latitude,
      input.longitude,
      jobSiteLat,
      jobSiteLon,
      jobSite.geofenceRadius
    );
    const distanceFromGeofence = distanceToGeofence(
      input.latitude,
      input.longitude,
      jobSiteLat,
      jobSiteLon,
      jobSite.geofenceRadius
    );
    const locationLogId = await createLocationLog({
      shiftId: input.shiftId,
      employeeId: shift.employeeId,
      jobSiteId: input.jobSiteId,
      eventType: "check_in",
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      isWithinGeofence,
      distanceFromGeofence: Math.max(0, Math.round(distanceFromGeofence)),
      deviceId: input.deviceId
    });
    if (!isWithinGeofence && distanceFromGeofence > 0) {
      const violationId = await recordGeofenceViolation({
        locationLogId,
        employeeId: shift.employeeId,
        jobSiteId: input.jobSiteId,
        violationType: "check_in_outside",
        distanceFromGeofence: Math.round(distanceFromGeofence),
        severity: distanceFromGeofence > 500 ? "violation" : "warning"
      });
      const employee = await getEmployeeById(shift.employeeId);
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Employee";
      const message = generateViolationMessage(
        employeeName,
        jobSite.name,
        Math.round(distanceFromGeofence),
        "check_in"
      );
      await notifyOwner({
        title: "Geofence Violation - Check In",
        content: message
      });
      return {
        success: true,
        locationLogId,
        isWithinGeofence: false,
        distanceFromGeofence: Math.round(distanceFromGeofence),
        violationId,
        warning: `Check-in recorded but outside geofence by ${Math.round(distanceFromGeofence)}m`
      };
    }
    return {
      success: true,
      locationLogId,
      isWithinGeofence: true,
      distanceFromGeofence: 0,
      message: "Check-in successful"
    };
  }),
  /**
   * Check out with GPS location
   * Validates geofence and logs location
   */
  checkOut: protectedProcedure.input(
    z8.object({
      shiftId: z8.number(),
      jobSiteId: z8.number(),
      latitude: z8.number().min(-90).max(90),
      longitude: z8.number().min(-180).max(180),
      accuracy: z8.number().optional(),
      deviceId: z8.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (!isValidGPSCoordinate(input.latitude, input.longitude)) {
      throw new Error("Invalid GPS coordinates");
    }
    if (input.accuracy && !isGPSAccuracyAcceptable(input.accuracy)) {
      throw new Error(
        `GPS accuracy is ${Math.round(input.accuracy)}m. Please try again in an open area.`
      );
    }
    const shift = await getShiftById(input.shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }
    if (shift.employeeId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new Error("You can only check out for your own shifts");
    }
    const jobSites2 = await getJobSites();
    const jobSite = jobSites2.find((js) => js.id === input.jobSiteId);
    if (!jobSite) {
      throw new Error("Job site not found");
    }
    const jobSiteLat = parseFloat(jobSite.latitude);
    const jobSiteLon = parseFloat(jobSite.longitude);
    const isWithinGeofence = isWithinCircularGeofence(
      input.latitude,
      input.longitude,
      jobSiteLat,
      jobSiteLon,
      jobSite.geofenceRadius
    );
    const distanceFromGeofence = distanceToGeofence(
      input.latitude,
      input.longitude,
      jobSiteLat,
      jobSiteLon,
      jobSite.geofenceRadius
    );
    const locationLogId = await createLocationLog({
      shiftId: input.shiftId,
      employeeId: shift.employeeId,
      jobSiteId: input.jobSiteId,
      eventType: "check_out",
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      isWithinGeofence,
      distanceFromGeofence: Math.max(0, Math.round(distanceFromGeofence)),
      deviceId: input.deviceId
    });
    if (!isWithinGeofence && distanceFromGeofence > 0) {
      const violationId = await recordGeofenceViolation({
        locationLogId,
        employeeId: shift.employeeId,
        jobSiteId: input.jobSiteId,
        violationType: "check_out_outside",
        distanceFromGeofence: Math.round(distanceFromGeofence),
        severity: distanceFromGeofence > 500 ? "violation" : "warning"
      });
      const employee = await getEmployeeById(shift.employeeId);
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Employee";
      const message = generateViolationMessage(
        employeeName,
        jobSite.name,
        Math.round(distanceFromGeofence),
        "check_out"
      );
      await notifyOwner({
        title: "Geofence Violation - Check Out",
        content: message
      });
      return {
        success: true,
        locationLogId,
        isWithinGeofence: false,
        distanceFromGeofence: Math.round(distanceFromGeofence),
        violationId,
        warning: `Check-out recorded but outside geofence by ${Math.round(distanceFromGeofence)}m`
      };
    }
    return {
      success: true,
      locationLogId,
      isWithinGeofence: true,
      distanceFromGeofence: 0,
      message: "Check-out successful"
    };
  }),
  /**
   * Get location history for current user
   */
  getLocationHistory: protectedProcedure.input(z8.object({ limit: z8.number().min(1).max(100).optional() })).query(async ({ input, ctx }) => {
    return await getLocationHistory(ctx.user.id, input.limit);
  }),
  /**
   * Get geofence violations for current user
   */
  getViolations: protectedProcedure.input(z8.object({ resolved: z8.boolean().optional() })).query(async ({ input, ctx }) => {
    return await getGeofenceViolations(ctx.user.id, input.resolved);
  }),
  /**
   * Get all geofence violations (admin only)
   */
  getAllViolations: protectedProcedure.input(
    z8.object({
      employeeId: z8.number().optional(),
      resolved: z8.boolean().optional()
    })
  ).query(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Only admins can view all violations");
    }
    return await getGeofenceViolations(input.employeeId, input.resolved);
  }),
  /**
   * Resolve a geofence violation (admin only)
   */
  resolveViolation: protectedProcedure.input(
    z8.object({
      violationId: z8.number(),
      notes: z8.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Only admins can resolve violations");
    }
    const success = await resolveGeofenceViolation(
      input.violationId,
      ctx.user.id,
      input.notes
    );
    if (!success) {
      throw new Error("Failed to resolve violation");
    }
    return { success: true, message: "Violation resolved" };
  })
});

// server/routers/export.ts
import { z as z9 } from "zod";

// server/services/excelExport.ts
import ExcelJS from "exceljs";
async function exportMaterialsToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Materials");
  const allColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "name", header: "Material Name", width: 30 },
    { key: "category", header: "Category", width: 15 },
    { key: "unit", header: "Unit", width: 10 },
    { key: "quantity", header: "Quantity", width: 12 },
    { key: "minStock", header: "Min Stock", width: 12 },
    { key: "criticalThreshold", header: "Critical Threshold", width: 18 },
    { key: "supplier", header: "Supplier", width: 25 },
    { key: "unitPrice", header: "Unit Price", width: 12 },
    { key: "supplierEmail", header: "Supplier Email", width: 30 },
    { key: "createdAt", header: "Created At", width: 20 },
    { key: "updatedAt", header: "Updated At", width: 20 }
  ];
  const selectedColumns = options.columns ? allColumns.filter((col) => options.columns.includes(col.key)) : allColumns;
  worksheet.columns = selectedColumns;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  const materials2 = await getMaterials();
  materials2.forEach((material) => {
    const row = {};
    selectedColumns.forEach((col) => {
      row[col.key] = material[col.key];
    });
    worksheet.addRow(row);
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function exportEmployeesToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Employees");
  const allColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "firstName", header: "First Name", width: 20 },
    { key: "lastName", header: "Last Name", width: 20 },
    { key: "employeeNumber", header: "Employee Number", width: 18 },
    { key: "position", header: "Position", width: 25 },
    { key: "department", header: "Department", width: 20 },
    { key: "phoneNumber", header: "Phone", width: 18 },
    { key: "email", header: "Email", width: 30 },
    { key: "hourlyRate", header: "Hourly Rate", width: 15 },
    { key: "status", header: "Status", width: 12 },
    { key: "hireDate", header: "Hire Date", width: 15 },
    { key: "createdAt", header: "Created At", width: 20 }
  ];
  const selectedColumns = options.columns ? allColumns.filter((col) => options.columns.includes(col.key)) : allColumns;
  worksheet.columns = selectedColumns;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  const employees2 = await getEmployees();
  employees2.forEach((employee) => {
    const row = {};
    selectedColumns.forEach((col) => {
      row[col.key] = employee[col.key];
    });
    worksheet.addRow(row);
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function exportProjectsToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Projects");
  const allColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "name", header: "Project Name", width: 30 },
    { key: "location", header: "Location", width: 30 },
    { key: "status", header: "Status", width: 15 },
    { key: "startDate", header: "Start Date", width: 15 },
    { key: "endDate", header: "End Date", width: 15 },
    { key: "createdBy", header: "Created By", width: 15 },
    { key: "createdAt", header: "Created At", width: 20 }
  ];
  const selectedColumns = options.columns ? allColumns.filter((col) => options.columns.includes(col.key)) : allColumns;
  worksheet.columns = selectedColumns;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC000" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  const projects2 = await getProjects();
  projects2.forEach((project) => {
    const row = {};
    selectedColumns.forEach((col) => {
      row[col.key] = project[col.key];
    });
    worksheet.addRow(row);
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function exportDeliveriesToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Deliveries");
  const allColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "projectId", header: "Project ID", width: 12 },
    { key: "materialId", header: "Material ID", width: 12 },
    { key: "quantity", header: "Quantity", width: 12 },
    { key: "deliveryDate", header: "Delivery Date", width: 18 },
    { key: "status", header: "Status", width: 15 },
    { key: "supplier", header: "Supplier", width: 25 },
    { key: "notes", header: "Notes", width: 40 },
    { key: "createdAt", header: "Created At", width: 20 }
  ];
  const selectedColumns = options.columns ? allColumns.filter((col) => options.columns.includes(col.key)) : allColumns;
  worksheet.columns = selectedColumns;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFED7D31" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  const deliveries2 = await getDeliveries();
  deliveries2.forEach((delivery) => {
    const row = {};
    selectedColumns.forEach((col) => {
      row[col.key] = delivery[col.key];
    });
    worksheet.addRow(row);
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function exportTimesheetsToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Timesheets");
  const allColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "employeeId", header: "Employee ID", width: 15 },
    { key: "projectId", header: "Project ID", width: 12 },
    { key: "date", header: "Date", width: 15 },
    { key: "hoursWorked", header: "Hours Worked", width: 15 },
    { key: "overtimeHours", header: "Overtime Hours", width: 15 },
    { key: "breakMinutes", header: "Break Minutes", width: 15 },
    { key: "status", header: "Status", width: 15 },
    { key: "notes", header: "Notes", width: 40 },
    { key: "createdAt", header: "Created At", width: 20 }
  ];
  const selectedColumns = options.columns ? allColumns.filter((col) => options.columns.includes(col.key)) : allColumns;
  worksheet.columns = selectedColumns;
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF5B9BD5" }
  };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  const timesheets = await getWorkHours();
  timesheets.forEach((timesheet) => {
    const row = {};
    selectedColumns.forEach((col) => {
      row[col.key] = timesheet[col.key];
    });
    worksheet.addRow(row);
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: selectedColumns.length }
  };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
async function exportAllDataToExcel(options = {}) {
  const workbook = new ExcelJS.Workbook();
  const materialsSheet = workbook.addWorksheet("Materials");
  const materialsColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "name", header: "Material Name", width: 30 },
    { key: "category", header: "Category", width: 15 },
    { key: "unit", header: "Unit", width: 10 },
    { key: "quantity", header: "Quantity", width: 12 },
    { key: "minStock", header: "Min Stock", width: 12 }
  ];
  materialsSheet.columns = materialsColumns;
  materialsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  materialsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
  const materials2 = await getMaterials();
  materials2.forEach((m) => materialsSheet.addRow(m));
  const employeesSheet = workbook.addWorksheet("Employees");
  const employeesColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "firstName", header: "First Name", width: 20 },
    { key: "lastName", header: "Last Name", width: 20 },
    { key: "employeeNumber", header: "Employee Number", width: 18 },
    { key: "position", header: "Position", width: 25 },
    { key: "department", header: "Department", width: 20 }
  ];
  employeesSheet.columns = employeesColumns;
  employeesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  employeesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF70AD47" } };
  const employees2 = await getEmployees();
  employees2.forEach((e) => employeesSheet.addRow(e));
  const projectsSheet = workbook.addWorksheet("Projects");
  const projectsColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "name", header: "Project Name", width: 30 },
    { key: "location", header: "Location", width: 30 },
    { key: "status", header: "Status", width: 15 },
    { key: "startDate", header: "Start Date", width: 15 }
  ];
  projectsSheet.columns = projectsColumns;
  projectsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  projectsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
  const projects2 = await getProjects();
  projects2.forEach((p) => projectsSheet.addRow(p));
  const deliveriesSheet = workbook.addWorksheet("Deliveries");
  const deliveriesColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "projectName", header: "Project", width: 30 },
    { key: "concreteType", header: "Concrete Type", width: 20 },
    { key: "volume", header: "Volume (m\xB3)", width: 15 },
    { key: "scheduledTime", header: "Scheduled Time", width: 20 },
    { key: "status", header: "Status", width: 15 },
    { key: "driverName", header: "Driver", width: 20 },
    { key: "vehicleNumber", header: "Vehicle", width: 15 }
  ];
  deliveriesSheet.columns = deliveriesColumns;
  deliveriesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  deliveriesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFED7D31" } };
  const deliveries2 = await getDeliveries();
  deliveries2.forEach((d) => deliveriesSheet.addRow(d));
  const timesheetsSheet = workbook.addWorksheet("Timesheets");
  const timesheetsColumns = [
    { key: "id", header: "ID", width: 10 },
    { key: "employeeId", header: "Employee ID", width: 15 },
    { key: "projectId", header: "Project ID", width: 15 },
    { key: "shiftDate", header: "Date", width: 15 },
    { key: "startTime", header: "Start Time", width: 20 },
    { key: "endTime", header: "End Time", width: 20 },
    { key: "breakDuration", header: "Break (min)", width: 15 },
    { key: "status", header: "Status", width: 15 }
  ];
  timesheetsSheet.columns = timesheetsColumns;
  timesheetsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  timesheetsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B9BD5" } };
  const timesheets = await getAllShifts();
  timesheets.forEach((t2) => timesheetsSheet.addRow(t2));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// server/routers/export.ts
var exportRouter = router({
  /**
   * Export materials to Excel
   */
  materials: publicProcedure.input(
    z9.object({
      columns: z9.array(z9.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const buffer = await exportMaterialsToExcel({
      columns: input.columns
    });
    return {
      data: buffer.toString("base64"),
      filename: `materials_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Export employees to Excel
   */
  employees: publicProcedure.input(
    z9.object({
      columns: z9.array(z9.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const buffer = await exportEmployeesToExcel({
      columns: input.columns
    });
    return {
      data: buffer.toString("base64"),
      filename: `employees_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Export projects to Excel
   */
  projects: publicProcedure.input(
    z9.object({
      columns: z9.array(z9.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const buffer = await exportProjectsToExcel({
      columns: input.columns
    });
    return {
      data: buffer.toString("base64"),
      filename: `projects_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Export deliveries to Excel
   */
  deliveries: publicProcedure.input(
    z9.object({
      columns: z9.array(z9.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const buffer = await exportDeliveriesToExcel({
      columns: input.columns
    });
    return {
      data: buffer.toString("base64"),
      filename: `deliveries_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Export timesheets to Excel
   */
  timesheets: publicProcedure.input(
    z9.object({
      columns: z9.array(z9.string()).optional()
    })
  ).mutation(async ({ input }) => {
    const buffer = await exportTimesheetsToExcel({
      columns: input.columns
    });
    return {
      data: buffer.toString("base64"),
      filename: `timesheets_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Export all data to a single Excel file with multiple sheets
   */
  all: publicProcedure.mutation(async () => {
    const buffer = await exportAllDataToExcel();
    return {
      data: buffer.toString("base64"),
      filename: `azvirt_dms_export_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  }),
  /**
   * Get available columns for each export type
   */
  getAvailableColumns: publicProcedure.input(z9.enum(["materials", "employees", "projects", "deliveries", "timesheets"])).query(({ input }) => {
    const columnDefinitions = {
      materials: [
        { key: "id", label: "ID" },
        { key: "name", label: "Material Name" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "quantity", label: "Quantity" },
        { key: "minStock", label: "Min Stock" },
        { key: "criticalThreshold", label: "Critical Threshold" },
        { key: "supplier", label: "Supplier" },
        { key: "unitPrice", label: "Unit Price" },
        { key: "supplierEmail", label: "Supplier Email" },
        { key: "createdAt", label: "Created At" },
        { key: "updatedAt", label: "Updated At" }
      ],
      employees: [
        { key: "id", label: "ID" },
        { key: "firstName", label: "First Name" },
        { key: "lastName", label: "Last Name" },
        { key: "employeeNumber", label: "Employee Number" },
        { key: "position", label: "Position" },
        { key: "department", label: "Department" },
        { key: "phoneNumber", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "hourlyRate", label: "Hourly Rate" },
        { key: "status", label: "Status" },
        { key: "hireDate", label: "Hire Date" },
        { key: "createdAt", label: "Created At" }
      ],
      projects: [
        { key: "id", label: "ID" },
        { key: "name", label: "Project Name" },
        { key: "location", label: "Location" },
        { key: "status", label: "Status" },
        { key: "startDate", label: "Start Date" },
        { key: "endDate", label: "End Date" },
        { key: "createdBy", label: "Created By" },
        { key: "createdAt", label: "Created At" }
      ],
      deliveries: [
        { key: "id", label: "ID" },
        { key: "projectId", label: "Project ID" },
        { key: "materialId", label: "Material ID" },
        { key: "quantity", label: "Quantity" },
        { key: "deliveryDate", label: "Delivery Date" },
        { key: "status", label: "Status" },
        { key: "supplier", label: "Supplier" },
        { key: "notes", label: "Notes" },
        { key: "createdAt", label: "Created At" }
      ],
      timesheets: [
        { key: "id", label: "ID" },
        { key: "employeeId", label: "Employee ID" },
        { key: "projectId", label: "Project ID" },
        { key: "date", label: "Date" },
        { key: "hoursWorked", label: "Hours Worked" },
        { key: "overtimeHours", label: "Overtime Hours" },
        { key: "breakMinutes", label: "Break Minutes" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" },
        { key: "createdAt", label: "Created At" }
      ]
    };
    return columnDefinitions[input];
  })
});

// server/routers/recipes.ts
import { z as z10 } from "zod";

// server/db/recipes.ts
var recordToObj2 = recordToNative;
async function getAllRecipes() {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (r:ConcreteRecipe)
      RETURN r
      ORDER BY r.name
    `);
    return result.records.map((r) => recordToObj2(r, "r"));
  } catch (error) {
    console.error("Failed to get recipes:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getRecipeById(id) {
  const session = getSession();
  try {
    const result = await session.run("MATCH (r:ConcreteRecipe {id: $id}) RETURN r", { id });
    if (result.records.length === 0) return null;
    return recordToObj2(result.records[0], "r");
  } catch (error) {
    console.error("Failed to get recipe:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function getRecipeIngredients(recipeId) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (r:ConcreteRecipe {id: $recipeId})-[rel:REQUIRES]->(m:Material)
      RETURN m, rel
    `, { recipeId });
    return result.records.map((r) => {
      const material = recordToObj2(r, "m");
      const rel = r.get("rel");
      return {
        id: rel.properties.id,
        recipeId,
        materialId: material.id,
        materialName: material.name,
        quantity: rel.properties.quantity,
        unit: rel.properties.unit
      };
    });
  } catch (error) {
    console.error("Failed to get recipe ingredients:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function createRecipe(recipe) {
  const session = getSession();
  try {
    const query = `
      CREATE (r:ConcreteRecipe {
        id: toInteger(timestamp()),
        name: $name,
        description: $description,
        targetStrength: $targetStrength,
        slump: $slump,
        maxAggregateSize: $maxAggregateSize,
        yieldVolume: $yieldVolume,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN r.id as id
    `;
    const result = await session.run(query, {
      name: recipe.name,
      description: recipe.description || null,
      targetStrength: recipe.targetStrength || null,
      slump: recipe.slump || null,
      maxAggregateSize: recipe.maxAggregateSize || null,
      yieldVolume: recipe.yieldVolume || 1,
      notes: recipe.notes || null
    });
    return result.records[0]?.get("id").toNumber();
  } catch (error) {
    console.error("Failed to create recipe:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function addRecipeIngredient(ingredient) {
  const session = getSession();
  try {
    const query = `
      MATCH (r:ConcreteRecipe {id: $recipeId})
      MATCH (m:Material {id: $materialId})
      MERGE (r)-[rel:REQUIRES]->(m)
      SET rel.quantity = $quantity, rel.unit = $unit
    `;
    await session.run(query, {
      recipeId: ingredient.recipeId,
      materialId: ingredient.materialId,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    });
    return true;
  } catch (error) {
    console.error("Failed to add recipe ingredient:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function calculateRecipeQuantities(recipeId, targetVolume) {
  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;
  const ingredients = await getRecipeIngredients(recipeId);
  if (ingredients.length === 0) return null;
  const multiplier = targetVolume / (recipe.yieldVolume || 1);
  return {
    recipe,
    targetVolume,
    ingredients: ingredients.map((ingredient) => ({
      ...ingredient,
      calculatedQuantity: Math.ceil(ingredient.quantity * multiplier)
      // Round up to avoid shortages
    }))
  };
}
async function deleteRecipe(id) {
  const session = getSession();
  try {
    await session.run("MATCH (r:ConcreteRecipe {id: $id}) DETACH DELETE r", { id });
    return true;
  } catch (error) {
    console.error("Failed to delete recipe:", error);
    return false;
  } finally {
    await session.close();
  }
}

// server/routers/recipes.ts
var recipesRouter = router({
  /**
   * Get all concrete recipes
   */
  list: publicProcedure.query(async () => {
    return await getAllRecipes();
  }),
  /**
   * Get a single recipe with its ingredients
   */
  getById: publicProcedure.input(z10.object({ id: z10.number() })).query(async ({ input }) => {
    const recipe = await getRecipeById(input.id);
    if (!recipe) return null;
    const ingredients = await getRecipeIngredients(input.id);
    return {
      ...recipe,
      ingredients
    };
  }),
  /**
   * Calculate material quantities for a given volume
   */
  calculate: publicProcedure.input(
    z10.object({
      recipeId: z10.number(),
      volume: z10.number().positive()
      // Volume in cubic meters
    })
  ).query(async ({ input }) => {
    const volumeInLiters = input.volume * 1e3;
    return await calculateRecipeQuantities(input.recipeId, volumeInLiters);
  }),
  /**
   * Create a new concrete recipe
   */
  create: protectedProcedure.input(
    z10.object({
      name: z10.string().min(1),
      description: z10.string().optional(),
      concreteType: z10.string().optional(),
      yieldVolume: z10.number().default(1e3),
      ingredients: z10.array(
        z10.object({
          materialId: z10.number().nullable(),
          materialName: z10.string(),
          quantity: z10.number(),
          unit: z10.string()
        })
      )
    })
  ).mutation(async ({ input, ctx }) => {
    const recipeId = await createRecipe({
      name: input.name,
      description: input.description,
      concreteType: input.concreteType,
      yieldVolume: input.yieldVolume,
      createdBy: ctx.user.id
    });
    if (!recipeId) {
      throw new Error("Failed to create recipe");
    }
    for (const ingredient of input.ingredients) {
      await addRecipeIngredient({
        recipeId,
        materialId: ingredient.materialId,
        materialName: ingredient.materialName,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      });
    }
    return { success: true, recipeId };
  }),
  /**
   * Delete a recipe
   */
  delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
    const success = await deleteRecipe(input.id);
    return { success };
  })
});

// server/routers/mixingLogs.ts
import { z as z11 } from "zod";

// server/db/mixingLogs.ts
var recordToObj3 = recordToNative;
async function getAllMixingLogs(filters) {
  const session = getSession();
  try {
    let query = `MATCH (m:MixingLog)`;
    let whereClauses = [];
    let params = {};
    if (filters?.status) {
      whereClauses.push(`m.status = $status`);
      params.status = filters.status;
    }
    if (filters?.projectId) {
      whereClauses.push(`m.projectId = $projectId`);
      params.projectId = filters.projectId;
    }
    if (filters?.deliveryId) {
      whereClauses.push(`m.deliveryId = $deliveryId`);
      params.deliveryId = filters.deliveryId;
    }
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    query += ` RETURN m ORDER BY m.createdAt DESC`;
    const result = await session.run(query, params);
    return result.records.map((r) => recordToObj3(r, "m"));
  } catch (error) {
    console.error("Failed to get mixing logs:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getMixingLogById(id) {
  const session = getSession();
  try {
    const logResult = await session.run(`MATCH (m:MixingLog {id: $id}) RETURN m`, { id });
    if (logResult.records.length === 0) return null;
    const log = recordToObj3(logResult.records[0], "m");
    const ingredientsResult = await session.run(`
      MATCH (m:MixingLog {id: $id})-[rel:USED_INGREDIENT]->(mat:Material)
      RETURN mat, rel
    `, { id });
    const ingredients = ingredientsResult.records.map((r) => {
      const mat = recordToObj3(r, "mat");
      const rel = r.get("rel");
      return {
        id: rel.properties.id,
        // Relationship property?
        batchId: id,
        materialId: mat.id,
        materialName: mat.name,
        plannedQuantity: rel.properties.plannedQuantity,
        actualQuantity: rel.properties.actualQuantity,
        unit: rel.properties.unit,
        inventoryDeducted: rel.properties.inventoryDeducted || false
      };
    });
    return {
      ...log,
      ingredients
    };
  } catch (error) {
    console.error("Failed to get mixing log:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function generateBatchNumber() {
  const session = getSession();
  try {
    const today = /* @__PURE__ */ new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const prefix = `BATCH-${year}${month}${day}-`;
    const result = await session.run(`
      MATCH (m:MixingLog)
      WHERE m.batchNumber STARTS WITH $prefix
      RETURN count(m) as count
    `, { prefix });
    const count = result.records[0]?.get("count").toNumber() + 1;
    return `${prefix}${String(count).padStart(3, "0")}`;
  } catch (error) {
    console.error("Failed to generate batch number:", error);
    return `BATCH-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.random().toString(36).substr(2, 9)}`;
  } finally {
    await session.close();
  }
}
async function createMixingLog(log, ingredients) {
  const session = getSession();
  try {
    const query = `
      CREATE (m:MixingLog {
        id: toInteger(timestamp()),
        projectId: $projectId,
        deliveryId: $deliveryId,
        recipeId: $recipeId,
        recipeName: $recipeName,
        batchNumber: $batchNumber,
        volume: $volume,
        unit: $unit,
        status: $status, // 'planned', 'in_progress', 'completed'
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        operatorId: $operatorId,
        notes: $notes,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN m.id as id
    `;
    const logResult = await session.run(query, {
      projectId: log.projectId || null,
      deliveryId: log.deliveryId || null,
      recipeId: log.recipeId || null,
      recipeName: log.recipeName || null,
      batchNumber: log.batchNumber,
      volume: log.volume || 0,
      unit: log.unit || "m3",
      status: log.status || "planned",
      startTime: log.startTime ? new Date(log.startTime).toISOString() : null,
      endTime: log.endTime ? new Date(log.endTime).toISOString() : null,
      operatorId: log.operatorId || null,
      notes: log.notes || null
    });
    const batchId = logResult.records[0]?.get("id").toNumber();
    for (const ingredient of ingredients) {
      await session.run(`
         MATCH (m:MixingLog {id: $batchId})
         MATCH (mat:Material {id: $materialId})
         MERGE (m)-[r:USED_INGREDIENT]->(mat)
         SET r.id = toInteger(timestamp() + $rand), // Pseudo-unique ID for relationship if needed
             r.plannedQuantity = $plannedQuantity,
             r.actualQuantity = $actualQuantity,
             r.unit = $unit,
             r.inventoryDeducted = false
       `, {
        batchId,
        materialId: ingredient.materialId,
        plannedQuantity: ingredient.plannedQuantity,
        actualQuantity: ingredient.actualQuantity || null,
        unit: ingredient.unit,
        rand: Math.floor(Math.random() * 1e3)
      });
    }
    return batchId;
  } catch (error) {
    console.error("Failed to create mixing log:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function updateMixingLogStatus(id, status, updates) {
  const session = getSession();
  try {
    let setClause = `m.status = $status, m.updatedAt = datetime()`;
    let params = { id, status };
    if (updates?.endTime) {
      setClause += `, m.endTime = datetime($endTime)`;
      params.endTime = updates.endTime.toISOString();
    }
    if (updates?.approvedBy) {
      setClause += `, m.approvedBy = $approvedBy`;
      params.approvedBy = updates.approvedBy;
    }
    if (updates?.qualityNotes) {
      setClause += `, m.qualityNotes = $qualityNotes`;
      params.qualityNotes = updates.qualityNotes;
    }
    await session.run(`
      MATCH (m:MixingLog {id: $id})
      SET ${setClause}
    `, params);
    return true;
  } catch (error) {
    console.error("Failed to update mixing log status:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function deductMaterialsFromInventory(batchId) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog {id: $batchId})-[r:USED_INGREDIENT]->(mat:Material)
      WHERE r.inventoryDeducted = false OR r.inventoryDeducted IS NULL
      WITH r, mat
      SET mat.quantity = mat.quantity - COALESCE(r.actualQuantity, r.plannedQuantity, 0),
          r.inventoryDeducted = true
    `;
    await session.run(query, { batchId });
    return true;
  } catch (error) {
    console.error("Failed to deduct materials from inventory:", error);
    return false;
  } finally {
    await session.close();
  }
}
async function getProductionSummary(startDate, endDate) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog)
      WHERE m.status = 'completed' 
        AND m.createdAt >= datetime($startDate) 
        AND m.createdAt <= datetime($endDate)
      RETURN count(m) as totalBatches, sum(m.volume) as totalVolume, collect(m) as batches
    `;
    const result = await session.run(query, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    if (result.records.length === 0) return null;
    const record = result.records[0];
    const totalBatches = record.get("totalBatches").toNumber();
    const totalVolume = record.get("totalVolume") || 0;
    return {
      totalBatches,
      totalVolume,
      avgVolumePerBatch: totalBatches > 0 ? totalVolume / totalBatches : 0,
      batches: record.get("batches").map((n) => {
        return { ...n.properties, id: parseInt(n.properties.id) };
      })
    };
  } catch (error) {
    console.error("Failed to get production summary:", error);
    return null;
  } finally {
    await session.close();
  }
}

// server/routers/mixingLogs.ts
var mixingLogsRouter = router({
  /**
   * Get all mixing logs with optional filters
   */
  list: publicProcedure.input(
    z11.object({
      status: z11.enum(["planned", "in_progress", "completed", "rejected"]).optional(),
      projectId: z11.number().optional(),
      deliveryId: z11.number().optional()
    }).optional()
  ).query(async ({ input }) => {
    return await getAllMixingLogs(input);
  }),
  /**
   * Get a single mixing log with ingredients
   */
  getById: publicProcedure.input(z11.object({ id: z11.number() })).query(async ({ input }) => {
    return await getMixingLogById(input.id);
  }),
  /**
   * Create a new mixing batch
   */
  create: protectedProcedure.input(
    z11.object({
      recipeId: z11.number(),
      volume: z11.number().positive(),
      // Volume in m³
      projectId: z11.number().optional(),
      deliveryId: z11.number().optional(),
      notes: z11.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const recipe = await getRecipeById(input.recipeId);
    if (!recipe) {
      throw new Error("Recipe not found");
    }
    const recipeIngredients2 = await getRecipeIngredients(input.recipeId);
    if (recipeIngredients2.length === 0) {
      throw new Error("Recipe has no ingredients");
    }
    const batchNumber = await generateBatchNumber();
    const volumeInLiters = input.volume * 1e3;
    const multiplier = volumeInLiters / recipe.yieldVolume;
    const batchIngredients2 = recipeIngredients2.map((ingredient) => ({
      materialId: ingredient.materialId,
      materialName: ingredient.materialName,
      plannedQuantity: Math.ceil(ingredient.quantity * multiplier),
      unit: ingredient.unit,
      inventoryDeducted: false
    }));
    const batchId = await createMixingLog(
      {
        batchNumber,
        recipeId: input.recipeId,
        recipeName: recipe.name,
        volume: volumeInLiters,
        volumeM3: input.volume.toString(),
        status: "planned",
        projectId: input.projectId,
        deliveryId: input.deliveryId,
        producedBy: ctx.user.id,
        notes: input.notes
      },
      batchIngredients2
    );
    if (!batchId) {
      throw new Error("Failed to create batch");
    }
    return { success: true, batchId, batchNumber };
  }),
  /**
   * Update batch status
   */
  updateStatus: protectedProcedure.input(
    z11.object({
      id: z11.number(),
      status: z11.enum(["planned", "in_progress", "completed", "rejected"]),
      qualityNotes: z11.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const success = await updateMixingLogStatus(
      input.id,
      input.status,
      {
        endTime: input.status === "completed" ? /* @__PURE__ */ new Date() : void 0,
        approvedBy: input.status === "completed" ? ctx.user.id : void 0,
        qualityNotes: input.qualityNotes
      }
    );
    if (success && input.status === "completed") {
      await deductMaterialsFromInventory(input.id);
    }
    return { success };
  }),
  /**
   * Get production summary for a date range
   */
  productionSummary: publicProcedure.input(
    z11.object({
      startDate: z11.string(),
      // ISO date string
      endDate: z11.string()
      // ISO date string
    })
  ).query(async ({ input }) => {
    return await getProductionSummary(
      new Date(input.startDate),
      new Date(input.endDate)
    );
  })
});

// server/routers/productionAnalytics.ts
import { z as z12 } from "zod";

// server/db/productionAnalytics.ts
async function getDailyProductionVolume(days = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog)
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN date(m.createdAt) as date, sum(m.volume) as volume, count(m) as count
      ORDER BY date
    `;
    const result = await session.run(query, { days });
    return result.records.map((r) => ({
      date: r.get("date").toString(),
      volume: r.get("volume") || 0,
      count: r.get("count").toNumber()
    }));
  } catch (error) {
    console.error("Failed to get daily production volume:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getMaterialConsumptionTrends(days = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      MATCH (m)-[r:USED_INGREDIENT]->(mat:Material)
      RETURN mat.id as materialId, mat.name as name, mat.unit as unit, sum(COALESCE(r.actualQuantity, r.plannedQuantity)) as totalQuantity
      ORDER BY totalQuantity DESC
      LIMIT 10
    `;
    const result = await session.run(query, { days });
    return result.records.map((r) => ({
      materialId: r.get("materialId").toNumber(),
      name: r.get("name"),
      unit: r.get("unit"),
      totalQuantity: r.get("totalQuantity") || 0
    }));
  } catch (error) {
    console.error("Failed to get material consumption trends:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getProductionEfficiencyMetrics(days = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog)
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      WITH count(m) as totalBatches,
           count(CASE WHEN m.status = 'completed' THEN 1 END) as completedBatches,
           count(CASE WHEN m.status = 'rejected' THEN 1 END) as rejectedBatches,
           sum(CASE WHEN m.status = 'completed' THEN m.volume ELSE 0 END) as totalVolume,
           avg(CASE WHEN m.status = 'completed' AND m.startTime IS NOT NULL AND m.endTime IS NOT NULL 
               THEN duration.between(datetime(m.startTime), datetime(m.endTime)).seconds / 3600.0 ELSE NULL END) as avgBatchTimeHours
      RETURN totalBatches, completedBatches, rejectedBatches, totalVolume, avgBatchTimeHours
    `;
    const result = await session.run(query, { days });
    if (result.records.length === 0) return null;
    const r = result.records[0];
    const totalBatches = r.get("totalBatches").toNumber();
    const completedBatches = r.get("completedBatches").toNumber();
    const rejectedBatches = r.get("rejectedBatches").toNumber();
    const totalVolume = r.get("totalVolume") || 0;
    const avgBatchTime = r.get("avgBatchTimeHours") || 0;
    const successRate = totalBatches > 0 ? completedBatches / totalBatches * 100 : 0;
    const avgBatchVolume = completedBatches > 0 ? totalVolume / completedBatches : 0;
    const utilization = totalBatches > 0 ? completedBatches / totalBatches * 100 : 0;
    return {
      totalBatches,
      completedBatches,
      rejectedBatches,
      successRate: Math.round(successRate * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      avgBatchVolume: Math.round(avgBatchVolume * 100) / 100,
      avgBatchTime: Math.round(avgBatchTime * 100) / 100,
      utilization: Math.round(utilization * 100) / 100,
      period: `Last ${days} days`
    };
  } catch (error) {
    console.error("Failed to get production efficiency metrics:", error);
    return null;
  } finally {
    await session.close();
  }
}
async function getProductionByRecipe(days = 30) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN m.recipeId as recipeId, m.recipeName as recipeName, sum(m.volume) as volume, count(m) as count
      ORDER BY volume DESC
    `;
    const result = await session.run(query, { days });
    return result.records.map((r) => ({
      recipeId: r.get("recipeId") ? r.get("recipeId").toNumber() : null,
      recipeName: r.get("recipeName") || "Unknown Recipe",
      volume: r.get("volume") || 0,
      count: r.get("count").toNumber()
    }));
  } catch (error) {
    console.error("Failed to get production by recipe:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getHourlyProductionRate(days = 7) {
  const session = getSession();
  try {
    const query = `
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      WITH m, 
           toString(datetime(m.createdAt).year) + '-' + 
           toString(datetime(m.createdAt).month) + '-' + 
           toString(datetime(m.createdAt).day) + ' ' + 
           toString(datetime(m.createdAt).hour) + ':00' as hour
      RETURN hour, count(m) as count
      ORDER BY hour
    `;
    const result = await session.run(`
      MATCH (m:MixingLog {status: 'completed'})
      WHERE m.createdAt >= date() - duration('P'+$days+'D')
      RETURN m.createdAt as createdAt
    `, { days });
    const rateByHour = {};
    for (const r of result.records) {
      const d = new Date(r.get("createdAt").toString());
      const dateStr = d.toISOString().split("T")[0];
      const hourStr = String(d.getHours()).padStart(2, "0");
      const key = `${dateStr} ${hourStr}:00`;
      if (!rateByHour[key]) {
        rateByHour[key] = { hour: key, count: 0 };
      }
      rateByHour[key].count++;
    }
    return Object.values(rateByHour).sort((a, b) => a.hour.localeCompare(b.hour));
  } catch (error) {
    console.error("Failed to get hourly production rate:", error);
    return [];
  } finally {
    await session.close();
  }
}

// server/routers/productionAnalytics.ts
var productionAnalyticsRouter = router({
  /**
   * Get daily production volume
   */
  getDailyVolume: protectedProcedure.input(z12.object({ days: z12.number().optional().default(30) })).query(async ({ input }) => {
    return await getDailyProductionVolume(input.days);
  }),
  /**
   * Get material consumption trends
   */
  getMaterialConsumption: protectedProcedure.input(z12.object({ days: z12.number().optional().default(30) })).query(async ({ input }) => {
    return await getMaterialConsumptionTrends(input.days);
  }),
  /**
   * Get production efficiency metrics
   */
  getEfficiencyMetrics: protectedProcedure.input(z12.object({ days: z12.number().optional().default(30) })).query(async ({ input }) => {
    return await getProductionEfficiencyMetrics(input.days);
  }),
  /**
   * Get production by recipe
   */
  getProductionByRecipe: protectedProcedure.input(z12.object({ days: z12.number().optional().default(30) })).query(async ({ input }) => {
    return await getProductionByRecipe(input.days);
  }),
  /**
   * Get hourly production rate
   */
  getHourlyRate: protectedProcedure.input(z12.object({ days: z12.number().optional().default(7) })).query(async ({ input }) => {
    return await getHourlyProductionRate(input.days);
  })
});

// server/routers/timesheetApprovals.ts
import { z as z13 } from "zod";

// server/db/timesheetApprovals.ts
var recordToObj4 = recordToNative;
async function getPendingTimesheets(approverId) {
  const session = getSession();
  try {
    const query = `
      MATCH (ta:TimesheetApproval {status: 'pending'})
      WHERE ta.approverId = $approverId OR ta.approverId IS NULL
      MATCH (ta)<-[:HAS_APPROVAL_REQUEST]-(s:Shift)
      MATCH (u:User)-[:HAS_SHIFT]->(s)
      RETURN ta, s, u
    `;
    const result = await session.run(query, { approverId });
    return result.records.map((r) => {
      const approval = recordToObj4(r, "ta");
      const shift = recordToObj4(r, "s");
      const user2 = recordToObj4(r, "u");
      return {
        id: shift.id,
        // Drizzle return structure mapped workHours.id to id
        employeeId: user2.id,
        employeeName: user2.name,
        date: shift.startTime,
        // mapping shift start to date
        hoursWorked: shift.duration,
        // mapping duration
        status: shift.status,
        notes: shift.notes,
        // assuming notes on shift
        approvalStatus: approval.status,
        approvalId: approval.id
      };
    });
  } catch (error) {
    console.error("Failed to get pending timesheets:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getEmployeeTimesheets(employeeId) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      OPTIONAL MATCH (s)-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      RETURN s, ta
      ORDER BY s.startTime DESC
    `;
    const result = await session.run(query, { employeeId });
    return result.records.map((r) => {
      const shift = recordToObj4(r, "s");
      const approval = recordToObj4(r, "ta");
      return {
        id: shift.id,
        date: shift.startTime,
        hoursWorked: shift.duration,
        status: shift.status,
        notes: shift.notes,
        approvalStatus: approval ? approval.status : null,
        approvalComments: approval ? approval.comments : null,
        rejectionReason: approval ? approval.rejectionReason : null
      };
    });
  } catch (error) {
    console.error("Failed to get employee timesheets:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function approveTimesheet(timesheetId, approverId, comments) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      MATCH (u:User {id: $approverId})
      SET ta.status = 'approved', 
          ta.approvedBy = $approverId, 
          ta.approvedAt = datetime(), 
          ta.comments = $comments
      SET s.status = 'approved'
      MERGE (ta)-[:APPROVED_BY]->(u)
    `;
    await session.run(query, { timesheetId, approverId, comments: comments || null });
    return { success: true, message: "Timesheet approved" };
  } catch (error) {
    console.error("Failed to approve timesheet:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}
async function rejectTimesheet(timesheetId, approverId, rejectionReason) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      MATCH (u:User {id: $approverId})
      SET ta.status = 'rejected', 
          ta.rejectedBy = $approverId, 
          ta.rejectedAt = datetime(), 
          ta.rejectionReason = $rejectionReason
      SET s.status = 'rejected'
      MERGE (ta)-[:REJECTED_BY]->(u)
    `;
    await session.run(query, { timesheetId, approverId, rejectionReason });
    return { success: true, message: "Timesheet rejected" };
  } catch (error) {
    console.error("Failed to reject timesheet:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}
async function getTimesheetApprovalDetails(timesheetId) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift {id: $timesheetId})-[:HAS_APPROVAL_REQUEST]->(ta:TimesheetApproval)
      OPTIONAL MATCH (ta)-[:APPROVED_BY]->(approver:User)
      RETURN ta, approver
    `;
    const result = await session.run(query, { timesheetId });
    if (result.records.length === 0) return null;
    const record = result.records[0];
    const ta = recordToObj4(record, "ta");
    const approver = recordToObj4(record, "approver");
    return {
      id: ta.id,
      status: ta.status,
      comments: ta.comments,
      rejectionReason: ta.rejectionReason,
      approvedAt: ta.approvedAt,
      // Note: Neo4j datetime needs conversion if consuming code expects Date
      approverName: approver ? approver.name : null,
      approverEmail: approver ? approver.email : null
    };
  } catch (error) {
    console.error("Failed to get approval details:", error);
    return null;
  } finally {
    await session.close();
  }
}

// server/routers/timesheetApprovals.ts
var timesheetApprovalsRouter = router({
  /**
   * Get all pending timesheets for the current manager
   */
  getPendingForApproval: protectedProcedure.query(async ({ ctx }) => {
    return await getPendingTimesheets(ctx.user.id);
  }),
  /**
   * Get all timesheets for an employee
   */
  getEmployeeTimesheets: protectedProcedure.input(z13.object({ employeeId: z13.number() })).query(async ({ input }) => {
    return await getEmployeeTimesheets(input.employeeId);
  }),
  /**
   * Approve a timesheet
   */
  approve: protectedProcedure.input(
    z13.object({
      timesheetId: z13.number(),
      comments: z13.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    return await approveTimesheet(
      input.timesheetId,
      ctx.user.id,
      input.comments
    );
  }),
  /**
   * Reject a timesheet
   */
  reject: protectedProcedure.input(
    z13.object({
      timesheetId: z13.number(),
      rejectionReason: z13.string()
    })
  ).mutation(async ({ input, ctx }) => {
    return await rejectTimesheet(
      input.timesheetId,
      ctx.user.id,
      input.rejectionReason
    );
  }),
  /**
   * Get approval details for a timesheet
   */
  getApprovalDetails: protectedProcedure.input(z13.object({ timesheetId: z13.number() })).query(async ({ input }) => {
    return await getTimesheetApprovalDetails(input.timesheetId);
  })
});

// server/routers/shiftAssignments.ts
import { z as z14 } from "zod";

// server/db/shiftAssignments.ts
var recordToObj5 = recordToNative;
async function getAllEmployees() {
  const session = getSession();
  try {
    const result = await session.run(`MATCH (e:User {role: 'employee'}) RETURN e`);
    const resultEmp = await session.run(`MATCH (e:Employee) RETURN e`);
    return resultEmp.records.map((r) => recordToObj5(r, "e"));
  } catch (error) {
    console.error("Failed to get employees:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getShiftsForDateRange(startDate, endDate) {
  const session = getSession();
  try {
    const query = `
      MATCH (s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s
      ORDER BY s.startTime
    `;
    const result = await session.run(query, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map((r) => recordToObj5(r, "s"));
  } catch (error) {
    console.error("Failed to get shifts for date range:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function getEmployeeShifts(employeeId, startDate, endDate) {
  const session = getSession();
  try {
    const query = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE s.startTime >= datetime($startDate) AND s.startTime <= datetime($endDate)
      RETURN s
      ORDER BY s.startTime
    `;
    const result = await session.run(query, {
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return result.records.map((r) => recordToObj5(r, "s"));
  } catch (error) {
    console.error("Failed to get employee shifts:", error);
    return [];
  } finally {
    await session.close();
  }
}
async function assignEmployeeToShift(employeeId, startTime, endTime, shiftDate, createdBy) {
  const session = getSession();
  try {
    const conflictQuery = `
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE date(s.startTime) = date($shiftDate)
      RETURN count(s) as count
    `;
    const conflictResult = await session.run(conflictQuery, {
      employeeId,
      shiftDate: shiftDate.toISOString()
    });
    if (conflictResult.records[0].get("count").toNumber() > 0) {
      return { success: false, message: "Employee already assigned to a shift on this date" };
    }
    const createQuery = `
      MATCH (u:User {id: $employeeId})
      CREATE (s:Shift {
        id: toInteger(timestamp()),
        employeeId: $employeeId,
        shiftDate: datetime($shiftDate),
        startTime: datetime($startTime),
        endTime: datetime($endTime),
        status: 'scheduled',
        createdBy: $createdBy,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      MERGE (u)-[:HAS_SHIFT]->(s)
      RETURN s.id as id
    `;
    await session.run(createQuery, {
      employeeId,
      shiftDate: shiftDate.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      createdBy
    });
    return { success: true, message: "Shift assigned successfully" };
  } catch (error) {
    console.error("Failed to assign shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}
async function updateShiftAssignment(shiftId, updates) {
  const session = getSession();
  try {
    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No updates provided" };
    }
    let setClause = `s.updatedAt = datetime()`;
    let params = { shiftId };
    if (updates.startTime) {
      setClause += `, s.startTime = datetime($startTime)`;
      params.startTime = updates.startTime.toISOString();
    }
    if (updates.endTime) {
      setClause += `, s.endTime = datetime($endTime)`;
      params.endTime = updates.endTime.toISOString();
    }
    if (updates.status) {
      setClause += `, s.status = $status`;
      params.status = updates.status;
    }
    await session.run(`
      MATCH (s:Shift {id: $shiftId})
      SET ${setClause}
    `, params);
    return { success: true, message: "Shift updated successfully" };
  } catch (error) {
    console.error("Failed to update shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}
async function deleteShiftAssignment(shiftId) {
  const session = getSession();
  try {
    await session.run(`MATCH (s:Shift {id: $shiftId}) DETACH DELETE s`, { shiftId });
    return { success: true, message: "Shift deleted successfully" };
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return { success: false, message: "Database connection failed" };
  } finally {
    await session.close();
  }
}
async function checkShiftConflicts(employeeId, shiftDate) {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (u:User {id: $employeeId})-[:HAS_SHIFT]->(s:Shift)
      WHERE date(s.startTime) = date($shiftDate)
      RETURN s
    `, {
      employeeId,
      shiftDate: shiftDate.toISOString()
    });
    return result.records.map((r) => recordToObj5(r, "s"));
  } catch (error) {
    console.error("Failed to check shift conflicts:", error);
    return [];
  } finally {
    await session.close();
  }
}

// server/routers/shiftAssignments.ts
async function getAllShiftTemplates() {
  return await getShiftTemplates();
}
var shiftAssignmentsRouter = router({
  /**
   * Get all shift templates
   */
  getTemplates: publicProcedure.query(async () => {
    return await getAllShiftTemplates();
  }),
  /**
   * Get all employees
   */
  getEmployees: publicProcedure.query(async () => {
    return await getAllEmployees();
  }),
  /**
   * Get shifts for a date range
   */
  getShiftsForRange: publicProcedure.input(
    z14.object({
      startDate: z14.date(),
      endDate: z14.date()
    })
  ).query(async ({ input }) => {
    return await getShiftsForDateRange(input.startDate, input.endDate);
  }),
  /**
   * Get shifts for a specific employee
   */
  getEmployeeShifts: publicProcedure.input(
    z14.object({
      employeeId: z14.number(),
      startDate: z14.date(),
      endDate: z14.date()
    })
  ).query(async ({ input }) => {
    return await getEmployeeShifts(input.employeeId, input.startDate, input.endDate);
  }),
  /**
   * Assign employee to a shift
   */
  assignShift: protectedProcedure.input(
    z14.object({
      employeeId: z14.number(),
      startTime: z14.date(),
      endTime: z14.date(),
      shiftDate: z14.date()
    })
  ).mutation(async ({ input, ctx }) => {
    const conflicts = await checkShiftConflicts(input.employeeId, input.shiftDate);
    if (conflicts.length > 0) {
      throw new Error("Employee already has a shift on this date");
    }
    return await assignEmployeeToShift(
      input.employeeId,
      input.startTime,
      input.endTime,
      input.shiftDate,
      ctx.user.id
    );
  }),
  /**
   * Update shift assignment
   */
  updateShift: protectedProcedure.input(
    z14.object({
      shiftId: z14.number(),
      startTime: z14.date().optional(),
      endTime: z14.date().optional(),
      status: z14.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]).optional()
    })
  ).mutation(async ({ input }) => {
    const { shiftId, ...updates } = input;
    return await updateShiftAssignment(shiftId, updates);
  }),
  /**
   * Delete shift assignment
   */
  deleteShift: protectedProcedure.input(z14.object({ shiftId: z14.number() })).mutation(async ({ input }) => {
    return await deleteShiftAssignment(input.shiftId);
  }),
  /**
   * Check for conflicts
   */
  checkConflicts: publicProcedure.input(
    z14.object({
      employeeId: z14.number(),
      shiftDate: z14.date()
    })
  ).query(async ({ input }) => {
    const conflicts = await checkShiftConflicts(input.employeeId, input.shiftDate);
    return { hasConflicts: conflicts.length > 0, count: conflicts.length };
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  ai: aiAssistantRouter,
  bulkImport: bulkImportRouter,
  notifications: notificationsRouter,
  notificationTemplates: notificationTemplatesRouter,
  triggerExecution: triggerExecutionRouter,
  timesheets: timesheetsRouter,
  geolocation: geolocationRouter,
  export: exportRouter,
  recipes: recipesRouter,
  mixingLogs: mixingLogsRouter,
  productionAnalytics: productionAnalyticsRouter,
  timesheetApprovals: timesheetApprovalsRouter,
  shiftAssignments: shiftAssignmentsRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    updateSMSSettings: protectedProcedure.input(z15.object({
      phoneNumber: z15.string().min(1),
      smsNotificationsEnabled: z15.boolean()
    })).mutation(async ({ input, ctx }) => {
      const success = await updateUserSMSSettings(
        ctx.user.id,
        input.phoneNumber,
        input.smsNotificationsEnabled
      );
      return { success };
    }),
    updateLanguagePreference: protectedProcedure.input(z15.object({
      language: z15.enum(["en", "bs", "az"])
    })).mutation(async ({ input, ctx }) => {
      const success = await updateUserLanguagePreference(
        ctx.user.id,
        input.language
      );
      return { success };
    })
  }),
  documents: router({
    list: protectedProcedure.input(z15.object({
      projectId: z15.number().optional(),
      category: z15.string().optional(),
      search: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDocuments(input);
    }),
    upload: protectedProcedure.input(z15.object({
      name: z15.string(),
      description: z15.string().optional(),
      fileData: z15.string(),
      mimeType: z15.string(),
      fileSize: z15.number(),
      category: z15.enum(["contract", "blueprint", "report", "certificate", "invoice", "other"]),
      projectId: z15.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileExtension = input.mimeType.split("/")[1] || "bin";
      const fileKey = `documents/${ctx.user.id}/${nanoid()}.${fileExtension}`;
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
      await createDocument({
        name: input.name,
        description: input.description,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        category: input.category,
        projectId: input.projectId,
        uploadedBy: ctx.user.id
      });
      return { success: true, url };
    }),
    delete: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    })
  }),
  projects: router({
    list: protectedProcedure.query(async () => {
      return await getProjects();
    }),
    create: protectedProcedure.input(z15.object({
      name: z15.string(),
      description: z15.string().optional(),
      location: z15.string().optional(),
      status: z15.enum(["planning", "active", "completed", "on_hold"]).default("planning"),
      startDate: z15.date().optional(),
      endDate: z15.date().optional()
    })).mutation(async ({ input, ctx }) => {
      await createProject({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      name: z15.string().optional(),
      description: z15.string().optional(),
      location: z15.string().optional(),
      status: z15.enum(["planning", "active", "completed", "on_hold"]).optional(),
      startDate: z15.date().optional(),
      endDate: z15.date().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateProject(id, data);
      return { success: true };
    })
  }),
  materials: router({
    list: protectedProcedure.query(async () => {
      return await getMaterials();
    }),
    create: protectedProcedure.input(z15.object({
      name: z15.string(),
      category: z15.enum(["cement", "aggregate", "admixture", "water", "other"]),
      unit: z15.string(),
      quantity: z15.number().default(0),
      minStock: z15.number().default(0),
      criticalThreshold: z15.number().default(0),
      supplier: z15.string().optional(),
      unitPrice: z15.number().optional()
    })).mutation(async ({ input }) => {
      await createMaterial(input);
      return { success: true };
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      name: z15.string().optional(),
      category: z15.enum(["cement", "aggregate", "admixture", "water", "other"]).optional(),
      unit: z15.string().optional(),
      quantity: z15.number().optional(),
      minStock: z15.number().optional(),
      criticalThreshold: z15.number().optional(),
      supplier: z15.string().optional(),
      unitPrice: z15.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMaterial(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
      await deleteMaterial(input.id);
      return { success: true };
    }),
    checkLowStock: protectedProcedure.query(async () => {
      return await getLowStockMaterials();
    }),
    recordConsumption: protectedProcedure.input(z15.object({
      materialId: z15.number(),
      quantity: z15.number(),
      consumptionDate: z15.date(),
      projectId: z15.number().optional(),
      deliveryId: z15.number().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input }) => {
      await recordConsumption(input);
      return { success: true };
    }),
    getConsumptionHistory: protectedProcedure.input(z15.object({
      materialId: z15.number().optional(),
      days: z15.number().default(30)
    })).query(async ({ input }) => {
      return await getConsumptionHistory(input.materialId, input.days);
    }),
    generateForecasts: protectedProcedure.mutation(async () => {
      const predictions = await generateForecastPredictions();
      return { success: true, predictions };
    }),
    getForecasts: protectedProcedure.query(async () => {
      return await getForecastPredictions();
    }),
    sendLowStockAlert: protectedProcedure.mutation(async () => {
      const lowStockMaterials = await getLowStockMaterials();
      if (lowStockMaterials.length === 0) {
        return { success: true, message: "All materials are adequately stocked" };
      }
      const materialsList = lowStockMaterials.map((m) => `- ${m.name}: ${m.quantity} ${m.unit} (minimum: ${m.minStock} ${m.unit})`).join("\n");
      const content = `Low Stock Alert

The following materials have fallen below minimum stock levels:

${materialsList}

Please reorder these materials to avoid project delays.`;
      const { notifyOwner: notifyOwner2 } = await Promise.resolve().then(() => (init_notification(), notification_exports));
      const notified = await notifyOwner2({
        title: `\u26A0\uFE0F Low Stock Alert: ${lowStockMaterials.length} Material(s)`,
        content
      });
      return {
        success: notified,
        materialsCount: lowStockMaterials.length,
        message: notified ? `Alert sent for ${lowStockMaterials.length} low-stock material(s)` : "Failed to send notification"
      };
    }),
    checkCriticalStock: protectedProcedure.query(async () => {
      return await getCriticalStockMaterials();
    }),
    sendCriticalStockSMS: protectedProcedure.mutation(async () => {
      const criticalMaterials = await getCriticalStockMaterials();
      if (criticalMaterials.length === 0) {
        return { success: true, message: "No critical stock alerts needed", smsCount: 0 };
      }
      const adminUsers = await getAdminUsersWithSMS();
      if (adminUsers.length === 0) {
        return { success: false, message: "No managers with SMS notifications enabled", smsCount: 0 };
      }
      const materialsList = criticalMaterials.map((m) => `${m.name}: ${m.quantity}/${m.criticalThreshold} ${m.unit}`).join(", ");
      const smsMessage = `CRITICAL STOCK ALERT: ${criticalMaterials.length} material(s) below critical level. ${materialsList}. Immediate reorder required.`;
      const { sendSMS: sendSMS2 } = await Promise.resolve().then(() => (init_sms(), sms_exports));
      const smsResults = await Promise.all(
        adminUsers.map(
          (user2) => sendSMS2({
            phoneNumber: user2.phoneNumber,
            message: smsMessage
          }).catch((err) => {
            console.error(`Failed to send SMS to ${user2.phoneNumber}:`, err);
            return { success: false };
          })
        )
      );
      const successCount = smsResults.filter((r) => r.success).length;
      return {
        success: successCount > 0,
        materialsCount: criticalMaterials.length,
        smsCount: successCount,
        message: `SMS alerts sent to ${successCount} manager(s) for ${criticalMaterials.length} critical material(s)`
      };
    })
  }),
  deliveries: router({
    list: protectedProcedure.input(z15.object({
      projectId: z15.number().optional(),
      status: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDeliveries(input);
    }),
    create: protectedProcedure.input(z15.object({
      projectId: z15.number().optional(),
      projectName: z15.string(),
      concreteType: z15.string(),
      volume: z15.number(),
      scheduledTime: z15.date(),
      status: z15.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled"),
      driverName: z15.string().optional(),
      vehicleNumber: z15.string().optional(),
      notes: z15.string().optional(),
      gpsLocation: z15.string().optional(),
      deliveryPhotos: z15.string().optional(),
      estimatedArrival: z15.number().optional(),
      actualArrivalTime: z15.number().optional(),
      actualDeliveryTime: z15.number().optional(),
      driverNotes: z15.string().optional(),
      customerName: z15.string().optional(),
      customerPhone: z15.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createDelivery({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      projectId: z15.number().optional(),
      projectName: z15.string().optional(),
      concreteType: z15.string().optional(),
      volume: z15.number().optional(),
      scheduledTime: z15.date().optional(),
      actualTime: z15.date().optional(),
      status: z15.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).optional(),
      driverName: z15.string().optional(),
      vehicleNumber: z15.string().optional(),
      notes: z15.string().optional(),
      gpsLocation: z15.string().optional(),
      deliveryPhotos: z15.string().optional(),
      estimatedArrival: z15.number().optional(),
      actualArrivalTime: z15.number().optional(),
      actualDeliveryTime: z15.number().optional(),
      driverNotes: z15.string().optional(),
      customerName: z15.string().optional(),
      customerPhone: z15.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDelivery(id, data);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z15.object({
      id: z15.number(),
      status: z15.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]),
      gpsLocation: z15.string().optional(),
      driverNotes: z15.string().optional()
    })).mutation(async ({ input }) => {
      const { id, status, gpsLocation, driverNotes } = input;
      const updateData = { status };
      if (gpsLocation) updateData.gpsLocation = gpsLocation;
      if (driverNotes) updateData.driverNotes = driverNotes;
      const now = Math.floor(Date.now() / 1e3);
      if (status === "arrived") updateData.actualArrivalTime = now;
      if (status === "delivered") updateData.actualDeliveryTime = now;
      await updateDelivery(id, updateData);
      return { success: true };
    }),
    uploadDeliveryPhoto: protectedProcedure.input(z15.object({
      deliveryId: z15.number(),
      photoData: z15.string(),
      mimeType: z15.string()
    })).mutation(async ({ input, ctx }) => {
      const photoBuffer = Buffer.from(input.photoData, "base64");
      const fileExtension = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `delivery-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
      const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
      const allDeliveries = await getDeliveries();
      const delivery = allDeliveries.find((d) => d.id === input.deliveryId);
      if (delivery) {
        const existingPhotos = delivery.deliveryPhotos ? JSON.parse(delivery.deliveryPhotos) : [];
        existingPhotos.push(url);
        await updateDelivery(input.deliveryId, { deliveryPhotos: JSON.stringify(existingPhotos) });
      }
      return { success: true, url };
    }),
    getActiveDeliveries: protectedProcedure.query(async () => {
      const deliveries2 = await getDeliveries();
      return deliveries2.filter(
        (d) => ["loaded", "en_route", "arrived", "delivered"].includes(d.status)
      );
    }),
    sendCustomerNotification: protectedProcedure.input(z15.object({
      deliveryId: z15.number(),
      message: z15.string()
    })).mutation(async ({ input }) => {
      const allDeliveries = await getDeliveries();
      const delivery = allDeliveries.find((d) => d.id === input.deliveryId);
      if (!delivery || !delivery.customerPhone) {
        return { success: false, message: "No customer phone number" };
      }
      await updateDelivery(input.deliveryId, { smsNotificationSent: true });
      console.log(`[SMS] To: ${delivery.customerPhone}, Message: ${input.message}`);
      return { success: true, message: "SMS notification sent" };
    })
  }),
  qualityTests: router({
    list: protectedProcedure.input(z15.object({
      projectId: z15.number().optional(),
      deliveryId: z15.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getQualityTests(input);
    }),
    create: protectedProcedure.input(z15.object({
      testName: z15.string(),
      testType: z15.enum(["slump", "strength", "air_content", "temperature", "other"]),
      result: z15.string(),
      unit: z15.string().optional(),
      status: z15.enum(["pass", "fail", "pending"]).default("pending"),
      deliveryId: z15.number().optional(),
      projectId: z15.number().optional(),
      testedBy: z15.string().optional(),
      notes: z15.string().optional(),
      photoUrls: z15.string().optional(),
      // JSON array
      inspectorSignature: z15.string().optional(),
      supervisorSignature: z15.string().optional(),
      testLocation: z15.string().optional(),
      complianceStandard: z15.string().optional(),
      offlineSyncStatus: z15.enum(["synced", "pending", "failed"]).default("synced").optional()
    })).mutation(async ({ input }) => {
      await createQualityTest(input);
      return { success: true };
    }),
    uploadPhoto: protectedProcedure.input(z15.object({
      photoData: z15.string(),
      // Base64 encoded image
      mimeType: z15.string()
    })).mutation(async ({ input, ctx }) => {
      const photoBuffer = Buffer.from(input.photoData, "base64");
      const fileExtension = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `qc-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
      const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
      return { success: true, url };
    }),
    syncOfflineTests: protectedProcedure.input(z15.object({
      tests: z15.array(z15.object({
        testName: z15.string(),
        testType: z15.enum(["slump", "strength", "air_content", "temperature", "other"]),
        result: z15.string(),
        unit: z15.string().optional(),
        status: z15.enum(["pass", "fail", "pending"]),
        deliveryId: z15.number().optional(),
        projectId: z15.number().optional(),
        testedBy: z15.string().optional(),
        notes: z15.string().optional(),
        photoUrls: z15.string().optional(),
        inspectorSignature: z15.string().optional(),
        supervisorSignature: z15.string().optional(),
        testLocation: z15.string().optional(),
        complianceStandard: z15.string().optional()
      }))
    })).mutation(async ({ input }) => {
      for (const test of input.tests) {
        await createQualityTest({ ...test, offlineSyncStatus: "synced" });
      }
      return { success: true, syncedCount: input.tests.length };
    }),
    getFailedTests: protectedProcedure.input(z15.object({
      days: z15.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getFailedQualityTests(input?.days || 30);
    }),
    getTrends: protectedProcedure.input(z15.object({
      days: z15.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getQualityTestTrends(input?.days || 30);
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      testName: z15.string().optional(),
      testType: z15.enum(["slump", "strength", "air_content", "temperature", "other"]).optional(),
      result: z15.string().optional(),
      unit: z15.string().optional(),
      status: z15.enum(["pass", "fail", "pending"]).optional(),
      deliveryId: z15.number().optional(),
      projectId: z15.number().optional(),
      testedBy: z15.string().optional(),
      notes: z15.string().optional(),
      photoUrls: z15.string().optional(),
      inspectorSignature: z15.string().optional(),
      supervisorSignature: z15.string().optional(),
      testLocation: z15.string().optional(),
      complianceStandard: z15.string().optional(),
      offlineSyncStatus: z15.enum(["synced", "pending", "failed"]).optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateQualityTest(id, data);
      return { success: true };
    })
  }),
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const [allProjects, allDocuments, allMaterials, allDeliveries, allTests] = await Promise.all([
        getProjects(),
        getDocuments(),
        getMaterials(),
        getDeliveries(),
        getQualityTests()
      ]);
      const activeProjects = allProjects.filter((p) => p.status === "active").length;
      const totalDocuments = allDocuments.length;
      const lowStockMaterials = allMaterials.filter((m) => m.quantity <= m.minStock).length;
      const todayDeliveries = allDeliveries.filter((d) => {
        const today = /* @__PURE__ */ new Date();
        const schedDate = new Date(d.scheduledTime);
        return schedDate.toDateString() === today.toDateString();
      }).length;
      const pendingTests = allTests.filter((t2) => t2.status === "pending").length;
      return {
        activeProjects,
        totalDocuments,
        lowStockMaterials,
        todayDeliveries,
        pendingTests,
        totalProjects: allProjects.length,
        totalMaterials: allMaterials.length,
        totalDeliveries: allDeliveries.length
      };
    }),
    deliveryTrends: protectedProcedure.query(async () => {
      const deliveries2 = await getDeliveries();
      const now = /* @__PURE__ */ new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyData = {};
      deliveries2.forEach((delivery) => {
        const deliveryDate = new Date(delivery.scheduledTime);
        if (deliveryDate >= sixMonthsAgo) {
          const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, "0")}`;
          const monthName = deliveryDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
      const materials2 = await getMaterials();
      const sortedMaterials = materials2.sort((a, b) => b.quantity - a.quantity).slice(0, 6).map((m) => ({
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
        minStock: m.minStock
      }));
      return sortedMaterials;
    })
  }),
  // Workforce Management
  employees: router({
    list: protectedProcedure.input(z15.object({
      department: z15.string().optional(),
      status: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getEmployees(input);
    }),
    create: protectedProcedure.input(z15.object({
      firstName: z15.string(),
      lastName: z15.string(),
      employeeNumber: z15.string(),
      position: z15.string(),
      department: z15.enum(["construction", "maintenance", "quality", "administration", "logistics"]),
      phoneNumber: z15.string().optional(),
      email: z15.string().optional(),
      hourlyRate: z15.number().optional(),
      status: z15.enum(["active", "inactive", "on_leave"]).default("active"),
      hireDate: z15.date().optional()
    })).mutation(async ({ input }) => {
      return await createEmployee(input);
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      data: z15.object({
        firstName: z15.string().optional(),
        lastName: z15.string().optional(),
        position: z15.string().optional(),
        department: z15.enum(["construction", "maintenance", "quality", "administration", "logistics"]).optional(),
        phoneNumber: z15.string().optional(),
        email: z15.string().optional(),
        hourlyRate: z15.number().optional(),
        status: z15.enum(["active", "inactive", "on_leave"]).optional()
      })
    })).mutation(async ({ input }) => {
      await updateEmployee(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
      await deleteEmployee(input.id);
      return { success: true };
    })
  }),
  workHours: router({
    list: protectedProcedure.input(z15.object({
      employeeId: z15.number().optional(),
      projectId: z15.number().optional(),
      status: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getWorkHours(input);
    }),
    create: protectedProcedure.input(z15.object({
      employeeId: z15.number(),
      projectId: z15.number().optional(),
      date: z15.date(),
      startTime: z15.date(),
      endTime: z15.date().optional(),
      hoursWorked: z15.number().optional(),
      overtimeHours: z15.number().optional(),
      workType: z15.enum(["regular", "overtime", "weekend", "holiday"]).default("regular"),
      notes: z15.string().optional(),
      status: z15.enum(["pending", "approved", "rejected"]).default("pending")
    })).mutation(async ({ input, ctx }) => {
      return await createWorkHour(input);
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      data: z15.object({
        endTime: z15.date().optional(),
        hoursWorked: z15.number().optional(),
        overtimeHours: z15.number().optional(),
        notes: z15.string().optional(),
        status: z15.enum(["pending", "approved", "rejected"]).optional(),
        approvedBy: z15.number().optional()
      })
    })).mutation(async ({ input }) => {
      await updateWorkHour(input.id, input.data);
      return { success: true };
    })
  }),
  // Concrete Base Management
  concreteBases: router({
    list: protectedProcedure.query(async () => {
      return await getConcreteBases();
    }),
    create: protectedProcedure.input(z15.object({
      name: z15.string(),
      location: z15.string(),
      capacity: z15.number(),
      status: z15.enum(["operational", "maintenance", "inactive"]).default("operational"),
      managerName: z15.string().optional(),
      phoneNumber: z15.string().optional()
    })).mutation(async ({ input }) => {
      return await createConcreteBase(input);
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      data: z15.object({
        name: z15.string().optional(),
        location: z15.string().optional(),
        capacity: z15.number().optional(),
        status: z15.enum(["operational", "maintenance", "inactive"]).optional(),
        managerName: z15.string().optional(),
        phoneNumber: z15.string().optional()
      })
    })).mutation(async ({ input }) => {
      await updateConcreteBase(input.id, input.data);
      return { success: true };
    })
  }),
  machines: router({
    list: protectedProcedure.input(z15.object({
      concreteBaseId: z15.number().optional(),
      type: z15.string().optional(),
      status: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachines(input);
    }),
    create: protectedProcedure.input(z15.object({
      name: z15.string(),
      machineNumber: z15.string(),
      type: z15.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]),
      manufacturer: z15.string().optional(),
      model: z15.string().optional(),
      year: z15.number().optional(),
      concreteBaseId: z15.number().optional(),
      status: z15.enum(["operational", "maintenance", "repair", "inactive"]).default("operational")
    })).mutation(async ({ input }) => {
      return await createMachine(input);
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      data: z15.object({
        name: z15.string().optional(),
        type: z15.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]).optional(),
        status: z15.enum(["operational", "maintenance", "repair", "inactive"]).optional(),
        totalWorkingHours: z15.number().optional(),
        lastMaintenanceDate: z15.date().optional(),
        nextMaintenanceDate: z15.date().optional()
      })
    })).mutation(async ({ input }) => {
      await updateMachine(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z15.object({ id: z15.number() })).mutation(async ({ input }) => {
      await deleteMachine(input.id);
      return { success: true };
    })
  }),
  machineMaintenance: router({
    list: protectedProcedure.input(z15.object({
      machineId: z15.number().optional(),
      maintenanceType: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineMaintenance(input);
    }),
    create: protectedProcedure.input(z15.object({
      machineId: z15.number(),
      date: z15.date(),
      maintenanceType: z15.enum(["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]),
      description: z15.string().optional(),
      lubricationType: z15.string().optional(),
      lubricationAmount: z15.number().optional(),
      fuelType: z15.string().optional(),
      fuelAmount: z15.number().optional(),
      cost: z15.number().optional(),
      performedBy: z15.string().optional(),
      hoursAtMaintenance: z15.number().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineMaintenance(input);
    })
  }),
  machineWorkHours: router({
    list: protectedProcedure.input(z15.object({
      machineId: z15.number().optional(),
      projectId: z15.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineWorkHours(input);
    }),
    create: protectedProcedure.input(z15.object({
      machineId: z15.number(),
      projectId: z15.number().optional(),
      date: z15.date(),
      startTime: z15.date(),
      endTime: z15.date().optional(),
      hoursWorked: z15.number().optional(),
      operatorId: z15.number().optional(),
      operatorName: z15.string().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineWorkHour(input);
    })
  }),
  aggregateInputs: router({
    list: protectedProcedure.input(z15.object({
      concreteBaseId: z15.number().optional(),
      materialType: z15.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getAggregateInputs(input);
    }),
    create: protectedProcedure.input(z15.object({
      concreteBaseId: z15.number(),
      date: z15.date(),
      materialType: z15.enum(["cement", "sand", "gravel", "water", "admixture", "other"]),
      materialName: z15.string(),
      quantity: z15.number(),
      unit: z15.string(),
      supplier: z15.string().optional(),
      batchNumber: z15.string().optional(),
      receivedBy: z15.string().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input }) => {
      return await createAggregateInput(input);
    })
  }),
  purchaseOrders: router({
    list: protectedProcedure.input(z15.object({
      status: z15.string().optional(),
      materialId: z15.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getPurchaseOrders(input);
    }),
    create: protectedProcedure.input(z15.object({
      materialId: z15.number(),
      materialName: z15.string(),
      quantity: z15.number(),
      supplier: z15.string().optional(),
      supplierEmail: z15.string().optional(),
      expectedDelivery: z15.date().optional(),
      totalCost: z15.number().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createPurchaseOrder({
        ...input,
        status: "pending",
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z15.object({
      id: z15.number(),
      status: z15.enum(["pending", "approved", "ordered", "received", "cancelled"]).optional(),
      expectedDelivery: z15.date().optional(),
      actualDelivery: z15.date().optional(),
      totalCost: z15.number().optional(),
      notes: z15.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePurchaseOrder(id, data);
      return { success: true };
    }),
    sendToSupplier: protectedProcedure.input(z15.object({
      orderId: z15.number()
    })).mutation(async ({ input }) => {
      const orders = await getPurchaseOrders();
      const order = orders.find((o) => o.id === input.orderId);
      if (!order || !order.supplierEmail) {
        return { success: false, message: "No supplier email found" };
      }
      const materials2 = await getMaterials();
      const material = materials2.find((m) => m.id === order.materialId);
      const unit = material?.unit || "kg";
      const { sendEmail: sendEmail2, generatePurchaseOrderEmailHTML: generatePurchaseOrderEmailHTML2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      const emailHTML = generatePurchaseOrderEmailHTML2({
        id: order.id,
        materialName: order.materialName,
        quantity: order.quantity,
        unit,
        supplier: order.supplier || "Supplier",
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        expectedDelivery: order.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split("T")[0] : null,
        notes: order.notes || null
      });
      const sent = await sendEmail2({
        to: order.supplierEmail,
        subject: `Purchase Order #${order.id} - ${order.materialName}`,
        html: emailHTML
      });
      if (sent) {
        await updatePurchaseOrder(input.orderId, { status: "ordered" });
      }
      return { success: sent };
    })
  }),
  reports: router({
    dailyProduction: protectedProcedure.input(z15.object({
      date: z15.string()
      // YYYY-MM-DD format
    })).query(async ({ input }) => {
      const targetDate = new Date(input.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const allDeliveries = await getDeliveries();
      const completedDeliveries = allDeliveries.filter((d) => {
        if (!d.actualDeliveryTime) return false;
        const deliveryDate = new Date(d.actualDeliveryTime);
        return deliveryDate >= targetDate && deliveryDate < nextDay;
      });
      const totalConcreteProduced = completedDeliveries.reduce((sum, d) => sum + (d.volume || 0), 0);
      const consumptions = await getConsumptionHistory(void 0, 1);
      const dayConsumptions = consumptions.filter((c) => {
        const cDate = new Date(c.consumptionDate);
        return cDate >= targetDate && cDate < nextDay;
      });
      const materials2 = await getMaterials();
      const materialConsumption = dayConsumptions.map((c) => {
        const material = materials2.find((m) => m.id === c.materialId);
        return {
          name: material?.name || "Unknown",
          quantity: c.quantity,
          unit: material?.unit || "units"
        };
      });
      const allTests = await getQualityTests();
      const dayTests = allTests.filter((t2) => {
        const testDate = new Date(t2.createdAt);
        return testDate >= targetDate && testDate < nextDay;
      });
      const qualityTests2 = {
        total: dayTests.length,
        passed: dayTests.filter((t2) => t2.status === "pass").length,
        failed: dayTests.filter((t2) => t2.status === "fail").length
      };
      return {
        date: input.date,
        totalConcreteProduced,
        deliveriesCompleted: completedDeliveries.length,
        materialConsumption,
        qualityTests: qualityTests2
      };
    }),
    sendDailyProductionEmail: protectedProcedure.input(z15.object({
      date: z15.string(),
      recipientEmail: z15.string()
    })).mutation(async ({ input }) => {
      const targetDate = new Date(input.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const allDeliveries = await getDeliveries();
      const completedDeliveries = allDeliveries.filter((d) => {
        if (!d.actualDeliveryTime) return false;
        const deliveryDate = new Date(d.actualDeliveryTime);
        return deliveryDate >= targetDate && deliveryDate < nextDay;
      });
      const totalConcreteProduced = completedDeliveries.reduce((sum, d) => sum + (d.volume || 0), 0);
      const consumptions = await getConsumptionHistory(void 0, 1);
      const dayConsumptions = consumptions.filter((c) => {
        const cDate = new Date(c.consumptionDate);
        return cDate >= targetDate && cDate < nextDay;
      });
      const materials2 = await getMaterials();
      const materialConsumption = dayConsumptions.map((c) => {
        const material = materials2.find((m) => m.id === c.materialId);
        return {
          name: material?.name || "Unknown",
          quantity: c.quantity,
          unit: material?.unit || "units"
        };
      });
      const allTests = await getQualityTests();
      const dayTests = allTests.filter((t2) => {
        const testDate = new Date(t2.createdAt);
        return testDate >= targetDate && testDate < nextDay;
      });
      const qualityTests2 = {
        total: dayTests.length,
        passed: dayTests.filter((t2) => t2.status === "pass").length,
        failed: dayTests.filter((t2) => t2.status === "fail").length
      };
      const settings = await getReportSettings(1);
      const { sendEmail: sendEmail2, generateDailyProductionReportHTML: generateDailyProductionReportHTML2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      const emailHTML = generateDailyProductionReportHTML2({
        date: input.date,
        totalConcreteProduced,
        deliveriesCompleted: completedDeliveries.length,
        materialConsumption,
        qualityTests: qualityTests2
      }, settings ? {
        includeProduction: settings.includeProduction,
        includeDeliveries: settings.includeDeliveries,
        includeMaterials: settings.includeMaterials,
        includeQualityControl: settings.includeQualityControl
      } : void 0);
      const sent = await sendEmail2({
        to: input.recipientEmail,
        subject: `Daily Production Report - ${input.date}`,
        html: emailHTML
      });
      return { success: sent };
    })
  }),
  branding: router({
    get: protectedProcedure.query(async () => {
      return await getEmailBranding();
    }),
    update: protectedProcedure.input(z15.object({
      logoUrl: z15.string().optional(),
      primaryColor: z15.string().optional(),
      secondaryColor: z15.string().optional(),
      companyName: z15.string().optional(),
      footerText: z15.string().optional()
    })).mutation(async ({ input }) => {
      await upsertEmailBranding(input);
      return { success: true };
    }),
    uploadLogo: protectedProcedure.input(z15.object({
      fileData: z15.string(),
      // base64 encoded image
      fileName: z15.string(),
      mimeType: z15.string()
    })).mutation(async ({ input }) => {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!allowedTypes.includes(input.mimeType)) {
        throw new Error("Invalid file type. Only PNG, JPG, and SVG are allowed.");
      }
      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length > 2 * 1024 * 1024) {
        throw new Error("File size must be less than 2MB");
      }
      const fileKey = `branding/logo-${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await upsertEmailBranding({ logoUrl: url });
      return { url };
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user2 = null;
  try {
    const syncedUser = await syncClerkUser(opts.req);
    user2 = syncedUser;
  } catch (error) {
    user2 = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user: user2
  };
}

// server/_core/vite.ts
import express from "express";
import fs3 from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path4 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path3.resolve(import.meta.dirname),
  root: path3.resolve(import.meta.dirname, "client"),
  publicDir: path3.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
function serveStatic(app) {
  const distPath = path4.resolve(import.meta.dirname, "../..", "dist", "public");
  if (!fs3.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/_core/triggerJobs.ts
async function checkAllMaterialStockLevels() {
  try {
    console.log("[TriggerJobs] Checking all material stock levels...");
    const materials2 = await getMaterials();
    for (const material of materials2) {
      if (material.quantity < material.minStock || material.criticalThreshold && material.quantity < material.criticalThreshold) {
        await checkStockLevelTriggers(material.id);
      }
    }
    console.log(`[TriggerJobs] Checked ${materials2.length} materials for stock levels`);
  } catch (error) {
    console.error("[TriggerJobs] Error checking material stock levels:", error);
  }
}
async function checkAllOverdueTasks() {
  try {
    console.log("[TriggerJobs] Checking for overdue tasks...");
    const users2 = await getAdminUsersWithSMS();
    for (const user2 of users2) {
      const overdueTasks = await getOverdueTasks(user2.id);
      if (overdueTasks.length > 0) {
        await checkOverdueTaskTriggers(user2.id);
      }
    }
    console.log(`[TriggerJobs] Checked overdue tasks for ${users2.length} users`);
  } catch (error) {
    console.error("[TriggerJobs] Error checking overdue tasks:", error);
  }
}
async function checkDelayedDeliveries() {
  try {
    console.log("[TriggerJobs] Checking for delayed deliveries...");
    const deliveries2 = await getDeliveries();
    const now = Date.now();
    for (const delivery of deliveries2) {
      if (delivery.status !== "completed" && delivery.status !== "cancelled") {
        const scheduledTime = new Date(delivery.scheduledTime).getTime();
        if (now > scheduledTime) {
          await checkDeliveryStatusTriggers(delivery.id);
        }
      }
    }
    console.log(`[TriggerJobs] Checked ${deliveries2.length} deliveries for delays`);
  } catch (error) {
    console.error("[TriggerJobs] Error checking delayed deliveries:", error);
  }
}
async function checkFailedQualityTests() {
  try {
    console.log("[TriggerJobs] Checking for failed quality tests...");
    const tests = await getQualityTests();
    for (const test of tests) {
      if (test.status === "fail") {
        await checkQualityTestTriggers(test.id);
      }
    }
    console.log(`[TriggerJobs] Checked ${tests.length} quality tests`);
  } catch (error) {
    console.error("[TriggerJobs] Error checking failed quality tests:", error);
  }
}
function initializeTriggerJobs() {
  console.log("[TriggerJobs] Initializing trigger evaluation jobs...");
  setInterval(checkAllMaterialStockLevels, 60 * 60 * 1e3);
  const now = /* @__PURE__ */ new Date();
  const next9AM = /* @__PURE__ */ new Date();
  next9AM.setHours(9, 0, 0, 0);
  if (now.getHours() >= 9) {
    next9AM.setDate(next9AM.getDate() + 1);
  }
  const msUntil9AM = next9AM.getTime() - now.getTime();
  setTimeout(() => {
    checkAllOverdueTasks();
    setInterval(checkAllOverdueTasks, 24 * 60 * 60 * 1e3);
  }, msUntil9AM);
  setInterval(checkDelayedDeliveries, 30 * 60 * 1e3);
  setInterval(checkFailedQualityTests, 2 * 60 * 60 * 1e3);
  setTimeout(() => {
    checkAllMaterialStockLevels();
    checkDelayedDeliveries();
    checkFailedQualityTests();
  }, 60 * 1e3);
  console.log("[TriggerJobs] Trigger evaluation jobs initialized");
  console.log("  - Material stock levels: every hour");
  console.log("  - Overdue tasks: daily at 9 AM");
  console.log("  - Delayed deliveries: every 30 minutes");
  console.log("  - Failed quality tests: every 2 hours");
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  console.log("Starting server initialization...");
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerClerkRoutes(app);
  app.use("/api/*", (req, res, next) => {
    if (req.path === "/api/clerk/health" || req.path === "/api/clerk/webhook") {
      return next();
    }
    clerkAuthMiddleware(req, res, next);
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  serveStatic(app);
  console.log("Finding available port...");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    initializeTriggerJobs();
  });
}
startServer().catch(console.error);
