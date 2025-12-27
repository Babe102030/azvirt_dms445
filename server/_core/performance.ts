import { Request, Response, NextFunction } from "express";

/**
 * Response compression middleware
 * Automatically compresses responses with gzip or brotli
 */
export function compressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add compression headers
    const acceptEncoding = req.headers["accept-encoding"] || "";

    if (acceptEncoding.includes("gzip")) {
      res.setHeader("Content-Encoding", "gzip");
    } else if (acceptEncoding.includes("br")) {
      res.setHeader("Content-Encoding", "br");
    }

    next();
  };
}

/**
 * Request deduplication middleware
 * Prevents duplicate requests from being processed simultaneously
 */
const pendingRequests = new Map<string, Promise<any>>();

export function deduplicationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only deduplicate GET requests
    if (req.method !== "GET") {
      return next();
    }

    const requestKey = `${req.method}:${req.url}`;

    if (pendingRequests.has(requestKey)) {
      // Request is already in progress, wait for it
      try {
        const result = await pendingRequests.get(requestKey);
        return res.json(result);
      } catch (error) {
        return next(error);
      }
    }

    // Store the promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        resolve(data);
        pendingRequests.delete(requestKey);
        return originalJson(data);
      };

      next();
    });

    pendingRequests.set(requestKey, requestPromise);
  };
}

/**
 * Query result caching middleware
 * Caches GET request responses based on URL
 */
const queryCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

export function queryCacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = req.url;
    const cached = queryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      queryCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });
      res.setHeader("X-Cache", "MISS");
      return originalJson(data);
    };

    next();
  };
}

/**
 * Request timeout middleware
 * Automatically terminates long-running requests
 */
export function requestTimeoutMiddleware(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutHandle = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: "Request timeout" });
      }
    }, timeout);

    res.on("finish", () => clearTimeout(timeoutHandle));
    res.on("close", () => clearTimeout(timeoutHandle));

    next();
  };
}

/**
 * Rate limiting middleware
 * Limits requests per IP address
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60 * 1000
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(ip, record);
    }

    record.count++;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - record.count));
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(record.resetTime).toISOString()
    );

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Request logging middleware
 * Logs request details for performance monitoring
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();

    res.on("finish", () => {
      const duration = performance.now() - startTime;
      const log = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        ip: req.ip,
      };

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn("[SLOW REQUEST]", log);
      } else {
        console.log("[REQUEST]", log);
      }
    });

    next();
  };
}

/**
 * Error handling middleware with performance tracking
 */
export function errorHandlingMiddleware() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[ERROR]", {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      error: err.message,
      stack: err.stack,
    });

    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  };
}

/**
 * Health check endpoint
 * Returns server status and performance metrics
 */
export function healthCheckEndpoint() {
  return (req: Request, res: Response) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      status: "healthy",
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
      },
      timestamp: new Date().toISOString(),
    });
  };
}

/**
 * Clear old cache entries periodically
 */
export function startCacheCleanup(interval: number = 60 * 1000) {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    queryCache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        queryCache.delete(key);
        cleaned++;
      }
    })

    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned ${cleaned} expired entries`);
    }
  }, interval);
}

/**
 * Performance monitoring utility
 * Tracks function execution time
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    if (duration > 1000) {
      console.warn(`[PERF] ${name} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`[PERF] ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[PERF] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
