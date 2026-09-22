const dns = require("dns").promises;
const tls = require("tls");
const StoreDomain = require("../models/StoreDomain");

/**
 * DomainVerificationService
 *
 * The backend determines DNS resolution and SSL certificate state itself.
 * Clients can never set `verified`, `ssl`, dns* or ssl* values directly.
 *
 * Optional configuration:
 *   STOREFRONT_CNAME_TARGET  e.g. "shops.example.com"  CNAME the customer must point to
 *   STOREFRONT_IPS           e.g. "203.0.113.10,203.0.113.11"  A records of the platform
 * When neither is configured, a domain counts as DNS-verified as soon as it
 * publicly resolves (A/CNAME chain).
 */

const CHECK_TIMEOUT_MS = 5000;

const CNAME_TARGET = (process.env.STOREFRONT_CNAME_TARGET || "").trim().toLowerCase();
const PLATFORM_IPS = (process.env.STOREFRONT_IPS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

// Eligibility: platform namespace protection (set PLATFORM_BASE_DOMAIN, e.g.
// "sofia.app") so merchants cannot claim the platform's own host names.
const PLATFORM_BASE_DOMAIN = (process.env.PLATFORM_BASE_DOMAIN || "").trim().toLowerCase();
const RESERVED_SUBDOMAIN_PREFIXES = ["www", "api", "admin", "app", "mail", "smtp", "ftp", "cdn", "static", "media", "assets", "ns1", "ns2"];
const MAX_DOMAIN_LENGTH = 253;

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS);
    }),
  ]);

const normalizeDomain = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

function invalid(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}

/**
 * Static eligibility checks run synchronously at creation/update  before the
 * async DNS/SSL verification. Protects RFC limits and the platform namespace.
 */
function assertDomainEligible(rawDomain) {
  const domain = normalizeDomain(rawDomain);

  if (!domain || domain.length > MAX_DOMAIN_LENGTH) {
    throw invalid(`Domain exceeds the maximum length of ${MAX_DOMAIN_LENGTH} characters`);
  }
  if (domain.includes(" ")) {
    throw invalid("Domain cannot contain spaces");
  }
  const labels = domain.split(".");
  if (labels.length < 2) {
    throw invalid("Domain must include a top-level domain");
  }
  if (labels.some((label) => label.length < 1 || label.length > 63)) {
    throw invalid("Each domain label must be between 1 and 63 characters");
  }
  if (labels.some((label) => label.startsWith("-") || label.endsWith("-"))) {
    throw invalid("Labels cannot start or end with a hyphen");
  }
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    throw invalid(`'${tld}' is not a valid top-level domain`);
  }

  if (PLATFORM_BASE_DOMAIN) {
    const base = normalizeDomain(PLATFORM_BASE_DOMAIN);
    if (domain === base) {
      throw invalid("This domain is reserved by the platform");
    }
    if (domain.endsWith(`.${base}`)) {
      const first = labels[0];
      if (RESERVED_SUBDOMAIN_PREFIXES.includes(first)) {
        throw invalid(`'${first}.*' is a reserved platform subdomain`);
      }
      throw invalid("Subdomains of the platform base domain are provisioned by the platform itself  use your free subdomain instead");
    }
  }

  return domain;
}

async function resolveDns(domain) {
  const outcome = { resolved: false, cname: [], ips: [], matchedTarget: false, error: null };
  const strictMode = Boolean(CNAME_TARGET) || PLATFORM_IPS.length > 0;

  const readIps = async (host) => {
    try {
      return await withTimeout(dns.resolve4(host), "DNS A lookup");
    } catch (e) {
      return [];
    }
  };

  try {
    outcome.ips = await withTimeout(dns.resolve4(domain), "DNS A lookup");
    outcome.resolved = true;
  } catch (aError) {
    try {
      outcome.cname = await withTimeout(dns.resolveCname(domain), "DNS CNAME lookup");
      if (outcome.cname.length > 0) {
        const finalHost = outcome.cname[outcome.cname.length - 1];
        outcome.ips = await readIps(finalHost);
        outcome.resolved = outcome.ips.length > 0 || outcome.cname.length > 0;
      }
    } catch (cnameError) {
      outcome.error = cnameError.message || aError.message || "DNS resolution failed";
    }
  }

  if (!strictMode) {
    outcome.matchedTarget = outcome.resolved;
    return outcome;
  }

  if (CNAME_TARGET && outcome.cname.some((entry) => entry.toLowerCase() === CNAME_TARGET)) {
    outcome.matchedTarget = true;
  }
  if (PLATFORM_IPS.length > 0 && outcome.ips.some((ip) => PLATFORM_IPS.includes(ip))) {
    outcome.matchedTarget = true;
  }
  return outcome;
}

