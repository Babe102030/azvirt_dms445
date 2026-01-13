import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerClerkRoutes, clerkAuthMiddleware, clerkBaseMiddleware } from "./clerk";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeTriggerJobs } from "./triggerJobs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Clerk authentication routes
  registerClerkRoutes(app);

  // Apply Clerk middleware to all API routes to populate auth context
  app.use("/api/*", (req, res, next) => {
    const url = req.originalUrl || req.url;
    if (url === "/api/clerk/health" || url === "/api/clerk/webhook") {
      return next();
    }
    clerkBaseMiddleware(req, res, next);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ path, error }) => {
        console.error(`[TRPC Error] at ${path}:`, error);
      }
    })
  );

  // In development, setup Vite for HMR and serving client files
  // In production, serve static files from dist/public
  if (process.env.NODE_ENV === "development") {
    console.log("Setting up Vite for development...");
    await setupVite(app, server);
  } else {
    console.log("Serving static files for production...");
    serveStatic(app);
  }

  console.log("Finding available port...");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Initialize trigger evaluation jobs
    initializeTriggerJobs();
  });
}

startServer().catch(console.error);
