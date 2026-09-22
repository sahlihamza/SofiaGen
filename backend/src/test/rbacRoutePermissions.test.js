const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "..", "routes");
const { permissions } = require("../config/rbac/permissions");

const VALID_CODES = new Set(permissions.map((p) => p.code));

function extractPermissionStrings(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const matches = [];
  
  content.replace(/requirePermission\(([^)]+)\)/g, (match, arg) => {
    const trimmed = arg.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const code = trimmed.slice(1, -1);
      if (code && !code.startsWith("getCode") && !code.startsWith("getCodes")) {
        matches.push({ type: "requirePermission", code, line: content.substring(0, content.indexOf(match)).split('\n').length });
      }
    }
  });

  content.replace(/requireAnyPermission\(([^)]+)\)/g, (match, arg) => {
    const trimmed = arg.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const code = trimmed.slice(1, -1);
      if (code && !code.startsWith("getCode") && !code.startsWith("getCodes")) {
        matches.push({ type: "requireAnyPermission", code, line: content.substring(0, content.indexOf(match)).split('\n').length });
      }
    }
  });

  content.replace(/hasAnyPermission\(\[([^\]]+)\]\)/g, (match, codesStr) => {
    const codes = codesStr.split(",").map((c) => c.trim().replace(/"/g, ""));
    codes.forEach((code) => {
      if (code && !code.startsWith("getCode") && !code.startsWith("getCodes")) {
        matches.push({ type: "hasAnyPermission", code, line: content.substring(0, content.indexOf(match)).split('\n').length });
      }
    });
  });

  return matches;
}

const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".js"));

let allViolations = [];

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const perms = extractPermissionStrings(filePath);
  
  const violations = perms.filter((p) => !VALID_CODES.has(p.code));
  
  if (violations.length > 0) {
    allViolations.push(...violations.map((v) => ({ ...v, file })));
  }
}

if (allViolations.length === 0) {
  console.log(`\u2705 RBAC Registry Compliance: All ${routeFiles.length} route files are compliant.`);
} else {
  console.log(`\u274C RBAC Registry Compliance: Found ${allViolations.length} violations in ${new Set(allViolations.map(v => v.file)).size} files:`);
  allViolations.forEach((v) => {
    console.log(`  - ${v.file}:${v.line} [${v.type}] "${v.code}" not in RBAC registry`);
  });
}

process.exit(allViolations.length === 0 ? 0 : 1);
