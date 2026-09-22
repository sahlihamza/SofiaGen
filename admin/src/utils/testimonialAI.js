/**
 * Mock AI suggestions for testimonials.
 *
 * Contains realistic French testimonial templates that can be used
 * by the builder to auto-fill testimonial fields when the user
 * clicks "AI Generate" in the TestimonialsBlock.
 *
 * No external API dependency required. Replace with your real
 * GLM-5.2 client call once integrated.
 */

const TEMPLATES = [
  {
    title: "Service client réactif et produit conforme",
    text: "Livraison ultra rapide et équipe à l'écoute. Je recommande vivement cette boutique pour la qualité de ses produits et son service après-vente.",
    name: "Claire L.",
    role: "Directrice marketing",
    company: "Shoppe",
    rating: 5,
    category: "service-client",
  },
  {
    title: "Production à la hauteur des attentes",
    text: "Qualité exceptionnelle et rapport qualité prix imbattable. L'expérience d'achat est fluide du début à la fin.",
    name: "Antoine M.",
    role: "Entrepreneur",
    company: "StartupLab",
    rating: 5,
    category: "produit",
  },
  {
    title: "Interface intuitive et résultats au rendez-vous",
    text: "L'outil est simple à prendre en main et m'a fait gagner plusieurs heures par semaine. Support réactif et mises à jour régulières.",
    name: "Sophie R.",
    role: "Chef de projet",
    company: "Agence Nexa",
    rating: 4,
    category: "produit",
  },
  {
    title: "Confiance et professionnalisme",
    text: "Nous avons adopté cette solution pour l'ensemble de nos équipes. L'intégration a été simple et le support suisse très réactif.",
    name: "Youssef B.",
    role: "Responsable IT",
    company: "LogiTrans",
    rating: 5,
    category: "service-client",
  },
  {
    title: "Résultats concrets dès les premières semaines",
    text: "Le produit nous aide à structurer nos processus internes. L'équipe est à l'écoute et propose des améliorations pertinentes.",
    name: "Emma D.",
    role: "Directrice opérations",
    company: "BatiPro",
    rating: 4,
    category: "produit",
  },
  {
    title: "Accompagnement personnalisé",
    text: "On sent qu'ils connaissent notre métier. Chaque demande est traitée avec soin et rapidité. Un vrai partenariat gagnant-gagnant.",
    name: "Lucas M.",
    role: "Co-fondateur",
    company: "Artisan Digital",
    rating: 5,
    category: "service-client",
  },
];

/**
 * Returns a random template, optionally biased toward a specific
 * category and adapted with contextual meta.
 *
 * @param {{ context?: string, category?: string }} options
 */
const getSuggestion = (options = {}) => {
  const { context = "", category } = options;
  let pool = TEMPLATES;

  if (category && pool.some((t) => t.category === category)) {
    pool = pool.filter((t) => t.category === category);
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];

  return {
    title: context ? `${context} — ${pick.title}` : pick.title,
    text: pick.text,
    name: pick.name,
    role: pick.role,
    company: pick.company,
    rating: pick.rating,
    category: pick.category,
    _meta: {
      source: "ai:mock",
      generatedAt: new Date().toISOString(),
    },
  };
};

/**
 * Returns a pool of 3 distinct suggestions.
 */
const getSuggestionPool = (options = {}) => {
  const pool = [...TEMPLATES];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push({ ...pool[idx] });
    pool.splice(idx, 1);
  }
  return out;
};

module.exports = {
  getSuggestion,
  getSuggestionPool,
};
