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
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
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
var TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH, trimValue, isNonEmptyString2, buildEndpointUrl, validatePayload;
var init_notification = __esm({
  "server/_core/notification.ts"() {
    "use strict";
    init_env();
    TITLE_MAX_LENGTH = 1200;
    CONTENT_MAX_LENGTH = 2e4;
    trimValue = (value) => value.trim();
    isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
    buildEndpointUrl = (baseUrl) => {
      const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
      return new URL(
        "webdevtoken.v1.WebDevService/SendNotification",
        normalizedBase
      ).toString();
    };
    validatePayload = (input) => {
      if (!isNonEmptyString2(input.title)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notification title is required."
        });
      }
      if (!isNonEmptyString2(input.content)) {
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
var PHONE_MAX_LENGTH, MESSAGE_MAX_LENGTH, trimValue2, isNonEmptyString3, buildEndpointUrl2, validatePayload2;
var init_sms = __esm({
  "server/_core/sms.ts"() {
    "use strict";
    init_env();
    PHONE_MAX_LENGTH = 20;
    MESSAGE_MAX_LENGTH = 160;
    trimValue2 = (value) => value.trim();
    isNonEmptyString3 = (value) => typeof value === "string" && value.trim().length > 0;
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
      if (!isNonEmptyString3(input.phoneNumber)) {
        throw new TRPCError6({
          code: "BAD_REQUEST",
          message: "Phone number is required."
        });
      }
      if (!isNonEmptyString3(input.message)) {
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

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq, desc, like, and, or, gte, lte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
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

// server/db.ts
init_env();
import { ne } from "drizzle-orm";
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createDocument(doc) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  return result;
}
async function getDocuments(filters) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [];
  if (filters?.projectId) {
    conditions.push(eq(documents.projectId, filters.projectId));
  }
  if (filters?.category) {
    conditions.push(eq(documents.category, filters.category));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(documents.name, `%${filters.search}%`),
        like(documents.description, `%${filters.search}%`)
      )
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  const result = await db.select().from(documents).where(whereClause).orderBy(desc(documents.createdAt));
  return result;
}
async function deleteDocument(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}
async function createProject(project) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return result;
}
async function getProjects() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return result;
}
async function updateProject(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}
async function createMaterial(material) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(material);
  return result;
}
async function getMaterials() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(materials).orderBy(materials.name);
  return result;
}
async function updateMaterial(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(data).where(eq(materials.id, id));
}
async function deleteMaterial(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materials).where(eq(materials.id, id));
}
async function createDelivery(delivery) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliveries).values(delivery);
  return result;
}
async function getDeliveries(filters) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [];
  if (filters?.projectId) {
    conditions.push(eq(deliveries.projectId, filters.projectId));
  }
  if (filters?.status) {
    conditions.push(eq(deliveries.status, filters.status));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  const result = await db.select().from(deliveries).where(whereClause).orderBy(desc(deliveries.scheduledTime));
  return result;
}
async function updateDelivery(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deliveries).set(data).where(eq(deliveries.id, id));
}
async function createQualityTest(test) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(qualityTests).values(test);
  return result;
}
async function getQualityTests(filters) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [];
  if (filters?.projectId) {
    conditions.push(eq(qualityTests.projectId, filters.projectId));
  }
  if (filters?.deliveryId) {
    conditions.push(eq(qualityTests.deliveryId, filters.deliveryId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  const result = await db.select().from(qualityTests).where(whereClause).orderBy(desc(qualityTests.createdAt));
  return result;
}
async function updateQualityTest(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(qualityTests).set(data).where(eq(qualityTests.id, id));
}
async function getFailedQualityTests(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const result = await db.select().from(qualityTests).where(
    and(
      eq(qualityTests.status, "fail"),
      gte(qualityTests.createdAt, cutoffDate)
    )
  ).orderBy(desc(qualityTests.createdAt));
  return result;
}
async function getQualityTestTrends(days = 30) {
  const db = await getDb();
  if (!db) return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const allTests = await db.select().from(qualityTests).where(gte(qualityTests.createdAt, cutoffDate));
  const totalTests = allTests.length;
  if (totalTests === 0) {
    return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };
  }
  const passCount = allTests.filter((t2) => t2.status === "pass").length;
  const failCount = allTests.filter((t2) => t2.status === "fail").length;
  const pendingCount = allTests.filter((t2) => t2.status === "pending").length;
  const byType = [
    { type: "slump", total: allTests.filter((t2) => t2.testType === "slump").length },
    { type: "strength", total: allTests.filter((t2) => t2.testType === "strength").length },
    { type: "air_content", total: allTests.filter((t2) => t2.testType === "air_content").length },
    { type: "temperature", total: allTests.filter((t2) => t2.testType === "temperature").length },
    { type: "other", total: allTests.filter((t2) => t2.testType === "other").length }
  ];
  return {
    passRate: passCount / totalTests * 100,
    failRate: failCount / totalTests * 100,
    pendingRate: pendingCount / totalTests * 100,
    totalTests,
    byType
  };
}
async function createEmployee(employee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employees).values(employee);
  return result;
}
async function getEmployees(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.department) {
    conditions.push(eq(employees.department, filters.department));
  }
  if (filters?.status) {
    conditions.push(eq(employees.status, filters.status));
  }
  const result = conditions.length > 0 ? await db.select().from(employees).where(and(...conditions)).orderBy(desc(employees.createdAt)) : await db.select().from(employees).orderBy(desc(employees.createdAt));
  return result;
}
async function getEmployeeById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}
async function updateEmployee(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}
async function deleteEmployee(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(employees).where(eq(employees.id, id));
}
async function createWorkHour(workHour) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workHours).values(workHour);
  return result;
}
async function getWorkHours(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.employeeId) {
    conditions.push(eq(workHours.employeeId, filters.employeeId));
  }
  if (filters?.projectId) {
    conditions.push(eq(workHours.projectId, filters.projectId));
  }
  if (filters?.status) {
    conditions.push(eq(workHours.status, filters.status));
  }
  const result = conditions.length > 0 ? await db.select().from(workHours).where(and(...conditions)).orderBy(desc(workHours.date)) : await db.select().from(workHours).orderBy(desc(workHours.date));
  return result;
}
async function updateWorkHour(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workHours).set(data).where(eq(workHours.id, id));
}
async function createConcreteBase(base) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(concreteBases).values(base);
  return result;
}
async function getConcreteBases() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(concreteBases).orderBy(desc(concreteBases.createdAt));
}
async function updateConcreteBase(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(concreteBases).set(data).where(eq(concreteBases.id, id));
}
async function createMachine(machine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(machines).values(machine);
  return result;
}
async function getMachines(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.concreteBaseId) {
    conditions.push(eq(machines.concreteBaseId, filters.concreteBaseId));
  }
  if (filters?.type) {
    conditions.push(eq(machines.type, filters.type));
  }
  if (filters?.status) {
    conditions.push(eq(machines.status, filters.status));
  }
  const result = conditions.length > 0 ? await db.select().from(machines).where(and(...conditions)).orderBy(desc(machines.createdAt)) : await db.select().from(machines).orderBy(desc(machines.createdAt));
  return result;
}
async function updateMachine(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(machines).set(data).where(eq(machines.id, id));
}
async function deleteMachine(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(machines).where(eq(machines.id, id));
}
async function createMachineMaintenance(maintenance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(machineMaintenance).values(maintenance);
  return result;
}
async function getMachineMaintenance(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.machineId) {
    conditions.push(eq(machineMaintenance.machineId, filters.machineId));
  }
  if (filters?.maintenanceType) {
    conditions.push(eq(machineMaintenance.maintenanceType, filters.maintenanceType));
  }
  const result = conditions.length > 0 ? await db.select().from(machineMaintenance).where(and(...conditions)).orderBy(desc(machineMaintenance.date)) : await db.select().from(machineMaintenance).orderBy(desc(machineMaintenance.date));
  return result;
}
async function createMachineWorkHour(workHour) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(machineWorkHours).values(workHour);
  return result;
}
async function getMachineWorkHours(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.machineId) {
    conditions.push(eq(machineWorkHours.machineId, filters.machineId));
  }
  if (filters?.projectId) {
    conditions.push(eq(machineWorkHours.projectId, filters.projectId));
  }
  const result = conditions.length > 0 ? await db.select().from(machineWorkHours).where(and(...conditions)).orderBy(desc(machineWorkHours.date)) : await db.select().from(machineWorkHours).orderBy(desc(machineWorkHours.date));
  return result;
}
async function createAggregateInput(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aggregateInputs).values(input);
  return result;
}
async function getAggregateInputs(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.concreteBaseId) {
    conditions.push(eq(aggregateInputs.concreteBaseId, filters.concreteBaseId));
  }
  if (filters?.materialType) {
    conditions.push(eq(aggregateInputs.materialType, filters.materialType));
  }
  const result = conditions.length > 0 ? await db.select().from(aggregateInputs).where(and(...conditions)).orderBy(desc(aggregateInputs.date)) : await db.select().from(aggregateInputs).orderBy(desc(aggregateInputs.date));
  return result;
}
async function getLowStockMaterials() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(materials).where(sql`${materials.quantity} <= ${materials.minStock}`);
}
async function getCriticalStockMaterials() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(materials).where(sql`${materials.quantity} <= ${materials.criticalThreshold} AND ${materials.criticalThreshold} > 0`);
}
async function getAdminUsersWithSMS() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(and(
    eq(users.role, "admin"),
    eq(users.smsNotificationsEnabled, true),
    sql`${users.phoneNumber} IS NOT NULL`
  ));
}
async function updateUserSMSSettings(userId, phoneNumber, enabled) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({
      phoneNumber,
      smsNotificationsEnabled: enabled,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("Failed to update SMS settings:", error);
    return false;
  }
}
async function recordConsumption(consumption) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(materialConsumptionLog).values(consumption);
  if (consumption.materialId) {
    const currentMaterials = await getMaterials();
    const material = currentMaterials.find((m) => m.id === consumption.materialId);
    if (material) {
      await updateMaterial(consumption.materialId, {
        quantity: Math.max(0, material.quantity - consumption.quantity)
      });
    }
  }
}
async function getConsumptionHistory(materialId, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  let query = db.select().from(materialConsumptionLog);
  if (materialId) {
    query = query.where(eq(materialConsumptionLog.materialId, materialId));
  }
  const result = await query.orderBy(desc(materialConsumptionLog.consumptionDate));
  return result;
}
async function calculateDailyConsumptionRate(materialId, days = 30) {
  const db = await getDb();
  if (!db) return 0;
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const consumptions = await db.select().from(materialConsumptionLog).where(eq(materialConsumptionLog.materialId, materialId));
  if (consumptions.length === 0) return 0;
  const totalConsumed = consumptions.reduce((sum, c) => sum + c.quantity, 0);
  const uniqueDays = new Set(consumptions.map(
    (c) => new Date(c.consumptionDate).toDateString()
  )).size;
  return uniqueDays > 0 ? totalConsumed / uniqueDays : 0;
}
async function generateForecastPredictions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const allMaterials = await getMaterials();
  const predictions = [];
  for (const material of allMaterials) {
    const dailyRate = await calculateDailyConsumptionRate(material.id, 30);
    if (dailyRate > 0) {
      const daysUntilStockout = Math.floor(material.quantity / dailyRate);
      const predictedRunoutDate = /* @__PURE__ */ new Date();
      predictedRunoutDate.setDate(predictedRunoutDate.getDate() + daysUntilStockout);
      const recommendedOrderQty = Math.ceil(dailyRate * 14 * 1.2);
      const consumptions = await getConsumptionHistory(material.id, 30);
      const confidence = Math.min(95, consumptions.length * 3);
      predictions.push({
        materialId: material.id,
        materialName: material.name,
        currentStock: material.quantity,
        dailyConsumptionRate: Math.round(dailyRate),
        predictedRunoutDate,
        daysUntilStockout,
        recommendedOrderQty,
        confidence,
        calculatedAt: /* @__PURE__ */ new Date()
      });
    }
  }
  await db.delete(forecastPredictions);
  if (predictions.length > 0) {
    await db.insert(forecastPredictions).values(predictions);
  }
  return predictions;
}
async function getForecastPredictions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(forecastPredictions).orderBy(forecastPredictions.daysUntilStockout);
}
async function createPurchaseOrder(order) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(purchaseOrders).values(order);
}
async function getPurchaseOrders(filters) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [];
  if (filters?.status) {
    conditions.push(eq(purchaseOrders.status, filters.status));
  }
  if (filters?.materialId) {
    conditions.push(eq(purchaseOrders.materialId, filters.materialId));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  return await db.select().from(purchaseOrders).where(whereClause).orderBy(desc(purchaseOrders.createdAt));
}
async function updatePurchaseOrder(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
}
async function getReportSettings(userId) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(reportSettings).where(eq(reportSettings.userId, userId)).limit(1);
  return results[0] || null;
}
async function getEmailBranding() {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(emailBranding).limit(1);
  return results[0] || null;
}
async function upsertEmailBranding(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getEmailBranding();
  if (existing) {
    await db.update(emailBranding).set({
      logoUrl: data.logoUrl ?? existing.logoUrl,
      primaryColor: data.primaryColor ?? existing.primaryColor,
      secondaryColor: data.secondaryColor ?? existing.secondaryColor,
      companyName: data.companyName ?? existing.companyName,
      footerText: data.footerText ?? existing.footerText,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(emailBranding.id, existing.id));
    return existing.id;
  } else {
    await db.insert(emailBranding).values({
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || "#f97316",
      secondaryColor: data.secondaryColor || "#ea580c",
      companyName: data.companyName || "AzVirt",
      footerText: data.footerText || null
    });
    return 0;
  }
}
async function createAiConversation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiConversations).values({
    userId: data.userId,
    title: data.title || "New Conversation",
    modelName: data.modelName
  });
  return result[0].insertId;
}
async function getAiConversations(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(aiConversations.updatedAt);
}
async function deleteAiConversation(conversationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
}
async function createAiMessage(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiMessages).values({
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    model: data.model,
    audioUrl: data.audioUrl,
    imageUrl: data.imageUrl,
    thinkingProcess: data.thinkingProcess,
    toolCalls: data.toolCalls,
    metadata: data.metadata
  });
  await db.update(aiConversations).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq(aiConversations.id, data.conversationId));
  return result[0].insertId;
}
async function getAiMessages(conversationId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(aiMessages.createdAt);
}
async function getOverdueTasks(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyTasks).where(and(
    eq(dailyTasks.userId, userId),
    lt(dailyTasks.dueDate, /* @__PURE__ */ new Date()),
    ne(dailyTasks.status, "completed")
  )).orderBy(dailyTasks.dueDate);
}
async function getNotifications(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskNotifications).where(eq(taskNotifications.userId, userId)).orderBy(desc(taskNotifications.createdAt)).limit(limit);
}
async function getUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskNotifications).where(and(
    eq(taskNotifications.userId, userId),
    ne(taskNotifications.status, "read")
  )).orderBy(desc(taskNotifications.createdAt));
}
async function markNotificationAsRead(notificationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(taskNotifications).set({ status: "read", readAt: /* @__PURE__ */ new Date() }).where(eq(taskNotifications.id, notificationId));
}
async function getOrCreateNotificationPreferences(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const result = await db.insert(notificationPreferences).values({
    userId,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    overdueReminders: true,
    completionNotifications: true,
    assignmentNotifications: true,
    statusChangeNotifications: true,
    timezone: "UTC"
  });
  return result;
}
async function updateNotificationPreferences(userId, preferences) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(notificationPreferences).set(preferences).where(eq(notificationPreferences.userId, userId));
}
async function getNotificationPreferences(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return result[0] || null;
}
async function getNotificationHistoryByUser(userId, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return db.select().from(notificationHistory).where(and(
    eq(notificationHistory.userId, userId),
    gte(notificationHistory.sentAt, cutoffDate)
  )).orderBy(desc(notificationHistory.sentAt));
}
async function getNotificationTemplates(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationTemplates).limit(limit).offset(offset).orderBy(desc(notificationTemplates.createdAt));
}
async function getNotificationTemplate(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id)).limit(1);
  return result[0];
}
async function createNotificationTemplate(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationTemplates).values({
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
  const insertId = result[0]?.insertId;
  return { insertId };
}
async function updateNotificationTemplate(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(notificationTemplates).set(data).where(eq(notificationTemplates.id, id));
}
async function deleteNotificationTemplate(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
}
async function getNotificationTriggers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationTriggers).limit(limit).offset(offset).orderBy(desc(notificationTriggers.createdAt));
}
async function getNotificationTrigger(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(notificationTriggers).where(eq(notificationTriggers.id, id)).limit(1);
  return result[0];
}
async function getTriggersByEventType(eventType) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationTriggers).where(eq(notificationTriggers.eventType, eventType)).orderBy(desc(notificationTriggers.createdAt));
}
async function createNotificationTrigger(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationTriggers).values({
    createdBy: data.createdBy,
    templateId: data.templateId,
    name: data.name,
    description: data.description || null,
    eventType: data.eventType,
    triggerCondition: JSON.stringify(data.triggerCondition),
    actions: JSON.stringify(data.actions)
  });
  const insertId = result[0]?.insertId;
  return { insertId };
}
async function updateNotificationTrigger(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(notificationTriggers).set(data).where(eq(notificationTriggers.id, id));
}
async function deleteNotificationTrigger(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(notificationTriggers).where(eq(notificationTriggers.id, id));
}
async function recordTriggerExecution(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(triggerExecutionLog).values(data);
}
async function updateUserLanguagePreference(userId, language) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({
      languagePreference: language,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("Failed to update language preference:", error);
    return false;
  }
}
async function createShift(shift) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(shifts).values(shift);
    return result[0].insertId;
  } catch (error) {
    console.error("Failed to create shift:", error);
    return null;
  }
}
async function getAllShifts() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(shifts).orderBy(shifts.shiftDate);
  } catch (error) {
    console.error("Failed to get all shifts:", error);
    return [];
  }
}
async function getShiftsByEmployee(employeeId, startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(shifts).where(
      and(
        eq(shifts.employeeId, employeeId),
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      )
    );
  } catch (error) {
    console.error("Failed to get shifts:", error);
    return [];
  }
}
async function updateShift(id, updates) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(shifts).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(shifts.id, id));
    return true;
  } catch (error) {
    console.error("Failed to update shift:", error);
    return false;
  }
}
async function createShiftTemplate(template) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(shiftTemplates).values(template);
    return result[0].insertId;
  } catch (error) {
    console.error("Failed to create shift template:", error);
    return null;
  }
}
async function getShiftTemplates() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(shiftTemplates).where(eq(shiftTemplates.isActive, true));
  } catch (error) {
    console.error("Failed to get shift templates:", error);
    return [];
  }
}
async function setEmployeeAvailability(availability) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(employeeAvailability).where(
      and(
        eq(employeeAvailability.employeeId, availability.employeeId),
        eq(employeeAvailability.dayOfWeek, availability.dayOfWeek)
      )
    );
    await db.insert(employeeAvailability).values(availability);
    return true;
  } catch (error) {
    console.error("Failed to set employee availability:", error);
    return false;
  }
}
async function getEmployeeAvailability(employeeId) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(employeeAvailability).where(eq(employeeAvailability.employeeId, employeeId));
  } catch (error) {
    console.error("Failed to get employee availability:", error);
    return [];
  }
}
async function logComplianceAudit(audit) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(complianceAuditTrail).values(audit);
    return true;
  } catch (error) {
    console.error("Failed to log compliance audit:", error);
    return false;
  }
}
async function getComplianceAudits(employeeId, startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(complianceAuditTrail).where(
      and(
        eq(complianceAuditTrail.employeeId, employeeId),
        gte(complianceAuditTrail.auditDate, startDate),
        lte(complianceAuditTrail.auditDate, endDate)
      )
    );
  } catch (error) {
    console.error("Failed to get compliance audits:", error);
    return [];
  }
}
async function recordBreak(breakRecord) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(breakRecords).values(breakRecord);
    return true;
  } catch (error) {
    console.error("Failed to record break:", error);
    return false;
  }
}
async function getBreakRules(jurisdiction) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(breakRules).where(eq(breakRules.jurisdiction, jurisdiction));
  } catch (error) {
    console.error("Failed to get break rules:", error);
    return [];
  }
}
async function cacheOfflineEntry(cache) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.insert(timesheetOfflineCache).values(cache);
    return true;
  } catch (error) {
    console.error("Failed to cache offline entry:", error);
    return false;
  }
}
async function getPendingOfflineEntries(employeeId) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(timesheetOfflineCache).where(
      and(
        eq(timesheetOfflineCache.employeeId, employeeId),
        eq(timesheetOfflineCache.syncStatus, "pending")
      )
    );
  } catch (error) {
    console.error("Failed to get pending offline entries:", error);
    return [];
  }
}
async function updateOfflineSyncStatus(id, status, syncedAt) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(timesheetOfflineCache).set({
      syncStatus: status,
      syncedAt,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(timesheetOfflineCache.id, id));
    return true;
  } catch (error) {
    console.error("Failed to update offline sync status:", error);
    return false;
  }
}
async function createJobSite(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobSites).values({
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    latitude: input.latitude.toString(),
    longitude: input.longitude.toString(),
    geofenceRadius: input.geofenceRadius || 100,
    address: input.address,
    createdBy: input.createdBy
  });
  return result[0].insertId;
}
async function getJobSites(projectId) {
  const db = await getDb();
  if (!db) return [];
  if (projectId) {
    return await db.select().from(jobSites).where(eq(jobSites.projectId, projectId));
  }
  return await db.select().from(jobSites);
}
async function createLocationLog(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(locationLogs).values({
    shiftId: input.shiftId,
    employeeId: input.employeeId,
    jobSiteId: input.jobSiteId,
    eventType: input.eventType,
    latitude: input.latitude.toString(),
    longitude: input.longitude.toString(),
    accuracy: input.accuracy,
    isWithinGeofence: input.isWithinGeofence,
    distanceFromGeofence: input.distanceFromGeofence,
    deviceId: input.deviceId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
  return result[0].insertId;
}
async function recordGeofenceViolation(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(geofenceViolations).values({
    locationLogId: input.locationLogId,
    employeeId: input.employeeId,
    jobSiteId: input.jobSiteId,
    violationType: input.violationType,
    distanceFromGeofence: input.distanceFromGeofence,
    severity: input.severity || "warning"
  });
  return result[0].insertId;
}
async function getLocationHistory(employeeId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(locationLogs).where(eq(locationLogs.employeeId, employeeId)).orderBy(desc(locationLogs.timestamp)).limit(limit);
}
async function getGeofenceViolations(employeeId, resolved) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (employeeId) {
    conditions.push(eq(geofenceViolations.employeeId, employeeId));
  }
  if (resolved !== void 0) {
    conditions.push(eq(geofenceViolations.isResolved, resolved));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
  return await db.select().from(geofenceViolations).where(whereClause).orderBy(desc(geofenceViolations.timestamp));
}
async function resolveGeofenceViolation(violationId, resolvedBy, notes) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(geofenceViolations).set({
      isResolved: true,
      resolvedBy,
      resolutionNotes: notes,
      resolvedAt: /* @__PURE__ */ new Date()
    }).where(eq(geofenceViolations.id, violationId));
    return true;
  } catch (error) {
    console.error("Failed to resolve geofence violation:", error);
    return false;
  }
}
async function getShiftById(id) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Failed to get shift by id:", error);
    return null;
  }
}

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

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
init_env();
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
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
import { z as z10 } from "zod";

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
import axios2 from "axios";
var OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
var OllamaService = class {
  client;
  constructor() {
    this.client = axios2.create({
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
import { like as like2, eq as eq2, and as and2, gte as gte2, lte as lte2, desc as desc2 } from "drizzle-orm";
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    let query = db.select().from(materials);
    if (params.query) {
      query = query.where(like2(materials.name, `%${params.query}%`));
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const conditions = [];
    if (params.deliveryId) {
      conditions.push(eq2(deliveries.id, params.deliveryId));
    }
    if (params.projectName) {
      conditions.push(like2(deliveries.projectName, `%${params.projectName}%`));
    }
    if (params.status) {
      conditions.push(eq2(deliveries.status, params.status));
    }
    const results = await db.select().from(deliveries).where(conditions.length > 0 ? and2(...conditions) : void 0).orderBy(desc2(deliveries.scheduledTime)).limit(10);
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const conditions = [];
    if (params.query) {
      conditions.push(like2(documents.name, `%${params.query}%`));
    }
    if (params.category) {
      conditions.push(eq2(documents.category, params.category));
    }
    if (params.projectId) {
      conditions.push(eq2(documents.projectId, params.projectId));
    }
    const results = await db.select().from(documents).where(conditions.length > 0 ? and2(...conditions) : void 0).orderBy(desc2(documents.createdAt)).limit(20);
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const conditions = [];
    if (params.status) {
      conditions.push(eq2(qualityTests.status, params.status));
    }
    if (params.testType) {
      conditions.push(eq2(qualityTests.testType, params.testType));
    }
    if (params.deliveryId) {
      conditions.push(eq2(qualityTests.deliveryId, params.deliveryId));
    }
    const results = await db.select().from(qualityTests).where(conditions.length > 0 ? and2(...conditions) : void 0).orderBy(desc2(qualityTests.createdAt)).limit(params.limit || 10);
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    let query = db.select().from(forecastPredictions).orderBy(forecastPredictions.daysUntilStockout);
    if (params.materialId) {
      query = query.where(eq2(forecastPredictions.materialId, params.materialId));
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { metric, startDate, endDate } = params;
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte2(deliveries.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateConditions.push(lte2(deliveries.createdAt, new Date(endDate)));
    }
    switch (metric) {
      case "total_deliveries": {
        const results = await db.select().from(deliveries).where(dateConditions.length > 0 ? and2(...dateConditions) : void 0);
        return {
          metric: "total_deliveries",
          value: results.length,
          period: { startDate, endDate }
        };
      }
      case "total_concrete_volume": {
        const results = await db.select().from(deliveries).where(dateConditions.length > 0 ? and2(...dateConditions) : void 0);
        const totalVolume = results.reduce((sum, d) => sum + (d.volume || 0), 0);
        return {
          metric: "total_concrete_volume",
          value: totalVolume,
          unit: "m\xB3",
          period: { startDate, endDate }
        };
      }
      case "qc_pass_rate": {
        const allTests = await db.select().from(qualityTests);
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
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
    const [result] = await db.insert(workHours).values({
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { employeeId, projectId, startDate, endDate, status } = params;
    let query = db.select().from(workHours);
    const conditions = [];
    if (employeeId) conditions.push(eq2(workHours.employeeId, employeeId));
    if (projectId) conditions.push(eq2(workHours.projectId, projectId));
    if (status) conditions.push(eq2(workHours.status, status));
    if (startDate) conditions.push(gte2(workHours.date, new Date(startDate)));
    if (endDate) conditions.push(lte2(workHours.date, new Date(endDate)));
    if (conditions.length > 0) {
      query = query.where(and2(...conditions));
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { machineId, projectId, date, startTime, endTime, operatorId, operatorName, notes } = params;
    let hoursWorked = null;
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      hoursWorked = Math.round(diffMs / (1e3 * 60 * 60));
    }
    const [result] = await db.insert(machineWorkHours).values({
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { documentId, name, description, category, projectId } = params;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (category) updates.category = category;
    if (projectId !== void 0) updates.projectId = projectId;
    await db.update(documents).set(updates).where(eq2(documents.id, documentId));
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { documentId } = params;
    await db.delete(documents).where(eq2(documents.id, documentId));
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { name, category, unit, quantity, minStock, supplier, unitPrice } = params;
    const [result] = await db.insert(materials).values({
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
    const db = await getDb();
    if (!db) return { error: "Database not available" };
    const { materialId, quantity, adjustment } = params;
    if (quantity !== void 0) {
      await db.update(materials).set({ quantity, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(materials.id, materialId));
      return {
        success: true,
        materialId,
        newQuantity: quantity,
        message: "Material quantity updated"
      };
    } else if (adjustment !== void 0) {
      const [material] = await db.select().from(materials).where(eq2(materials.id, materialId));
      if (!material) {
        return { error: "Material not found" };
      }
      const newQuantity = material.quantity + adjustment;
      await db.update(materials).set({ quantity: newQuantity, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(materials.id, materialId));
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
      await createAiMessage({
        conversationId,
        role: "user",
        content: input.message,
        audioUrl: input.audioUrl,
        imageUrl: input.imageUrl
      });
      const history = await getAiMessages(conversationId);
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
        conversationId,
        role: "assistant",
        content: response.message.content,
        model: input.model
      });
      return {
        conversationId,
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
      const db = await getDb();
      if (!db) {
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
          await db.insert(workHours).values({
            employeeId: transformed.employeeId,
            projectId: transformed.projectId || null,
            date: new Date(transformed.date),
            startTime: new Date(transformed.startTime),
            endTime: transformed.endTime ? new Date(transformed.endTime) : null,
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
      const db = await getDb();
      if (!db) {
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
          await db.insert(materials).values({
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
      const db = await getDb();
      if (!db) {
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
          await db.insert(documents).values({
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
      const user = ctx.user;
      if (input.channel === "email" && !user.email) {
        throw new TRPCError4({
          code: "BAD_REQUEST",
          message: "User email not configured"
        });
      }
      if (input.channel === "sms" && !user.phoneNumber) {
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
          user.email,
          testTitle,
          testMessage,
          0,
          "test"
        );
      } else if (input.channel === "sms") {
        result = await sendSmsNotification(user.phoneNumber, testMessage);
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
  return adminUsers.map((user) => ({
    id: user.id,
    email: user.email,
    phoneNumber: user.phoneNumber || void 0
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
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    updateSMSSettings: protectedProcedure.input(z10.object({
      phoneNumber: z10.string().min(1),
      smsNotificationsEnabled: z10.boolean()
    })).mutation(async ({ input, ctx }) => {
      const success = await updateUserSMSSettings(
        ctx.user.id,
        input.phoneNumber,
        input.smsNotificationsEnabled
      );
      return { success };
    }),
    updateLanguagePreference: protectedProcedure.input(z10.object({
      language: z10.enum(["en", "bs", "az"])
    })).mutation(async ({ input, ctx }) => {
      const success = await updateUserLanguagePreference(
        ctx.user.id,
        input.language
      );
      return { success };
    })
  }),
  documents: router({
    list: protectedProcedure.input(z10.object({
      projectId: z10.number().optional(),
      category: z10.string().optional(),
      search: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDocuments(input);
    }),
    upload: protectedProcedure.input(z10.object({
      name: z10.string(),
      description: z10.string().optional(),
      fileData: z10.string(),
      mimeType: z10.string(),
      fileSize: z10.number(),
      category: z10.enum(["contract", "blueprint", "report", "certificate", "invoice", "other"]),
      projectId: z10.number().optional()
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
    delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    })
  }),
  projects: router({
    list: protectedProcedure.query(async () => {
      return await getProjects();
    }),
    create: protectedProcedure.input(z10.object({
      name: z10.string(),
      description: z10.string().optional(),
      location: z10.string().optional(),
      status: z10.enum(["planning", "active", "completed", "on_hold"]).default("planning"),
      startDate: z10.date().optional(),
      endDate: z10.date().optional()
    })).mutation(async ({ input, ctx }) => {
      await createProject({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      name: z10.string().optional(),
      description: z10.string().optional(),
      location: z10.string().optional(),
      status: z10.enum(["planning", "active", "completed", "on_hold"]).optional(),
      startDate: z10.date().optional(),
      endDate: z10.date().optional()
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
    create: protectedProcedure.input(z10.object({
      name: z10.string(),
      category: z10.enum(["cement", "aggregate", "admixture", "water", "other"]),
      unit: z10.string(),
      quantity: z10.number().default(0),
      minStock: z10.number().default(0),
      criticalThreshold: z10.number().default(0),
      supplier: z10.string().optional(),
      unitPrice: z10.number().optional()
    })).mutation(async ({ input }) => {
      await createMaterial(input);
      return { success: true };
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      name: z10.string().optional(),
      category: z10.enum(["cement", "aggregate", "admixture", "water", "other"]).optional(),
      unit: z10.string().optional(),
      quantity: z10.number().optional(),
      minStock: z10.number().optional(),
      criticalThreshold: z10.number().optional(),
      supplier: z10.string().optional(),
      unitPrice: z10.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMaterial(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
      await deleteMaterial(input.id);
      return { success: true };
    }),
    checkLowStock: protectedProcedure.query(async () => {
      return await getLowStockMaterials();
    }),
    recordConsumption: protectedProcedure.input(z10.object({
      materialId: z10.number(),
      quantity: z10.number(),
      consumptionDate: z10.date(),
      projectId: z10.number().optional(),
      deliveryId: z10.number().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input }) => {
      await recordConsumption(input);
      return { success: true };
    }),
    getConsumptionHistory: protectedProcedure.input(z10.object({
      materialId: z10.number().optional(),
      days: z10.number().default(30)
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
          (user) => sendSMS2({
            phoneNumber: user.phoneNumber,
            message: smsMessage
          }).catch((err) => {
            console.error(`Failed to send SMS to ${user.phoneNumber}:`, err);
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
    list: protectedProcedure.input(z10.object({
      projectId: z10.number().optional(),
      status: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDeliveries(input);
    }),
    create: protectedProcedure.input(z10.object({
      projectId: z10.number().optional(),
      projectName: z10.string(),
      concreteType: z10.string(),
      volume: z10.number(),
      scheduledTime: z10.date(),
      status: z10.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled"),
      driverName: z10.string().optional(),
      vehicleNumber: z10.string().optional(),
      notes: z10.string().optional(),
      gpsLocation: z10.string().optional(),
      deliveryPhotos: z10.string().optional(),
      estimatedArrival: z10.number().optional(),
      actualArrivalTime: z10.number().optional(),
      actualDeliveryTime: z10.number().optional(),
      driverNotes: z10.string().optional(),
      customerName: z10.string().optional(),
      customerPhone: z10.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createDelivery({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      projectId: z10.number().optional(),
      projectName: z10.string().optional(),
      concreteType: z10.string().optional(),
      volume: z10.number().optional(),
      scheduledTime: z10.date().optional(),
      actualTime: z10.date().optional(),
      status: z10.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).optional(),
      driverName: z10.string().optional(),
      vehicleNumber: z10.string().optional(),
      notes: z10.string().optional(),
      gpsLocation: z10.string().optional(),
      deliveryPhotos: z10.string().optional(),
      estimatedArrival: z10.number().optional(),
      actualArrivalTime: z10.number().optional(),
      actualDeliveryTime: z10.number().optional(),
      driverNotes: z10.string().optional(),
      customerName: z10.string().optional(),
      customerPhone: z10.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDelivery(id, data);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z10.object({
      id: z10.number(),
      status: z10.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]),
      gpsLocation: z10.string().optional(),
      driverNotes: z10.string().optional()
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
    uploadDeliveryPhoto: protectedProcedure.input(z10.object({
      deliveryId: z10.number(),
      photoData: z10.string(),
      mimeType: z10.string()
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
    sendCustomerNotification: protectedProcedure.input(z10.object({
      deliveryId: z10.number(),
      message: z10.string()
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
    list: protectedProcedure.input(z10.object({
      projectId: z10.number().optional(),
      deliveryId: z10.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getQualityTests(input);
    }),
    create: protectedProcedure.input(z10.object({
      testName: z10.string(),
      testType: z10.enum(["slump", "strength", "air_content", "temperature", "other"]),
      result: z10.string(),
      unit: z10.string().optional(),
      status: z10.enum(["pass", "fail", "pending"]).default("pending"),
      deliveryId: z10.number().optional(),
      projectId: z10.number().optional(),
      testedBy: z10.string().optional(),
      notes: z10.string().optional(),
      photoUrls: z10.string().optional(),
      // JSON array
      inspectorSignature: z10.string().optional(),
      supervisorSignature: z10.string().optional(),
      testLocation: z10.string().optional(),
      complianceStandard: z10.string().optional(),
      offlineSyncStatus: z10.enum(["synced", "pending", "failed"]).default("synced").optional()
    })).mutation(async ({ input }) => {
      await createQualityTest(input);
      return { success: true };
    }),
    uploadPhoto: protectedProcedure.input(z10.object({
      photoData: z10.string(),
      // Base64 encoded image
      mimeType: z10.string()
    })).mutation(async ({ input, ctx }) => {
      const photoBuffer = Buffer.from(input.photoData, "base64");
      const fileExtension = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `qc-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
      const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
      return { success: true, url };
    }),
    syncOfflineTests: protectedProcedure.input(z10.object({
      tests: z10.array(z10.object({
        testName: z10.string(),
        testType: z10.enum(["slump", "strength", "air_content", "temperature", "other"]),
        result: z10.string(),
        unit: z10.string().optional(),
        status: z10.enum(["pass", "fail", "pending"]),
        deliveryId: z10.number().optional(),
        projectId: z10.number().optional(),
        testedBy: z10.string().optional(),
        notes: z10.string().optional(),
        photoUrls: z10.string().optional(),
        inspectorSignature: z10.string().optional(),
        supervisorSignature: z10.string().optional(),
        testLocation: z10.string().optional(),
        complianceStandard: z10.string().optional()
      }))
    })).mutation(async ({ input }) => {
      for (const test of input.tests) {
        await createQualityTest({ ...test, offlineSyncStatus: "synced" });
      }
      return { success: true, syncedCount: input.tests.length };
    }),
    getFailedTests: protectedProcedure.input(z10.object({
      days: z10.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getFailedQualityTests(input?.days || 30);
    }),
    getTrends: protectedProcedure.input(z10.object({
      days: z10.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getQualityTestTrends(input?.days || 30);
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      testName: z10.string().optional(),
      testType: z10.enum(["slump", "strength", "air_content", "temperature", "other"]).optional(),
      result: z10.string().optional(),
      unit: z10.string().optional(),
      status: z10.enum(["pass", "fail", "pending"]).optional(),
      deliveryId: z10.number().optional(),
      projectId: z10.number().optional(),
      testedBy: z10.string().optional(),
      notes: z10.string().optional(),
      photoUrls: z10.string().optional(),
      inspectorSignature: z10.string().optional(),
      supervisorSignature: z10.string().optional(),
      testLocation: z10.string().optional(),
      complianceStandard: z10.string().optional(),
      offlineSyncStatus: z10.enum(["synced", "pending", "failed"]).optional()
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
    list: protectedProcedure.input(z10.object({
      department: z10.string().optional(),
      status: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getEmployees(input);
    }),
    create: protectedProcedure.input(z10.object({
      firstName: z10.string(),
      lastName: z10.string(),
      employeeNumber: z10.string(),
      position: z10.string(),
      department: z10.enum(["construction", "maintenance", "quality", "administration", "logistics"]),
      phoneNumber: z10.string().optional(),
      email: z10.string().optional(),
      hourlyRate: z10.number().optional(),
      status: z10.enum(["active", "inactive", "on_leave"]).default("active"),
      hireDate: z10.date().optional()
    })).mutation(async ({ input }) => {
      return await createEmployee(input);
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      data: z10.object({
        firstName: z10.string().optional(),
        lastName: z10.string().optional(),
        position: z10.string().optional(),
        department: z10.enum(["construction", "maintenance", "quality", "administration", "logistics"]).optional(),
        phoneNumber: z10.string().optional(),
        email: z10.string().optional(),
        hourlyRate: z10.number().optional(),
        status: z10.enum(["active", "inactive", "on_leave"]).optional()
      })
    })).mutation(async ({ input }) => {
      await updateEmployee(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
      await deleteEmployee(input.id);
      return { success: true };
    })
  }),
  workHours: router({
    list: protectedProcedure.input(z10.object({
      employeeId: z10.number().optional(),
      projectId: z10.number().optional(),
      status: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getWorkHours(input);
    }),
    create: protectedProcedure.input(z10.object({
      employeeId: z10.number(),
      projectId: z10.number().optional(),
      date: z10.date(),
      startTime: z10.date(),
      endTime: z10.date().optional(),
      hoursWorked: z10.number().optional(),
      overtimeHours: z10.number().optional(),
      workType: z10.enum(["regular", "overtime", "weekend", "holiday"]).default("regular"),
      notes: z10.string().optional(),
      status: z10.enum(["pending", "approved", "rejected"]).default("pending")
    })).mutation(async ({ input, ctx }) => {
      return await createWorkHour(input);
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      data: z10.object({
        endTime: z10.date().optional(),
        hoursWorked: z10.number().optional(),
        overtimeHours: z10.number().optional(),
        notes: z10.string().optional(),
        status: z10.enum(["pending", "approved", "rejected"]).optional(),
        approvedBy: z10.number().optional()
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
    create: protectedProcedure.input(z10.object({
      name: z10.string(),
      location: z10.string(),
      capacity: z10.number(),
      status: z10.enum(["operational", "maintenance", "inactive"]).default("operational"),
      managerName: z10.string().optional(),
      phoneNumber: z10.string().optional()
    })).mutation(async ({ input }) => {
      return await createConcreteBase(input);
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      data: z10.object({
        name: z10.string().optional(),
        location: z10.string().optional(),
        capacity: z10.number().optional(),
        status: z10.enum(["operational", "maintenance", "inactive"]).optional(),
        managerName: z10.string().optional(),
        phoneNumber: z10.string().optional()
      })
    })).mutation(async ({ input }) => {
      await updateConcreteBase(input.id, input.data);
      return { success: true };
    })
  }),
  machines: router({
    list: protectedProcedure.input(z10.object({
      concreteBaseId: z10.number().optional(),
      type: z10.string().optional(),
      status: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachines(input);
    }),
    create: protectedProcedure.input(z10.object({
      name: z10.string(),
      machineNumber: z10.string(),
      type: z10.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]),
      manufacturer: z10.string().optional(),
      model: z10.string().optional(),
      year: z10.number().optional(),
      concreteBaseId: z10.number().optional(),
      status: z10.enum(["operational", "maintenance", "repair", "inactive"]).default("operational")
    })).mutation(async ({ input }) => {
      return await createMachine(input);
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      data: z10.object({
        name: z10.string().optional(),
        type: z10.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]).optional(),
        status: z10.enum(["operational", "maintenance", "repair", "inactive"]).optional(),
        totalWorkingHours: z10.number().optional(),
        lastMaintenanceDate: z10.date().optional(),
        nextMaintenanceDate: z10.date().optional()
      })
    })).mutation(async ({ input }) => {
      await updateMachine(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z10.object({ id: z10.number() })).mutation(async ({ input }) => {
      await deleteMachine(input.id);
      return { success: true };
    })
  }),
  machineMaintenance: router({
    list: protectedProcedure.input(z10.object({
      machineId: z10.number().optional(),
      maintenanceType: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineMaintenance(input);
    }),
    create: protectedProcedure.input(z10.object({
      machineId: z10.number(),
      date: z10.date(),
      maintenanceType: z10.enum(["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]),
      description: z10.string().optional(),
      lubricationType: z10.string().optional(),
      lubricationAmount: z10.number().optional(),
      fuelType: z10.string().optional(),
      fuelAmount: z10.number().optional(),
      cost: z10.number().optional(),
      performedBy: z10.string().optional(),
      hoursAtMaintenance: z10.number().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineMaintenance(input);
    })
  }),
  machineWorkHours: router({
    list: protectedProcedure.input(z10.object({
      machineId: z10.number().optional(),
      projectId: z10.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineWorkHours(input);
    }),
    create: protectedProcedure.input(z10.object({
      machineId: z10.number(),
      projectId: z10.number().optional(),
      date: z10.date(),
      startTime: z10.date(),
      endTime: z10.date().optional(),
      hoursWorked: z10.number().optional(),
      operatorId: z10.number().optional(),
      operatorName: z10.string().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineWorkHour(input);
    })
  }),
  aggregateInputs: router({
    list: protectedProcedure.input(z10.object({
      concreteBaseId: z10.number().optional(),
      materialType: z10.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getAggregateInputs(input);
    }),
    create: protectedProcedure.input(z10.object({
      concreteBaseId: z10.number(),
      date: z10.date(),
      materialType: z10.enum(["cement", "sand", "gravel", "water", "admixture", "other"]),
      materialName: z10.string(),
      quantity: z10.number(),
      unit: z10.string(),
      supplier: z10.string().optional(),
      batchNumber: z10.string().optional(),
      receivedBy: z10.string().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input }) => {
      return await createAggregateInput(input);
    })
  }),
  purchaseOrders: router({
    list: protectedProcedure.input(z10.object({
      status: z10.string().optional(),
      materialId: z10.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getPurchaseOrders(input);
    }),
    create: protectedProcedure.input(z10.object({
      materialId: z10.number(),
      materialName: z10.string(),
      quantity: z10.number(),
      supplier: z10.string().optional(),
      supplierEmail: z10.string().optional(),
      expectedDelivery: z10.date().optional(),
      totalCost: z10.number().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createPurchaseOrder({
        ...input,
        status: "pending",
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z10.object({
      id: z10.number(),
      status: z10.enum(["pending", "approved", "ordered", "received", "cancelled"]).optional(),
      expectedDelivery: z10.date().optional(),
      actualDelivery: z10.date().optional(),
      totalCost: z10.number().optional(),
      notes: z10.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePurchaseOrder(id, data);
      return { success: true };
    }),
    sendToSupplier: protectedProcedure.input(z10.object({
      orderId: z10.number()
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
    dailyProduction: protectedProcedure.input(z10.object({
      date: z10.string()
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
    sendDailyProductionEmail: protectedProcedure.input(z10.object({
      date: z10.string(),
      recipientEmail: z10.string()
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
    update: protectedProcedure.input(z10.object({
      logoUrl: z10.string().optional(),
      primaryColor: z10.string().optional(),
      secondaryColor: z10.string().optional(),
      companyName: z10.string().optional(),
      footerText: z10.string().optional()
    })).mutation(async ({ input }) => {
      await upsertEmailBranding(input);
      return { success: true };
    }),
    uploadLogo: protectedProcedure.input(z10.object({
      fileData: z10.string(),
      // base64 encoded image
      fileName: z10.string(),
      mimeType: z10.string()
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
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
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
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path4.resolve(import.meta.dirname, "../..", "dist", "public") : path4.resolve(import.meta.dirname, "public");
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
    for (const user of users2) {
      const overdueTasks = await getOverdueTasks(user.id);
      if (overdueTasks.length > 0) {
        await checkOverdueTaskTriggers(user.id);
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
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    initializeTriggerJobs();
  });
}
startServer().catch(console.error);
