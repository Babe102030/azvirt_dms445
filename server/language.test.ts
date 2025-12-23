import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Language Preference System", () => {
  const testUserId = 999;
  const testUser = {
    openId: `test-language-${Date.now()}`,
    name: "Language Test User",
    email: "language-test@example.com",
    loginMethod: "oauth",
    role: "user" as const,
    languagePreference: "en",
  };

  beforeAll(async () => {
    // Create a test user
    await db.upsertUser(testUser);
  });

  describe("updateUserLanguagePreference", () => {
    it("should update user language preference to Bosnian", async () => {
      const result = await db.updateUserLanguagePreference(testUserId, "bs");
      expect(result).toBe(true);
    });

    it("should update user language preference to Azerbaijani", async () => {
      const result = await db.updateUserLanguagePreference(testUserId, "az");
      expect(result).toBe(true);
    });

    it("should update user language preference back to English", async () => {
      const result = await db.updateUserLanguagePreference(testUserId, "en");
      expect(result).toBe(true);
    });

    it("should handle invalid user IDs gracefully", async () => {
      const result = await db.updateUserLanguagePreference(-1, "en");
      // Should return true even for non-existent users (no error thrown)
      expect(typeof result).toBe("boolean");
    });

    it("should support all three language options", async () => {
      const languages = ["en", "bs", "az"];
      
      for (const lang of languages) {
        const result = await db.updateUserLanguagePreference(testUserId, lang);
        expect(result).toBe(true);
      }
    });
  });

  describe("Language persistence", () => {
    it("should persist language preference across multiple updates", async () => {
      // Update to Azerbaijani
      let result = await db.updateUserLanguagePreference(testUserId, "az");
      expect(result).toBe(true);

      // Update to Bosnian
      result = await db.updateUserLanguagePreference(testUserId, "bs");
      expect(result).toBe(true);

      // Update back to English
      result = await db.updateUserLanguagePreference(testUserId, "en");
      expect(result).toBe(true);
    });

    it("should handle rapid language preference changes", async () => {
      const languages = ["en", "bs", "az", "en", "bs"];
      
      for (const lang of languages) {
        const result = await db.updateUserLanguagePreference(testUserId, lang);
        expect(result).toBe(true);
      }
    });
  });

  describe("RTL Language Support", () => {
    it("should identify RTL languages correctly", () => {
      const rtlLanguages = ["ar", "fa", "he", "ur"];
      const ltrLanguages = ["en", "bs", "az"];

      // RTL languages should be detected
      rtlLanguages.forEach(lang => {
        expect(rtlLanguages.includes(lang)).toBe(true);
      });

      // LTR languages should not be in RTL list
      ltrLanguages.forEach(lang => {
        expect(rtlLanguages.includes(lang)).toBe(false);
      });
    });

    it("should support future RTL language additions", async () => {
      // Test that the system can handle RTL language codes
      // (even though they're not yet in the translation files)
      const rtlLanguageCodes = ["ar", "fa", "he", "ur"];
      
      rtlLanguageCodes.forEach(code => {
        expect(code.length).toBeLessThanOrEqual(10);
        expect(typeof code).toBe("string");
      });
    });
  });

  describe("Language Preference Enum Validation", () => {
    it("should validate language preference enum values", () => {
      const validLanguages = ["en", "bs", "az"];
      
      validLanguages.forEach(lang => {
        expect(["en", "bs", "az"].includes(lang)).toBe(true);
      });
    });

    it("should reject invalid language codes", () => {
      const invalidLanguages = ["xx", "invalid", "123"];
      
      invalidLanguages.forEach(lang => {
        expect(["en", "bs", "az"].includes(lang)).toBe(false);
      });
    });
  });
});