function checkCertificate(domain) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (e) {
        /* noop */
      }
      resolve(payload);
    };

    let socket;
    try {
      socket = tls.connect(
        { host: domain, port: 443, servername: domain, rejectUnauthorized: false, timeout: CHECK_TIMEOUT_MS },
        () => {
          const cert = socket.getPeerCertificate();
          const expiresAt = cert && cert.valid_to ? new Date(cert.valid_to) : null;
          const notExpired = expiresAt ? expiresAt.getTime() > Date.now() : false;
          finish({
            checked: true,
            valid: Boolean(cert && cert.valid_to) && notExpired,
            authorized: socket.authorized === true,
            expiresAt,
            issuer: (cert && cert.issuer && (cert.issuer.O || cert.issuer.CN)) || null,
            subject: (cert && cert.subject && cert.subject.CN) || null,
            error: null,
          });
        }
      );
      socket.on("error", (err) => finish({ checked: true, valid: false, expiresAt: null, issuer: null, error: err.message }));
      socket.on("timeout", () => finish({ checked: true, valid: false, expiresAt: null, issuer: null, error: "TLS handshake timed out" }));
    } catch (err) {
      finish({ checked: false, valid: false, expiresAt: null, issuer: null, error: err.message });
    }
  });
}

async function buildVerificationReport(domainInput) {
  const domain = normalizeDomain(domainInput);
  const dnsResult = await resolveDns(domain);
  const sslResult = await checkCertificate(domain);

  const dnsVerified = dnsResult.matchedTarget || (!CNAME_TARGET && PLATFORM_IPS.length === 0 && dnsResult.resolved);

  return {
    domain,
    dns: {
      status: dnsVerified ? "verified" : "failed",
      cname: dnsResult.cname,
      ips: dnsResult.ips,
      matchedTarget: dnsResult.matchedTarget,
      error: dnsVerified ? null : dnsResult.error || "Domain does not point to this platform yet",
    },
    ssl: {
      status: sslResult.valid ? "active" : "failed",
      expiresAt: sslResult.expiresAt,
      issuer: sslResult.issuer,
      subject: sslResult.subject,
      authorized: sslResult.authorized,
      error: sslResult.error || (sslResult.checked && !sslResult.valid && sslResult.expiresAt ? "Certificate expired" : null),
    },
  };
}

/**
 * Verify a stored domain document (DNS + SSL) and persist the results.
 * Only this service may flip `verified` / `ssl`.
 */
async function verifyStoreDomainDocument(domainDoc) {
  const report = await buildVerificationReport(domainDoc.domain);

  domainDoc.dnsStatus = report.dns.status;
  domainDoc.dnsTarget = CNAME_TARGET || null;
  domainDoc.resolvedIps = report.dns.ips.slice(0, 8);
  domainDoc.lastCheckedAt = new Date();

  const errors = [report.dns.error, report.ssl.error].filter(Boolean);
  domainDoc.lastError = errors.length > 0 ? errors.join("  ") : null;

  domainDoc.sslExpiresAt = report.ssl.expiresAt;
  domainDoc.sslIssuer = report.ssl.issuer;
  domainDoc.sslLastCheckedAt = new Date();

  domainDoc.verified = report.dns.status === "verified";
  domainDoc.ssl = report.ssl.status === "active";

  await domainDoc.save();
  return domainDoc;
}

async function verifyById(domainId, storeId) {
  const query = { _id: domainId };
  if (storeId) query.storeId = storeId;
  const domainDoc = await StoreDomain.findOne(query);
  if (!domainDoc) {
    const error = new Error("Domain not found");
    error.name = "NotFound";
    throw error;
  }
  return verifyStoreDomainDocument(domainDoc);
}

module.exports = {
  normalizeDomain,
  assertDomainEligible,
  buildVerificationReport,
  verifyStoreDomainDocument,
  verifyById,
};
