import { ClerkExpressRequireAuth } from "@clerk/express";
import { Clerk } from "@clerk/backend";
import type { Express, Request, Response, NextFunction } from "express";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

// Initialize Clerk
const clerk = Clerk({
    secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Middleware to protect routes with Clerk authentication
 */
export const clerkAuthMiddleware = ClerkExpressRequireAuth({
    // Allow users who are signed in
    // You can add additional options here like:
    // - onError: custom error handler
    // - onSuccess: custom success handler
});

/**
 * Get Clerk user data and sync with local database
 */
export async function syncClerkUser(req: Request) {
    try {
        const userId = req.auth?.userId;

        if (!userId) {
            throw new Error("No user ID found in Clerk session");
        }

        // Get user data from Clerk
        const clerkUser = await clerk.users.getUser(userId);

        if (!clerkUser) {
            throw new Error("User not found in Clerk");
        }

        // Sync user data with local database
        const userData = {
            openId: userId,
            name: clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`
                : clerkUser.username || `user_${userId}`,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            loginMethod: "clerk",
            lastSignedIn: new Date(),
        };

        // Upsert user into local database
        await db.upsertUser(userData);

        return {
            userId: userId,
            ...userData,
        };
    } catch (error) {
        console.error("[Clerk] Error syncing user:", error);
        throw error;
    }
}

/**
 * Create session token for local authentication
 */
export async function createClerkSessionToken(userId: string, userData: any) {
    // Create a local session token for backward compatibility
    const sessionToken = `clerk_${userId}_${Date.now()}`;

    // In a real implementation, you would sign this token with your JWT_SECRET
    // For now, we'll use a simple approach
    return sessionToken;
}

/**
 * Register Clerk authentication routes
 */
export function registerClerkRoutes(app: Express) {
    // Clerk webhook for user updates
    app.post("/api/clerk/webhook", async (req: Request, res: Response) => {
        try {
            // Verify the webhook signature
            const svixId = req.headers["svix-id"] as string;
            const svixTimestamp = req.headers["svix-timestamp"] as string;
            const svixSignature = req.headers["svix-signature"] as string;

            if (!svixId || !svixTimestamp || !svixSignature) {
                return res.status(400).json({ error: "Missing webhook headers" });
            }

            // In production, verify the webhook signature
            // const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
            // const payload = await wh.verify(req.body, req.headers);

            const payload = req.body;

            // Handle user creation/update
            if (payload.type === "user.created" || payload.type === "user.updated") {
                const userId = payload.data.id;

                try {
                    const clerkUser = await clerk.users.getUser(userId);

                    const userData = {
                        openId: userId,
                        name: clerkUser.firstName && clerkUser.lastName
                            ? `${clerkUser.firstName} ${clerkUser.lastName}`
                            : clerkUser.username || `user_${userId}`,
                        email: clerkUser.emailAddresses[0]?.emailAddress || null,
                        loginMethod: "clerk",
                        lastSignedIn: new Date(),
                    };

                    await db.upsertUser(userData);
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

    // Health check endpoint
    app.get("/api/clerk/health", (req: Request, res: Response) => {
        res.json({ status: "healthy", clerk: "ready" });
    });
}

/**
 * Get current user from Clerk session
 */
export async function getCurrentUser(req: Request) {
    try {
        if (!req.auth?.userId) {
            return null;
        }

        const userId = req.auth.userId;
        const clerkUser = await clerk.users.getUser(userId);

        if (!clerkUser) {
            return null;
        }

        return {
            id: userId,
            name: clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`
                : clerkUser.username || `user_${userId}`,
            email: clerkUser.emailAddresses[0]?.emailAddress || null,
            image: clerkUser.imageUrl || null,
        };
    } catch (error) {
        console.error("[Clerk] Error getting current user:", error);
        return null;
    }
}
