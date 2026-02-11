import { db } from "../db";
import { aiConversations } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export async function getAiConversations(userId: number) {
  return await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.createdAt));
}
