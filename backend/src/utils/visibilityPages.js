const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttr = escapeHtml;

const NOINDEX_META = '<meta name="robots" content="noindex,nofollow">';
const baseLayout = ({ title, accentColor, noindex, backgroundImage, body, theme }) => `<!doctype html>
<html lang="fr"${theme ? ` data-theme="${theme === "dark" ? "dark" : "light"}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? NOINDEX_META : ""}
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #f7f7f7;
    --card-bg: #ffffff;
    --text: #1f2937;
    --text-muted: #4b5563;
    --text-subtle: #6b7280;
    --border: #d1d5db;
    --chip-bg: #f3f4f6;
    --shadow: rgba(0,0,0,.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f172a;
      --card-bg: #1f2937;
      --text: #f3f4f6;
      --text-muted: #cbd5e1;
      --text-subtle: #9ca3af;
      --border: #374151;
      --chip-bg: #111827;
      --shadow: rgba(0,0,0,.4);
    }
  }
  html[data-theme="dark"] {
    --bg: #0f172a;
    --card-bg: #1f2937;
    --text: #f3f4f6;
    --text-muted: #cbd5e1;
    --text-subtle: #9ca3af;
    --border: #374151;
    --chip-bg: #111827;
    --shadow: rgba(0,0,0,.4);
  }
  html[data-theme="light"] {
    --bg: #f7f7f7;
    --card-bg: #ffffff;
    --text: #1f2937;
    --text-muted: #4b5563;
    --text-subtle: #6b7280;
    --border: #d1d5db;
    --chip-bg: #f3f4f6;
    --shadow: rgba(0,0,0,.08);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: var(--text);
    background: var(--bg);
    ${
      backgroundImage
        ? `background-image: url("${escapeAttr(backgroundImage)}"); background-size: cover; background-position: center;`
        : ""
    }
  }
  .card {
    width: 100%;
    max-width: 520px;
    background: var(--card-bg);
    border-radius: 12px;
    border-top: 5px solid ${escapeAttr(accentColor)};
    box-shadow: 0 10px 30px var(--shadow);
    padding: 40px 32px;
    text-align: center;
  }
  .logo { max-width: 160px; margin: 0 auto 20px; display: block; }
  .illustration { max-width: 100%; border-radius: 8px; margin: 0 auto 24px; display: block; }
  h1 { margin: 0 0 12px; font-size: 24px; color: ${escapeAttr(accentColor)}; }
  p { margin: 0 0 16px; line-height: 1.6; color: var(--text-muted); }
  .btn {
    display: inline-block;
    padding: 12px 24px;
    border-radius: 8px;
    background: ${escapeAttr(accentColor)};
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    border: 0;
    cursor: pointer;
    font-size: 14px;
  }
  input[type="password"], input[type="email"] {
    width: 100%;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 12px;
    background: var(--card-bg);
    color: var(--text);
  }
  .error { color: #f87171; font-size: 14px; margin-bottom: 12px; }
  .hint { font-size: 13px; color: var(--text-subtle); }
  code { background: var(--chip-bg); color: var(--text); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  .countdown { display: flex; gap: 12px; justify-content: center; margin: 24px 0; }
  .countdown div {
    background: var(--chip-bg); border-radius: 8px; padding: 12px 16px; min-width: 68px;
  }
  .countdown span { display: block; font-size: 24px; font-weight: 700; color: ${escapeAttr(accentColor)}; }
  .countdown small { font-size: 11px; text-transform: uppercase; color: var(--text-subtle); letter-spacing: .04em; }
  .social { margin-top: 20px; }
  .social a { color: ${escapeAttr(accentColor)}; margin: 0 8px; text-decoration: none; font-size: 14px; }
</style>
</head>
<body><div class="card">${body}</div>
<script>
  // Lets the admin preview panel flip light/dark instantly (postMessage from
  // the parent window) without refetching this page from the server.
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "sofiagen-preview-theme") return;
    document.documentElement.setAttribute(
      "data-theme",
      event.data.theme === "dark" ? "dark" : "light"
    );
  });
