const axios = require("axios");

/**
 * aiService  génération de témoignages via GLM-5.2 (compatible OpenAI).
 *
 * URL de base et clé API sont lues depuis l'environnement :
 *   AI_API_URL      (ex: https://open.bigmodel.cn/api/paas/v4/chat/completions)
 *   AI_API_KEY
 *   AI_MODEL        (ex: glm-4-plus)  défaut "glm-4-plus"
 *
 * Si la clé est absente, on retombe sur un générateur local (mock) afin que
 * le builder reste fonctionnel en dev sans backend d'IA.
 */

const AI_API_URL = process.env.AI_API_URL || "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "glm-4-plus";

const FALLBACK_POOL = [
  { title: "Service client réactif", text: "Livraison ultra rapide et équipe  l'écoute. Je recommande vivement pour la qualité et le SAV.", name: "Claire L.", role: "Directrice marketing", company: "Shoppe", rating: 5, category: "service-client" },
  { title: "Qualité au rendez-vous", text: "Produit conforme  la description, emballage soigné et support réactif.", name: "Antoine M.", role: "Entrepreneur", company: "StartupLab", rating: 5, category: "produit" },
  { title: "Interface intuitive", text: "Outil simple  prendre en main, support réactif et mises  jour régulières.", name: "Sophie R.", role: "Chef de projet", company: "Agence Nexa", rating: 4, category: "produit" },
  { title: "Confiance et professionnalisme", text: "Intégration simple et support trés réactif. Un vrai partenariat gagnant-gagnant.", name: "Youssef B.", role: "Responsable IT", company: "LogiTrans", rating: 5, category: "service-client" },
  { title: "Résultats concrets", text: "Le produit structure nos processus internes. L'équipe propose des améliorations pertinentes.", name: "Emma D.", role: "Directrice opérations", company: "BatiPro", rating: 4, category: "produit" },
];

const mockGenerate = ({ context, category, count }) => {
  const pool = [...FALLBACK_POOL];
  const out = [];
  const n = Math.min(count || 1, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const t = { ...pool[idx] };
    if (context) t.title = `${context}  ${t.title}`;
    if (category) t.category = category;
    t._meta = { source: "ai:mock", generatedAt: new Date().toISOString() };
    out.push(t);
    pool.splice(idx, 1);
  }
  return out;
};

/**
 * Génére un ou plusieurs témoignages.
 * @param {Object} opts { context, category, count, locale }
 * @returns {Promise<Array>} témoignages générés
 */
async function generateTestimonial(opts = {}) {
  const { context = "", category = "", count = 1, locale = "fr" } = opts;

  if (!AI_API_KEY) {
    return mockGenerate({ context, category, count });
  }

  const lang = locale === "fr" ? "français" : locale === "en" ? "anglais" : locale;
  const prompt = `Tu es un assistant qui génére des témoignages clients réalistes et positifs en ${lang}.
Génére ${count} témoignage(s)${context ? ` pour le contexte: "${context}"` : ""}${category ? ` catégorie: "${category}"` : ""}.
Réponds UNIQUEMENT avec un tableau JSON valide, chaque objet ayant: title, text, name, role, company, rating (1-5), category.
Texte concis (2-3 phrases), crédible, sans superlatifs excessifs.`;

  try {
    const res = await axios.post(
      AI_API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: "Tu généres des témoignages clients au format JSON strict." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 800,
      },
      {
        headers: { Authorization: `Bearer ${AI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const content = res.data?.choices?.[0]?.message?.content || "[]";
    // Extraction robuste du JSON (le modèle peut l'enrober).
    const match = content.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items.map((t) => ({
      title: String(t.title || "").slice(0, 200),
      text: String(t.text || "").slice(0, 1000),
      name: String(t.name || "Client").slice(0, 80),
      role: String(t.role || "").slice(0, 80),
      company: String(t.company || "").slice(0, 80),
      rating: Math.max(1, Math.min(5, Number(t.rating) || 5)),
      category: category || String(t.category || "").slice(0, 60),
      _meta: { source: "ai:glm", generatedAt: new Date().toISOString() },
    }));
  } catch (err) {
    // En cas d'échec API, on ne bloque pas l'UX : fallback mock.
    console.warn("[aiService] GLM call failed, using mock:", err.message);
    return mockGenerate({ context, category, count });
  }
}

module.exports = { generateTestimonial };
