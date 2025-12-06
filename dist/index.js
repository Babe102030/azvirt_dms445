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

// server/_core/sms.ts
var sms_exports = {};
__export(sms_exports, {
  sendSMS: () => sendSMS
});
import { TRPCError as TRPCError3 } from "@trpc/server";
async function sendSMS(payload) {
  const { phoneNumber, message } = validatePayload2(payload);
  if (!ENV.forgeApiKey) {
    throw new TRPCError3({
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
        throw new TRPCError3({
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
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "Phone number is required."
        });
      }
      if (!isNonEmptyString3(input.message)) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "SMS message is required."
        });
      }
      const phoneNumber = trimValue2(input.phoneNumber);
      const message = trimValue2(input.message);
      if (phoneNumber.length > PHONE_MAX_LENGTH) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: `Phone number must be at most ${PHONE_MAX_LENGTH} characters.`
        });
      }
      if (message.length > MESSAGE_MAX_LENGTH) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: `SMS message must be at most ${MESSAGE_MAX_LENGTH} characters. Current length: ${message.length}`
        });
      }
      return { phoneNumber, message };
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
import { eq, desc, like, and, or, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  smsNotificationsEnabled: boolean("smsNotificationsEnabled").default(false).notNull(),
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

// server/db.ts
init_env();
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
async function getWeeklyTimesheetSummary(employeeId, weekStart) {
  const db = await getDb();
  if (!db) return [];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  let query = db.select({
    employeeId: workHours.employeeId,
    employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
    employeeNumber: employees.employeeNumber,
    totalHours: sql`SUM(${workHours.hoursWorked})`,
    regularHours: sql`SUM(CASE WHEN ${workHours.workType} = 'regular' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    overtimeHours: sql`SUM(${workHours.overtimeHours})`,
    weekendHours: sql`SUM(CASE WHEN ${workHours.workType} = 'weekend' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    holidayHours: sql`SUM(CASE WHEN ${workHours.workType} = 'holiday' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    daysWorked: sql`COUNT(DISTINCT DATE(${workHours.date}))`
  }).from(workHours).innerJoin(employees, eq(workHours.employeeId, employees.id)).where(
    and(
      gte(workHours.date, weekStart),
      lt(workHours.date, weekEnd),
      eq(workHours.status, "approved"),
      employeeId ? eq(workHours.employeeId, employeeId) : void 0
    )
  ).groupBy(workHours.employeeId, employees.firstName, employees.lastName, employees.employeeNumber);
  return await query;
}
async function getMonthlyTimesheetSummary(employeeId, year, month) {
  const db = await getDb();
  if (!db) return [];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  let query = db.select({
    employeeId: workHours.employeeId,
    employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
    employeeNumber: employees.employeeNumber,
    department: employees.department,
    hourlyRate: employees.hourlyRate,
    totalHours: sql`SUM(${workHours.hoursWorked})`,
    regularHours: sql`SUM(CASE WHEN ${workHours.workType} = 'regular' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    overtimeHours: sql`SUM(${workHours.overtimeHours})`,
    weekendHours: sql`SUM(CASE WHEN ${workHours.workType} = 'weekend' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    holidayHours: sql`SUM(CASE WHEN ${workHours.workType} = 'holiday' THEN ${workHours.hoursWorked} ELSE 0 END)`,
    daysWorked: sql`COUNT(DISTINCT DATE(${workHours.date}))`
  }).from(workHours).innerJoin(employees, eq(workHours.employeeId, employees.id)).where(
    and(
      gte(workHours.date, monthStart),
      lt(workHours.date, monthEnd),
      eq(workHours.status, "approved"),
      employeeId ? eq(workHours.employeeId, employeeId) : void 0
    )
  ).groupBy(workHours.employeeId, employees.firstName, employees.lastName, employees.employeeNumber, employees.department, employees.hourlyRate);
  return await query;
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
import { z as z3 } from "zod";

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
import { like as like2, eq as eq2, and as and2, gte as gte2, lte, desc as desc2 } from "drizzle-orm";
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
      dateConditions.push(lte(deliveries.createdAt, new Date(endDate)));
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
var AI_TOOLS = [
  searchMaterialsTool,
  getDeliveryStatusTool,
  searchDocumentsTool,
  getQualityTestsTool,
  generateForecastTool,
  calculateStatsTool
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

// server/routers/aiAssistant.ts
var aiAssistantRouter = router({
  /**
   * Chat with AI assistant (streaming support)
   */
  chat: protectedProcedure.input(
    z2.object({
      conversationId: z2.number().optional(),
      message: z2.string(),
      model: z2.string().default("llama3.2"),
      imageUrl: z2.string().optional(),
      audioUrl: z2.string().optional(),
      useTools: z2.boolean().default(true)
    })
  ).mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;
    let conversationId = input.conversationId;
    if (!conversationId) {
      conversationId = await createAiConversation({
        userId,
        title: input.message.substring(0, 50),
        modelName: input.model
      });
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
      content: `You are an AI assistant for AzVirt DMS (Delivery Management System), a concrete production and delivery management platform. You have access to real-time data about materials, deliveries, quality tests, documents, and inventory forecasting. 

Available tools:
- search_materials: Search and check inventory levels
- get_delivery_status: Track delivery status and history
- search_documents: Find documents and files
- get_quality_tests: Review quality control test results
- generate_forecast: Get inventory forecasting predictions
- calculate_stats: Calculate business metrics and statistics

When users ask about the system, provide helpful, accurate information. Use tools when appropriate to fetch real data. Be concise and professional.`
    };
    const response = await ollamaService.chat(
      input.model,
      [systemMessage, ...messages],
      {
        stream: false,
        temperature: 0.7
      }
    );
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
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  ai: aiAssistantRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    updateSMSSettings: protectedProcedure.input(z3.object({
      phoneNumber: z3.string().min(1),
      smsNotificationsEnabled: z3.boolean()
    })).mutation(async ({ input, ctx }) => {
      const success = await updateUserSMSSettings(
        ctx.user.id,
        input.phoneNumber,
        input.smsNotificationsEnabled
      );
      return { success };
    })
  }),
  documents: router({
    list: protectedProcedure.input(z3.object({
      projectId: z3.number().optional(),
      category: z3.string().optional(),
      search: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDocuments(input);
    }),
    upload: protectedProcedure.input(z3.object({
      name: z3.string(),
      description: z3.string().optional(),
      fileData: z3.string(),
      mimeType: z3.string(),
      fileSize: z3.number(),
      category: z3.enum(["contract", "blueprint", "report", "certificate", "invoice", "other"]),
      projectId: z3.number().optional()
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
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    })
  }),
  projects: router({
    list: protectedProcedure.query(async () => {
      return await getProjects();
    }),
    create: protectedProcedure.input(z3.object({
      name: z3.string(),
      description: z3.string().optional(),
      location: z3.string().optional(),
      status: z3.enum(["planning", "active", "completed", "on_hold"]).default("planning"),
      startDate: z3.date().optional(),
      endDate: z3.date().optional()
    })).mutation(async ({ input, ctx }) => {
      await createProject({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      description: z3.string().optional(),
      location: z3.string().optional(),
      status: z3.enum(["planning", "active", "completed", "on_hold"]).optional(),
      startDate: z3.date().optional(),
      endDate: z3.date().optional()
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
    create: protectedProcedure.input(z3.object({
      name: z3.string(),
      category: z3.enum(["cement", "aggregate", "admixture", "water", "other"]),
      unit: z3.string(),
      quantity: z3.number().default(0),
      minStock: z3.number().default(0),
      criticalThreshold: z3.number().default(0),
      supplier: z3.string().optional(),
      unitPrice: z3.number().optional()
    })).mutation(async ({ input }) => {
      await createMaterial(input);
      return { success: true };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      name: z3.string().optional(),
      category: z3.enum(["cement", "aggregate", "admixture", "water", "other"]).optional(),
      unit: z3.string().optional(),
      quantity: z3.number().optional(),
      minStock: z3.number().optional(),
      criticalThreshold: z3.number().optional(),
      supplier: z3.string().optional(),
      unitPrice: z3.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateMaterial(id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteMaterial(input.id);
      return { success: true };
    }),
    checkLowStock: protectedProcedure.query(async () => {
      return await getLowStockMaterials();
    }),
    recordConsumption: protectedProcedure.input(z3.object({
      materialId: z3.number(),
      quantity: z3.number(),
      consumptionDate: z3.date(),
      projectId: z3.number().optional(),
      deliveryId: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      await recordConsumption(input);
      return { success: true };
    }),
    getConsumptionHistory: protectedProcedure.input(z3.object({
      materialId: z3.number().optional(),
      days: z3.number().default(30)
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
    list: protectedProcedure.input(z3.object({
      projectId: z3.number().optional(),
      status: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getDeliveries(input);
    }),
    create: protectedProcedure.input(z3.object({
      projectId: z3.number().optional(),
      projectName: z3.string(),
      concreteType: z3.string(),
      volume: z3.number(),
      scheduledTime: z3.date(),
      status: z3.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled"),
      driverName: z3.string().optional(),
      vehicleNumber: z3.string().optional(),
      notes: z3.string().optional(),
      gpsLocation: z3.string().optional(),
      deliveryPhotos: z3.string().optional(),
      estimatedArrival: z3.number().optional(),
      actualArrivalTime: z3.number().optional(),
      actualDeliveryTime: z3.number().optional(),
      driverNotes: z3.string().optional(),
      customerName: z3.string().optional(),
      customerPhone: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createDelivery({
        ...input,
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      projectId: z3.number().optional(),
      projectName: z3.string().optional(),
      concreteType: z3.string().optional(),
      volume: z3.number().optional(),
      scheduledTime: z3.date().optional(),
      actualTime: z3.date().optional(),
      status: z3.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).optional(),
      driverName: z3.string().optional(),
      vehicleNumber: z3.string().optional(),
      notes: z3.string().optional(),
      gpsLocation: z3.string().optional(),
      deliveryPhotos: z3.string().optional(),
      estimatedArrival: z3.number().optional(),
      actualArrivalTime: z3.number().optional(),
      actualDeliveryTime: z3.number().optional(),
      driverNotes: z3.string().optional(),
      customerName: z3.string().optional(),
      customerPhone: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateDelivery(id, data);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z3.object({
      id: z3.number(),
      status: z3.enum(["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]),
      gpsLocation: z3.string().optional(),
      driverNotes: z3.string().optional()
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
    uploadDeliveryPhoto: protectedProcedure.input(z3.object({
      deliveryId: z3.number(),
      photoData: z3.string(),
      mimeType: z3.string()
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
    sendCustomerNotification: protectedProcedure.input(z3.object({
      deliveryId: z3.number(),
      message: z3.string()
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
    list: protectedProcedure.input(z3.object({
      projectId: z3.number().optional(),
      deliveryId: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getQualityTests(input);
    }),
    create: protectedProcedure.input(z3.object({
      testName: z3.string(),
      testType: z3.enum(["slump", "strength", "air_content", "temperature", "other"]),
      result: z3.string(),
      unit: z3.string().optional(),
      status: z3.enum(["pass", "fail", "pending"]).default("pending"),
      deliveryId: z3.number().optional(),
      projectId: z3.number().optional(),
      testedBy: z3.string().optional(),
      notes: z3.string().optional(),
      photoUrls: z3.string().optional(),
      // JSON array
      inspectorSignature: z3.string().optional(),
      supervisorSignature: z3.string().optional(),
      testLocation: z3.string().optional(),
      complianceStandard: z3.string().optional(),
      offlineSyncStatus: z3.enum(["synced", "pending", "failed"]).default("synced").optional()
    })).mutation(async ({ input }) => {
      await createQualityTest(input);
      return { success: true };
    }),
    uploadPhoto: protectedProcedure.input(z3.object({
      photoData: z3.string(),
      // Base64 encoded image
      mimeType: z3.string()
    })).mutation(async ({ input, ctx }) => {
      const photoBuffer = Buffer.from(input.photoData, "base64");
      const fileExtension = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `qc-photos/${ctx.user.id}/${nanoid()}.${fileExtension}`;
      const { url } = await storagePut(fileKey, photoBuffer, input.mimeType);
      return { success: true, url };
    }),
    syncOfflineTests: protectedProcedure.input(z3.object({
      tests: z3.array(z3.object({
        testName: z3.string(),
        testType: z3.enum(["slump", "strength", "air_content", "temperature", "other"]),
        result: z3.string(),
        unit: z3.string().optional(),
        status: z3.enum(["pass", "fail", "pending"]),
        deliveryId: z3.number().optional(),
        projectId: z3.number().optional(),
        testedBy: z3.string().optional(),
        notes: z3.string().optional(),
        photoUrls: z3.string().optional(),
        inspectorSignature: z3.string().optional(),
        supervisorSignature: z3.string().optional(),
        testLocation: z3.string().optional(),
        complianceStandard: z3.string().optional()
      }))
    })).mutation(async ({ input }) => {
      for (const test of input.tests) {
        await createQualityTest({ ...test, offlineSyncStatus: "synced" });
      }
      return { success: true, syncedCount: input.tests.length };
    }),
    getFailedTests: protectedProcedure.input(z3.object({
      days: z3.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getFailedQualityTests(input?.days || 30);
    }),
    getTrends: protectedProcedure.input(z3.object({
      days: z3.number().default(30)
    }).optional()).query(async ({ input }) => {
      return await getQualityTestTrends(input?.days || 30);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      testName: z3.string().optional(),
      testType: z3.enum(["slump", "strength", "air_content", "temperature", "other"]).optional(),
      result: z3.string().optional(),
      unit: z3.string().optional(),
      status: z3.enum(["pass", "fail", "pending"]).optional(),
      deliveryId: z3.number().optional(),
      projectId: z3.number().optional(),
      testedBy: z3.string().optional(),
      notes: z3.string().optional(),
      photoUrls: z3.string().optional(),
      inspectorSignature: z3.string().optional(),
      supervisorSignature: z3.string().optional(),
      testLocation: z3.string().optional(),
      complianceStandard: z3.string().optional(),
      offlineSyncStatus: z3.enum(["synced", "pending", "failed"]).optional()
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
    list: protectedProcedure.input(z3.object({
      department: z3.string().optional(),
      status: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getEmployees(input);
    }),
    create: protectedProcedure.input(z3.object({
      firstName: z3.string(),
      lastName: z3.string(),
      employeeNumber: z3.string(),
      position: z3.string(),
      department: z3.enum(["construction", "maintenance", "quality", "administration", "logistics"]),
      phoneNumber: z3.string().optional(),
      email: z3.string().optional(),
      hourlyRate: z3.number().optional(),
      status: z3.enum(["active", "inactive", "on_leave"]).default("active"),
      hireDate: z3.date().optional()
    })).mutation(async ({ input }) => {
      return await createEmployee(input);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      data: z3.object({
        firstName: z3.string().optional(),
        lastName: z3.string().optional(),
        position: z3.string().optional(),
        department: z3.enum(["construction", "maintenance", "quality", "administration", "logistics"]).optional(),
        phoneNumber: z3.string().optional(),
        email: z3.string().optional(),
        hourlyRate: z3.number().optional(),
        status: z3.enum(["active", "inactive", "on_leave"]).optional()
      })
    })).mutation(async ({ input }) => {
      await updateEmployee(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteEmployee(input.id);
      return { success: true };
    })
  }),
  workHours: router({
    list: protectedProcedure.input(z3.object({
      employeeId: z3.number().optional(),
      projectId: z3.number().optional(),
      status: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getWorkHours(input);
    }),
    create: protectedProcedure.input(z3.object({
      employeeId: z3.number(),
      projectId: z3.number().optional(),
      date: z3.date(),
      startTime: z3.date(),
      endTime: z3.date().optional(),
      hoursWorked: z3.number().optional(),
      overtimeHours: z3.number().optional(),
      workType: z3.enum(["regular", "overtime", "weekend", "holiday"]).default("regular"),
      notes: z3.string().optional(),
      status: z3.enum(["pending", "approved", "rejected"]).default("pending")
    })).mutation(async ({ input, ctx }) => {
      return await createWorkHour(input);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      data: z3.object({
        endTime: z3.date().optional(),
        hoursWorked: z3.number().optional(),
        overtimeHours: z3.number().optional(),
        notes: z3.string().optional(),
        status: z3.enum(["pending", "approved", "rejected"]).optional(),
        approvedBy: z3.number().optional()
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
    create: protectedProcedure.input(z3.object({
      name: z3.string(),
      location: z3.string(),
      capacity: z3.number(),
      status: z3.enum(["operational", "maintenance", "inactive"]).default("operational"),
      managerName: z3.string().optional(),
      phoneNumber: z3.string().optional()
    })).mutation(async ({ input }) => {
      return await createConcreteBase(input);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      data: z3.object({
        name: z3.string().optional(),
        location: z3.string().optional(),
        capacity: z3.number().optional(),
        status: z3.enum(["operational", "maintenance", "inactive"]).optional(),
        managerName: z3.string().optional(),
        phoneNumber: z3.string().optional()
      })
    })).mutation(async ({ input }) => {
      await updateConcreteBase(input.id, input.data);
      return { success: true };
    })
  }),
  machines: router({
    list: protectedProcedure.input(z3.object({
      concreteBaseId: z3.number().optional(),
      type: z3.string().optional(),
      status: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachines(input);
    }),
    create: protectedProcedure.input(z3.object({
      name: z3.string(),
      machineNumber: z3.string(),
      type: z3.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]),
      manufacturer: z3.string().optional(),
      model: z3.string().optional(),
      year: z3.number().optional(),
      concreteBaseId: z3.number().optional(),
      status: z3.enum(["operational", "maintenance", "repair", "inactive"]).default("operational")
    })).mutation(async ({ input }) => {
      return await createMachine(input);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      data: z3.object({
        name: z3.string().optional(),
        type: z3.enum(["mixer", "pump", "truck", "excavator", "crane", "other"]).optional(),
        status: z3.enum(["operational", "maintenance", "repair", "inactive"]).optional(),
        totalWorkingHours: z3.number().optional(),
        lastMaintenanceDate: z3.date().optional(),
        nextMaintenanceDate: z3.date().optional()
      })
    })).mutation(async ({ input }) => {
      await updateMachine(input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
      await deleteMachine(input.id);
      return { success: true };
    })
  }),
  machineMaintenance: router({
    list: protectedProcedure.input(z3.object({
      machineId: z3.number().optional(),
      maintenanceType: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineMaintenance(input);
    }),
    create: protectedProcedure.input(z3.object({
      machineId: z3.number(),
      date: z3.date(),
      maintenanceType: z3.enum(["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]),
      description: z3.string().optional(),
      lubricationType: z3.string().optional(),
      lubricationAmount: z3.number().optional(),
      fuelType: z3.string().optional(),
      fuelAmount: z3.number().optional(),
      cost: z3.number().optional(),
      performedBy: z3.string().optional(),
      hoursAtMaintenance: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineMaintenance(input);
    })
  }),
  machineWorkHours: router({
    list: protectedProcedure.input(z3.object({
      machineId: z3.number().optional(),
      projectId: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getMachineWorkHours(input);
    }),
    create: protectedProcedure.input(z3.object({
      machineId: z3.number(),
      projectId: z3.number().optional(),
      date: z3.date(),
      startTime: z3.date(),
      endTime: z3.date().optional(),
      hoursWorked: z3.number().optional(),
      operatorId: z3.number().optional(),
      operatorName: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      return await createMachineWorkHour(input);
    })
  }),
  timesheets: router({
    list: protectedProcedure.input(z3.object({
      employeeId: z3.number().optional(),
      status: z3.enum(["pending", "approved", "rejected"]).optional(),
      startDate: z3.date().optional(),
      endDate: z3.date().optional()
    }).optional()).query(async ({ input }) => {
      return await getWorkHours(input);
    }),
    clockIn: protectedProcedure.input(z3.object({
      employeeId: z3.number(),
      projectId: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      return await createWorkHour({
        employeeId: input.employeeId,
        date: /* @__PURE__ */ new Date(),
        startTime: /* @__PURE__ */ new Date(),
        projectId: input.projectId,
        notes: input.notes,
        status: "pending"
      });
    }),
    clockOut: protectedProcedure.input(z3.object({
      id: z3.number()
    })).mutation(async ({ input }) => {
      const endTime = /* @__PURE__ */ new Date();
      await updateWorkHour(input.id, { endTime });
      return { success: true };
    }),
    create: protectedProcedure.input(z3.object({
      employeeId: z3.number(),
      date: z3.date(),
      startTime: z3.date(),
      endTime: z3.date().optional(),
      hoursWorked: z3.number().optional(),
      overtimeHours: z3.number().optional(),
      workType: z3.enum(["regular", "overtime", "weekend", "holiday"]).optional(),
      projectId: z3.number().optional(),
      notes: z3.string().optional(),
      status: z3.enum(["pending", "approved", "rejected"]).default("pending")
    })).mutation(async ({ input }) => {
      return await createWorkHour(input);
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      data: z3.object({
        startTime: z3.date().optional(),
        endTime: z3.date().optional(),
        hoursWorked: z3.number().optional(),
        overtimeHours: z3.number().optional(),
        workType: z3.enum(["regular", "overtime", "weekend", "holiday"]).optional(),
        projectId: z3.number().optional(),
        notes: z3.string().optional(),
        status: z3.enum(["pending", "approved", "rejected"]).optional(),
        approvedBy: z3.number().optional()
      })
    })).mutation(async ({ input }) => {
      await updateWorkHour(input.id, input.data);
      return { success: true };
    }),
    approve: protectedProcedure.input(z3.object({
      id: z3.number(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await updateWorkHour(input.id, {
        status: "approved",
        approvedBy: ctx.user.id,
        notes: input.notes
      });
      return { success: true };
    }),
    reject: protectedProcedure.input(z3.object({
      id: z3.number(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await updateWorkHour(input.id, {
        status: "rejected",
        approvedBy: ctx.user.id,
        notes: input.notes
      });
      return { success: true };
    }),
    weeklySummary: protectedProcedure.input(z3.object({
      employeeId: z3.number().optional(),
      weekStart: z3.date()
    })).query(async ({ input }) => {
      return await getWeeklyTimesheetSummary(input.employeeId, input.weekStart);
    }),
    monthlySummary: protectedProcedure.input(z3.object({
      employeeId: z3.number().optional(),
      year: z3.number(),
      month: z3.number()
    })).query(async ({ input }) => {
      return await getMonthlyTimesheetSummary(input.employeeId, input.year, input.month);
    })
  }),
  aggregateInputs: router({
    list: protectedProcedure.input(z3.object({
      concreteBaseId: z3.number().optional(),
      materialType: z3.string().optional()
    }).optional()).query(async ({ input }) => {
      return await getAggregateInputs(input);
    }),
    create: protectedProcedure.input(z3.object({
      concreteBaseId: z3.number(),
      date: z3.date(),
      materialType: z3.enum(["cement", "sand", "gravel", "water", "admixture", "other"]),
      materialName: z3.string(),
      quantity: z3.number(),
      unit: z3.string(),
      supplier: z3.string().optional(),
      batchNumber: z3.string().optional(),
      receivedBy: z3.string().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      return await createAggregateInput(input);
    })
  }),
  purchaseOrders: router({
    list: protectedProcedure.input(z3.object({
      status: z3.string().optional(),
      materialId: z3.number().optional()
    }).optional()).query(async ({ input }) => {
      return await getPurchaseOrders(input);
    }),
    create: protectedProcedure.input(z3.object({
      materialId: z3.number(),
      materialName: z3.string(),
      quantity: z3.number(),
      supplier: z3.string().optional(),
      supplierEmail: z3.string().optional(),
      expectedDelivery: z3.date().optional(),
      totalCost: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input, ctx }) => {
      await createPurchaseOrder({
        ...input,
        status: "pending",
        createdBy: ctx.user.id
      });
      return { success: true };
    }),
    update: protectedProcedure.input(z3.object({
      id: z3.number(),
      status: z3.enum(["pending", "approved", "ordered", "received", "cancelled"]).optional(),
      expectedDelivery: z3.date().optional(),
      actualDelivery: z3.date().optional(),
      totalCost: z3.number().optional(),
      notes: z3.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updatePurchaseOrder(id, data);
      return { success: true };
    }),
    sendToSupplier: protectedProcedure.input(z3.object({
      orderId: z3.number()
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
    dailyProduction: protectedProcedure.input(z3.object({
      date: z3.string()
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
    sendDailyProductionEmail: protectedProcedure.input(z3.object({
      date: z3.string(),
      recipientEmail: z3.string()
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
    update: protectedProcedure.input(z3.object({
      logoUrl: z3.string().optional(),
      primaryColor: z3.string().optional(),
      secondaryColor: z3.string().optional(),
      companyName: z3.string().optional(),
      footerText: z3.string().optional()
    })).mutation(async ({ input }) => {
      await upsertEmailBranding(input);
      return { success: true };
    }),
    uploadLogo: protectedProcedure.input(z3.object({
      fileData: z3.string(),
      // base64 encoded image
      fileName: z3.string(),
      mimeType: z3.string()
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
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
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
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
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
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
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
  });
}
startServer().catch(console.error);
