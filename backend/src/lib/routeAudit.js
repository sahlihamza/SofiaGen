const fs = require("fs");
const path = require("path");

// SO-14: statically audits src/routes.js for /api mounts that carry no
// `isAuth` in their mount-level middleware AND whose router file defines at
// least one write route (POST/PUT/PATCH/DELETE)  i.e. a mutation reachable
// with no authentication at all. Read-only public browsing endpoints
// (product listing, category listing, etc.) are common and not inherently
// wrong for a storefront, so this deliberately does NOT flag every
// auth-less mount  only ones that can actually change data.
//
// Static regex parsing rather than requiring routes.js itself: routes.js
// calls `mongoose.connect`/imports the whole app graph as a side effect of
// being required, which is far too heavy (and stateful) for a fast,
// repeatable audit/test.

const ROUTES_FILE = path.join(__dirname, "..", "routes.js");
const ROUTES_DIR = path.join(__dirname, "..", "routes");

const MOUNT_REGEX = /app\.use\(\s*(?:\n\s*)?["'`](\/api[^"'`]*)["'`]\s*,([^)]*)\)/gs;
const AUTH_KEYWORD_REGEX = /\b(isAuth|requireCustomer|loadCustomerOptional|isAdmin|hasPermission|hasAnyPermission|requirePermission)\b/;

const extractRouterVarName = (argsText) => {
  // The router instance is whatever identifier comes right before the
  // closing paren  every mount in this file ends with the router variable
  // as its last argument (middleware first, router last).
  const parts = argsText
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1];
};

const findRouterRequirePath = (routesSource, varName) => {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*require\\(["'\`]([^"'\`]+)["'\`]\\)`);
  const match = routesSource.match(re);
  return match ? match[1] : null;
};

// Route files that legitimately have zero auth of any kind by design (login/
// register can't require being logged in; a couple of public storefront
// endpoints are intentionally anonymous-readable). Anything NOT in this list
// that has write routes and no auth reference anywhere is a real finding.
const KNOWN_INTENTIONALLY_PUBLIC = new Set([
  "./routes/authRoutes", // login/register/forgot-password  must be reachable unauthenticated
]);

const inspectRouterFile = (requirePath) => {
  if (!requirePath || !requirePath.startsWith("./routes/")) return { resolved: false };
  const absPath = path.join(ROUTES_DIR, requirePath.replace("./routes/", ""));
  const candidates = [absPath, `${absPath}.js`];
  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) return { resolved: false };

  const source = fs.readFileSync(filePath, "utf8");
  const hasWrites = /router\.(post|put|patch|delete)\s*\(/i.test(source);
  // Route-level auth: isAuth used per-route, or the customer-session
  // equivalents (loadCustomerOptional/requireCustomer) that storefront
  // routers protect themselves with instead of the admin isAuth.
  const hasAnyAuthReference = AUTH_KEYWORD_REGEX.test(source);

  return { resolved: true, hasWrites, hasAnyAuthReference, filePath };
};

/**
 * Returns every /api mount whose middleware chain lacks `isAuth`, whose
 * router file defines at least one write (POST/PUT/PATCH/DELETE) route, AND
 * whose file has no auth reference anywhere (mount-level or route-level) 
 * i.e. a mutation genuinely reachable by anyone, not a storefront flow that
 * protects itself with its own customer-session middleware.
 */
const findUnauthenticatedWriteMounts = () => {
  const routesSource = fs.readFileSync(ROUTES_FILE, "utf8");
  const findings = [];

  for (const match of routesSource.matchAll(MOUNT_REGEX)) {
    const [, mountPath, argsText] = match;
    if (AUTH_KEYWORD_REGEX.test(argsText)) continue;

    const varName = extractRouterVarName(argsText);
    if (!varName || /^\(/.test(varName)) continue; // inline handler, e.g. app.use("/api", (req,res)=>{...})

    const requirePath = findRouterRequirePath(routesSource, varName);
    if (KNOWN_INTENTIONALLY_PUBLIC.has(requirePath)) continue;

    const { resolved, hasWrites, hasAnyAuthReference, filePath } = inspectRouterFile(requirePath);
    if (!resolved || !hasWrites || hasAnyAuthReference) continue;

    findings.push({ mountPath, routerVar: varName, filePath });
  }

  return findings;
};

module.exports = { findUnauthenticatedWriteMounts };
