import { describe, expect, it } from "vitest";
import { getSidebarAccessFallbackForAdmin } from "./permissions";

describe("getSidebarAccessFallbackForAdmin", () => {
  it("returns a default sidebar access list for the adminstore role", () => {
    const access = getSidebarAccessFallbackForAdmin({
      userType: "store_admin",
      role: [{ name: "adminstore" }],
    });

    expect(access).toEqual(
      expect.arrayContaining(["dashboard", "products", "orders", "customers"])
    );
    expect(access).toContain("dashboard");
  });

  it("resolves sidebar access from role permissions", () => {
    const access = getSidebarAccessFallbackForAdmin({
      userType: "store_admin",
      role: [{
        name: "adminstore",
        permissions: [{ module: "Products", action: "view" }],
      }],
    });

    expect(access).toContain("dashboard");
  });

  it("returns an empty list for a non-store-admin account", () => {
    expect(getSidebarAccessFallbackForAdmin({ userType: "customer" })).toEqual([]);
  });
});
