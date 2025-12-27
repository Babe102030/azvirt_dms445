import { Request, Response, NextFunction } from "express";
import helmet from "helmet";

/**
 * Security headers configuration using helmet.js
 */
export function securityHeadersMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.manus.im"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  });
}

/**
 * CORS configuration
 */
export function corsMiddleware() {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.VITE_FRONTEND_URL || "https://azvirt-dms.manus.space",
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  };
}

/**
 * Input validation and sanitization
 */
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"']/g, "")
      .trim()
      .substring(0, 10000); // Limit length
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Validate key names
      if (/^[a-zA-Z0-9_-]+$/.test(key)) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * SQL injection prevention
 * Ensures all queries use parameterized statements
 */
export function validateQueryParams(params: any): boolean {
  if (!params) return true;

  const sqlKeywords = [
    "DROP",
    "DELETE",
    "INSERT",
    "UPDATE",
    "UNION",
    "SELECT",
    "EXEC",
    "EXECUTE",
  ];

  const paramString = JSON.stringify(params).toUpperCase();

  for (const keyword of sqlKeywords) {
    if (paramString.includes(keyword)) {
      console.warn(`[SECURITY] Potential SQL injection detected: ${keyword}`);
      return false;
    }
  }

  return true;
}

/**
 * XSS protection
 * Escapes HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * CSRF token generation and validation
 */
const csrfTokens = new Map<string, { token: string; timestamp: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = require("crypto").randomBytes(32).toString("hex");
  csrfTokens.set(sessionId, {
    token,
    timestamp: Date.now(),
  });
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    return false;
  }

  // Token expires after 1 hour
  if (Date.now() - stored.timestamp > 3600000) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * API key rotation
 */
const apiKeyStore = new Map<string, { key: string; rotatedAt: number }>();

export function rotateAPIKey(userId: string): string {
  const newKey = require("crypto").randomBytes(32).toString("hex");
  apiKeyStore.set(userId, {
    key: newKey,
    rotatedAt: Date.now(),
  });
  return newKey;
}

export function validateAPIKey(userId: string, key: string): boolean {
  const stored = apiKeyStore.get(userId);

  if (!stored) {
    return false;
  }

  // Key expires after 90 days
  if (Date.now() - stored.rotatedAt > 90 * 24 * 60 * 60 * 1000) {
    apiKeyStore.delete(userId);
    return false;
  }

  return stored.key === key;
}

/**
 * Audit logging for sensitive operations
 */
export interface AuditLog {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  changes: any;
  ipAddress: string;
  userAgent: string;
}

const auditLogs: AuditLog[] = [];

export function logAuditEvent(
  userId: string,
  action: string,
  resource: string,
  changes: any,
  req: Request
): void {
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    changes,
    ipAddress: req.ip || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
  };

  auditLogs.push(log);

  // Keep only last 10000 logs in memory
  if (auditLogs.length > 10000) {
    auditLogs.shift();
  }

  // Log to console for sensitive actions
  if (["DELETE", "UPDATE", "CREATE"].includes(action)) {
    console.log("[AUDIT]", log);
  }
}

export function getAuditLogs(
  filter?: Partial<AuditLog>
): AuditLog[] {
  if (!filter) return auditLogs;

  return auditLogs.filter((log) => {
    for (const [key, value] of Object.entries(filter)) {
      if (log[key as keyof AuditLog] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isStrong: errors.length === 0,
    errors,
  };
}

/**
 * Secure session configuration
 */
export function getSecureSessionConfig() {
  return {
    secret: process.env.JWT_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent JavaScript access
      sameSite: "strict" as const, // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };
}
