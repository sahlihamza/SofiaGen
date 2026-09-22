// Minimal server-rendered HTML page for a product's reviews, since this
// workspace has no separate storefront app. Not a full product page (no
// photos/price/cart)  just the review section from ticket section 14, plus
// Schema.org structured data (Review + AggregateRating) from section 12.
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const STAR = "";
const stars = (rating) => STAR.repeat(rating) + `<span class="dim">${STAR.repeat(5 - rating)}</span>`;

const buildJsonLd = (summary, baseUrl) => {
  const productLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: summary.product.name,
    ...(summary.rating && summary.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summary.rating.average,
            reviewCount: summary.rating.count,
          },
        }
      : {}),
    review: summary.reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.reviewerName },
      datePublished: new Date(r.createdAt).toISOString(),
      reviewBody: r.comment,
      name: r.title || undefined,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    })),
  };

  return JSON.stringify(productLd, null, 2);
};

const renderRatingSummary = (summary) => {
  if (!summary.settings.showRating && !summary.settings.showCount) return "";

  const average = summary.settings.showRating ? summary.rating?.average || 0 : null;
  const count = summary.settings.showCount ? summary.rating?.count || 0 : null;

  const bars = summary.distribution
    ? [5, 4, 3, 2, 1]
        .map(
          (star) => `
      <div class="dist-row">
        <span class="dist-star">${star}</span>
        <div class="dist-bar"><div class="dist-fill" style="width:${summary.distributionPct[star]}%"></div></div>
        <span class="dist-pct">${summary.distributionPct[star]}%</span>
      </div>`
        )
        .join("")
    : "";

  return `
    <div class="rating-summary">
      ${average !== null ? `<div class="rating-average">${stars(Math.round(average))} <strong>${average.toFixed(1)}</strong> / 5</div>` : ""}
      ${count !== null ? `<div class="rating-count">${count} avis</div>` : ""}
      ${bars}
    </div>`;
};

const renderReview = (review) => {
  const media = (review.media || [])
    .map((m) =>
      m.type === "video"
        ? `<video src="/static/${escapeHtml(m.url)}" controls class="review-media"></video>`
        : `<img src="/static/${escapeHtml(m.url)}" alt="" class="review-media" />`
    )
    .join("");

  const reply = review.reply?.message
    ? `<div class="store-reply"><strong>Réponse boutique</strong><p>${escapeHtml(review.reply.message)}</p></div>`
    : "";

  return `
    <li class="review" data-review-id="${review._id}">
      <div class="review-head">
        <span class="review-author">${escapeHtml(review.reviewerName)}</span>
        ${review.verifiedPurchase ? `<span class="badge">Achat vérifié</span>` : ""}
      </div>
      <div class="review-stars">${stars(review.rating)}</div>
      ${review.title ? `<h3 class="review-title">${escapeHtml(review.title)}</h3>` : ""}
      <p class="review-comment">${escapeHtml(review.comment)}</p>
      ${media ? `<div class="review-media-list">${media}</div>` : ""}
      ${reply}
      <div class="review-actions">
        <button type="button" class="vote-btn" data-vote="up" data-review="${review._id}">=M <span class="vote-count">${review.helpfulCount || 0}</span></button>
        <button type="button" class="vote-btn" data-vote="down" data-review="${review._id}">=N <span class="vote-count">${review.notHelpfulCount || 0}</span></button>
        <button type="button" class="report-btn" data-review="${review._id}">Signaler</button>
      </div>
    </li>`;
};

const PAGE_STYLES = `
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; color: #1f2937; background: #fafafa; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .subtitle { color: #6b7280; margin-top: 0; margin-bottom: 24px; }
  .dim { color: #d1d5db; }
  .rating-summary { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .rating-average { font-size: 1.3rem; color: #d97706; margin-bottom: 4px; }
  .rating-count { color: #6b7280; font-size: 0.9rem; margin-bottom: 12px; }
  .dist-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin-bottom: 4px; }
  .dist-star { width: 28px; color: #6b7280; }
  .dist-bar { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
  .dist-fill { height: 100%; background: #d97706; }
  .dist-pct { width: 36px; text-align: right; color: #6b7280; }
  ul.review-list { list-style: none; padding: 0; margin: 0; }
  .review { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .review-author { font-weight: 600; }
  .badge { font-size: 0.7rem; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; }
  .review-stars { color: #d97706; margin-bottom: 8px; }
  .review-title { font-size: 1rem; margin: 4px 0; }
  .review-comment { color: #374151; line-height: 1.5; }
  .review-media-list { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .review-media { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  .store-reply { margin-top: 10px; padding: 10px 12px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; font-size: 0.9rem; }
  .store-reply strong { display: block; margin-bottom: 2px; color: #15803d; }
  .review-actions { margin-top: 12px; display: flex; gap: 12px; align-items: center; }
  .vote-btn, .report-btn { border: 1px solid #e5e7eb; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 0.85rem; cursor: pointer; }
  .vote-btn.active { background: #ecfdf5; border-color: #10b981; }
  .report-btn { margin-left: auto; color: #dc2626; }
  .empty { color: #6b7280; text-align: center; padding: 32px 0; }
`;

// Tiny progressive-enhancement script: calls the public vote/report API and
// updates counts in place. No framework needed for a page this small.
const PAGE_SCRIPT = (productId) => `
  const API_BASE = "/api/public/reviews";
  const voterKey = (() => {
    let key = localStorage.getItem("reviewVoterKey");
    if (!key) {
      key = "anon-" + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem("reviewVoterKey", key);
    }
    return key;
  })();

  document.querySelectorAll(".vote-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reviewId = btn.dataset.review;
      const vote = btn.dataset.vote;
      try {
        const res = await fetch(\`\${API_BASE}/\${reviewId}/vote\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote, voterKey }),
        });
        const json = await res.json();
        if (!json.success) return;
        const li = btn.closest(".review");
        li.querySelector('[data-vote="up"] .vote-count').textContent = json.data.helpfulCount ?? 0;
        li.querySelector('[data-vote="down"] .vote-count').textContent = json.data.notHelpfulCount ?? 0;
      } catch (e) { /* best-effort, no UI crash on a network hiccup */ }
    });
  });

  document.querySelectorAll(".report-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reason = "spam";
      if (!reason) return;
      try {
        const res = await fetch(\`\${API_BASE}/\${btn.dataset.review}/report\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, voterKey, reporterKey: voterKey }),
        });
        const json = await res.json();
        if (json.success) { btn.textContent = "Signalé"; btn.disabled = true; }
      } catch (e) { /* best-effort */ }
    });
  });
`;

const renderProductReviewsPage = (summary) => {
  const title = `Avis clients  ${escapeHtml(summary.product.name)}`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="Avis clients pour ${escapeHtml(summary.product.name)}" />
  <script type="application/ld+json">${buildJsonLd(summary)}</script>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(summary.product.name)}</h1>
  <p class="subtitle">Avis clients</p>

  ${renderRatingSummary(summary)}

  ${
    summary.reviews.length === 0
      ? `<p class="empty">Aucun avis pour le moment.</p>`
      : `<ul class="review-list">${summary.reviews.map(renderReview).join("")}</ul>`
  }

  <script>${PAGE_SCRIPT(summary.product._id)}</script>
</body>
</html>`;
};

module.exports = { renderProductReviewsPage, escapeHtml };
