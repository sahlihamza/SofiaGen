// Seed data for the `posts` collection (models/Post.js). Fixed _ids let
// ./postComments.js reference these posts, and `categories`/`tags` reference
// ./postCategories.js and ./postTags.js  same cross-referencing convention
// as ./attributes.js + ./attributeValues.js.
// NOTE: `storeId` and `authorId` are required by the schema but are injected
// at seed time in src/script/seed.js (mapped to the actual active store and
// a seeded admin), not hardcoded here.
const CATEGORY = {
  ACTUALITES: "64c100000000000000000001",
  TECH: "64c100000000000000000002",
  GUIDES: "64c100000000000000000003",
  CONSEILS: "64c100000000000000000004",
};

const TAG = {
  NOUVEAUTE: "64d100000000000000000001",
  PROMOTION: "64d100000000000000000002",
  TUTORIEL: "64d100000000000000000003",
  ASTUCE: "64d100000000000000000004",
};

const posts = [
  {
    _id: "64e100000000000000000001",
    title: "Comment bien choisir sa taille de vétement en ligne",
    slug: "comment-bien-choisir-sa-taille-de-vetement-en-ligne",
    excerpt: "Nos conseils pour éviter les erreurs de taille lors de vos achats en ligne.",
    content:
      "<p>Choisir la bonne taille sans pouvoir essayer le vétement peut vite devenir un casse-tête. Voici quelques réflexes simples pour limiter les retours.</p><p>Prenez toujours vos propres mesures (tour de poitrine, taille, hanches) et comparez-les au guide des tailles disponible sur chaque fiche produit plutôt qu'à votre taille habituelle en magasin.</p><p>En cas de doute entre deux tailles, privilégiez la plus grande pour les matières peu extensibles comme le denim.</p>",
    featuredImage: "https://picsum.photos/seed/post-taille-vetement/800/450",
    gallery: [],
    status: "published",
    visibility: "public",
    allowComments: true,
    readingTime: 2,
    featured: true,
    sticky: false,
    categories: [CATEGORY.GUIDES, CATEGORY.CONSEILS],
    tags: [TAG.ASTUCE, TAG.TUTORIEL],
    seo: {
      metaTitle: "Comment choisir sa taille de vétement en ligne",
      metaDescription: "Le guide pour commander la bonne taille du premier coup et éviter les retours.",
    },
    publishedAt: new Date("2026-06-02T09:00:00.000Z"),
  },
  {
    _id: "64e100000000000000000002",
    title: "Les nouveautés de la rentré 2026",
    slug: "les-nouveautes-de-la-rentree-2026",
    excerpt: "Découvrez les nouvelles collections qui arrivent en boutique ce mois-ci.",
    content:
      "<p>La rentré 2026 apporte son lot de nouveautés ! Nouvelles couleurs, nouvelles matières, et quelques surprises que nous avons hôte de vous présenter.</p><p>Les précommandes sont ouvertes dés aujourd'hui pour les membres de notre programme de fidélité.</p>",
    featuredImage: "https://picsum.photos/seed/post-rentree-2026/800/450",
    gallery: ["https://picsum.photos/seed/post-rentree-2026-b/800/450"],
    status: "published",
    visibility: "public",
    allowComments: true,
    readingTime: 1,
    featured: false,
    sticky: true,
    categories: [CATEGORY.ACTUALITES],
    tags: [TAG.NOUVEAUTE],
    seo: {
      metaTitle: "Nouveautés rentré 2026",
      metaDescription: "Toutes les nouvelles collections de la rentré, disponibles dés maintenant.",
    },
    publishedAt: new Date("2026-07-10T08:30:00.000Z"),
  },
  {
    _id: "64e100000000000000000003",
    title: "5 astuces pour entretenir vos chaussures en cuir",
    slug: "5-astuces-pour-entretenir-vos-chaussures-en-cuir",
    excerpt: "Faites durer vos chaussures en cuir plus longtemps gréce  ces gestes simples.",
    content:
      "<p>Le cuir demande un peu d'entretien régulier pour rester beau. Voici 5 gestes simples  adopter.</p><ol><li>Cirez vos chaussures toutes les 2  3 semaines.</li><li>Laissez-les sécher  l'air libre, jamais prés d'une source de chaleur directe.</li><li>Utilisez des embauchoirs pour garder la forme.</li><li>Traitez le cuir avant la première utilisation par temps de pluie.</li><li>Alternez les paires pour laisser le cuir respirer entre deux ports.</li></ol>",
    featuredImage: "https://picsum.photos/seed/post-chaussures-cuir/800/450",
    gallery: [],
    status: "published",
    visibility: "public",
    allowComments: true,
    readingTime: 2,
    featured: false,
    sticky: false,
    categories: [CATEGORY.CONSEILS],
    tags: [TAG.ASTUCE],
    seo: {
      metaTitle: "Entretenir ses chaussures en cuir",
      metaDescription: "5 astuces simples pour prolonger la vie de vos chaussures en cuir.",
    },
    publishedAt: new Date("2026-05-18T14:00:00.000Z"),
  },
  {
    _id: "64e100000000000000000004",
    title: "Notre boutique lance son programme de fidélité",
    slug: "notre-boutique-lance-son-programme-de-fidelite",
    excerpt: "Cumulez des points  chaque commande et profitez de réductions exclusives.",
    content:
      "<p>Nous sommes heureux de lancer notre tout nouveau programme de fidélité ! Chaque commande vous rapporte des points, échangeables contre des réductions sur vos prochains achats.</p><p>L'inscription est gratuite et se fait directement depuis votre compte client.</p>",
    featuredImage: "https://picsum.photos/seed/post-fidelite/800/450",
    gallery: [],
    status: "published",
    visibility: "public",
    allowComments: true,
    readingTime: 1,
    featured: false,
    sticky: false,
    categories: [CATEGORY.ACTUALITES],
    tags: [TAG.PROMOTION],
    seo: {
      metaTitle: "Programme de fidélité",
      metaDescription: "Cumulez des points et profitez de réductions gréce  notre programme de fidélité.",
    },
    publishedAt: new Date("2026-07-01T10:00:00.000Z"),
  },
  {
    _id: "64e100000000000000000005",
    title: "Tendances tech pour la maison connecté",
    slug: "tendances-tech-pour-la-maison-connectee",
    excerpt: "Un tour d'horizon des objets connectés  surveiller cette anné.",
    content:
      "<p>Brouillon en cours de rédaction : ce post recensera les meilleurs objets connectés  ajouter  sa maison en 2026.</p>",
    gallery: [],
    status: "draft",
    visibility: "public",
    allowComments: true,
    readingTime: 1,
    featured: false,
    sticky: false,
    categories: [CATEGORY.TECH],
    tags: [TAG.NOUVEAUTE, TAG.TUTORIEL],
    seo: {},
  },
  {
    _id: "64e100000000000000000006",
    title: "Guide complet : comment suivre votre commande",
    slug: "guide-complet-comment-suivre-votre-commande",
    excerpt: "Toutes les Étapes pour suivre votre colis, de la commande à la livraison.",
    content:
      "<p>Une fois votre commande validé, vous recevez un email de confirmation contenant votre numéro de suivi.</p><p>Ce numéro vous permet de suivre l'avancement de la livraison directement depuis votre espace client, dans la section \"Mes commandes\".</p>",
    featuredImage: "https://picsum.photos/seed/post-suivi-commande/800/450",
    gallery: [],
    status: "archived",
    visibility: "public",
    allowComments: false,
    readingTime: 1,
    featured: false,
    sticky: false,
    categories: [CATEGORY.GUIDES],
    tags: [TAG.TUTORIEL],
    seo: {
      metaTitle: "Suivre sa commande",
      metaDescription: "Le guide complet pour suivre votre commande Étape par Étape.",
    },
    publishedAt: new Date("2026-03-05T11:00:00.000Z"),
  },
];

module.exports = posts;