</script>
</body>
</html>`;

const renderMaintenancePage = (settings, { theme } = {}) => {
  const m = settings.maintenance || {};
  const accentColor = m.color || "#720eec";

  const body = `
    ${m.image ? `<img class="illustration" src="${escapeAttr(m.image)}" alt="">` : ""}
    <h1>${escapeHtml(m.title || "Site en maintenance")}</h1>
    <p>${escapeHtml(m.description || "")}</p>
    ${
      m.contactButtonLabel && m.contactButtonUrl
        ? `<a class="btn" href="${escapeAttr(m.contactButtonUrl)}">${escapeHtml(m.contactButtonLabel)}</a>`
        : ""
    }
  `;

  return baseLayout({
    title: m.title || "Site en maintenance",
    accentColor,
    noindex: true,
    body,
    theme,
  });
};

const renderComingSoonPage = (settings, { theme } = {}) => {
  const c = settings.comingSoon || {};
  const accentColor = "#720eec";
  const launchIso = c.launchDate ? new Date(c.launchDate).toISOString() : "";

  const countdownBlock =
    c.countdown && launchIso
      ? `
    <div class="countdown" id="countdown">
      <div><span data-unit="days">--</span><small>Jours</small></div>
      <div><span data-unit="hours">--</span><small>Heures</small></div>
      <div><span data-unit="minutes">--</span><small>Minutes</small></div>
      <div><span data-unit="seconds">--</span><small>Secondes</small></div>
    </div>
    <script>
      (function () {
        var target = new Date("${launchIso}").getTime();
        var root = document.getElementById("countdown");
        function pad(n) { return n < 10 ? "0" + n : String(n); }
        function tick() {
          var diff = target - Date.now();
          if (diff < 0) diff = 0;
          var s = Math.floor(diff / 1000);
          var parts = {
            days: Math.floor(s / 86400),
            hours: Math.floor((s % 86400) / 3600),
            minutes: Math.floor((s % 3600) / 60),
            seconds: s % 60
          };
          Object.keys(parts).forEach(function (unit) {
            var el = root.querySelector('[data-unit="' + unit + '"]');
            if (el) el.textContent = pad(parts[unit]);
          });
        }
        tick();
        setInterval(tick, 1000);
      })();
    </script>`
      : "";

  const newsletterBlock = c.newsletter
    ? `
    <form method="POST" action="/coming-soon/subscribe">
      <input type="email" name="email" placeholder="votre@email.com" required>
      <button class="btn" type="submit">Me tenir informé</button>
    </form>`
    : "";

  const socialBlock =
    Array.isArray(c.socialLinks) && c.socialLinks.length > 0
      ? `<div class="social">${c.socialLinks
          .filter((link) => link.url)
          .map(
            (link) =>
              `<a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || link.url)}</a>`
          )
          .join("")}</div>`
      : "";

  const body = `
    ${c.logo ? `<img class="logo" src="${escapeAttr(c.logo)}" alt="">` : ""}
    <h1>${escapeHtml(c.title || "Bientît disponible")}</h1>
    <p>${escapeHtml(c.description || "")}</p>
    ${countdownBlock}
    ${newsletterBlock}
    ${socialBlock}
  `;

  return baseLayout({
    title: c.title || "Bientît disponible",
    accentColor,
    noindex: true,
    backgroundImage: c.backgroundImage,
    body,
    theme,
  });
};

const renderPasswordPage = (settings, { error = "", redirectTo = "/", theme } = {}) => {
  const p = settings.passwordPage || {};
  const accentColor = "#720eec";

  const body = `
    ${p.logo ? `<img class="logo" src="${escapeAttr(p.logo)}" alt="">` : ""}
    ${p.image ? `<img class="illustration" src="${escapeAttr(p.image)}" alt="">` : ""}
    <h1>Accès protég</h1>
    <p>${escapeHtml(p.welcomeMessage || "")}</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST" action="/site-access">
      <input type="hidden" name="redirectTo" value="${escapeAttr(redirectTo)}">
      <input type="password" name="password" placeholder="Mot de passe" required autofocus>
      <button class="btn" type="submit">Accéder au site</button>
    </form>
  `;

  return baseLayout({
    title: "Accès protég",
    accentColor,
    noindex: true,
    body,
    theme,
  });
};

const renderPublicPage = ({ theme } = {}) => {
  const body = `
    <h1>Mode public</h1>
    <p>Le site est entièrement accessible et indexable par les moteurs de recherche.</p>
  `;

  return baseLayout({
    title: "Mode public",
    accentColor: "#16a34a",
    noindex: false,
    body,
    theme,
  });
};

const renderPrivatePage = ({ theme } = {}) => {
  const body = `
    <h1>Mode privé</h1>
    <p>Les visiteurs anonymes sont redirigés vers <code>/login</code>.<br>Seuls les utilisateurs connectés accédent au site.</p>
  `;

  return baseLayout({
    title: "Mode privé",
    accentColor: "#720eec",
    noindex: true,
    body,
    theme,
  });
};

module.exports = {
  escapeHtml,
  renderMaintenancePage,
  renderComingSoonPage,
  renderPasswordPage,
  renderPublicPage,
  renderPrivatePage,
  NOINDEX_META,
};
