import { describe, expect, it } from "vitest";
import {
  SUGGESTIONS_BY_MODULE,
  deriveConversationTitle,
  explainError,
  getSuggestionsForPage,
  summarizeQuota,
} from "./assistant.utils";

describe("assistant.utils", () => {
  describe("getSuggestionsForPage", () => {
    it("returns a list for known modules", () => {
      expect(getSuggestionsForPage("dashboard").length).toBeGreaterThan(0);
      expect(getSuggestionsForPage("orders").length).toBeGreaterThan(0);
      expect(getSuggestionsForPage("products").length).toBeGreaterThan(0);
      expect(getSuggestionsForPage("customers").length).toBeGreaterThan(0);
    });

    it("falls back to default for unknown modules", () => {
      expect(getSuggestionsForPage("does-not-exist")).toBe(SUGGESTIONS_BY_MODULE.default);
      expect(getSuggestionsForPage(null)).toBe(SUGGESTIONS_BY_MODULE.default);
    });
  });

  describe("summarizeQuota", () => {
    it("reports unlimited when limit is null", () => {
      expect(summarizeQuota({ limit: null, used: 0 }).state).toBe("unlimited");
    });

    it("computes percent for normal quota", () => {
      const r = summarizeQuota({ used: 78, limit: 100 });
      expect(r.percent).toBe(78);
      expect(r.label).toBe("78 / 100");
      expect(r.state).toBe("normal");
    });

    it("clamps percent to 100", () => {
      expect(summarizeQuota({ used: 150, limit: 100 }).percent).toBe(100);
    });

    it("returns the unknown state for missing data", () => {
      expect(summarizeQuota(null).state).toBe("unknown");
    });
  });

  describe("explainError", () => {
    it("maps quota errors to a quota banner", () => {
      const out = explainError({ code: "AI_QUOTA_EXCEEDED", message: "boom" });
      expect(out.action).toBe("quota");
      expect(out.title).toMatch(/[Ll]imite/);
    });

    it("maps provider timeouts to a retry banner", () => {
      expect(explainError({ code: "PROVIDER_TIMEOUT" }).action).toBe("retry");
    });

    it("maps invalid keys to a settings banner", () => {
      expect(explainError({ code: "INVALID_KEY" }).action).toBe("settings");
    });

    it("maps no-permission to a no-action banner", () => {
      expect(explainError({ code: "NO_PERMISSION" }).action).toBe("none");
    });

    it("falls back to retry on unknown errors", () => {
      expect(explainError({ code: "WHATEVER" }).action).toBe("retry");
      expect(explainError({}).action).toBe("retry");
    });

    it("reads server message from response.data.message", () => {
      const out = explainError({ response: { data: { message: "Custom" } } });
      expect(out.body).toBe("Custom");
    });
  });

  describe("deriveConversationTitle", () => {
    it("truncates to max length with ellipsis", () => {
      expect(deriveConversationTitle("a".repeat(200))).toMatch(/…$/);

      expect(deriveConversationTitle("a".repeat(200)).length).toBeLessThanOrEqual(80);
    });

    it("uses the first line only", () => {
      expect(deriveConversationTitle("Hello\nWorld")).toBe("Hello");
    });

    it("returns a default for empty input", () => {
      expect(deriveConversationTitle("")).toBe("Nouvelle conversation");
      expect(deriveConversationTitle(null)).toBe("Nouvelle conversation");
    });
  });
});