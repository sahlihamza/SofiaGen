// Seed data for the `postcomments` collection (models/PostComment.js).
// `postId` references the fixed _ids from ./posts.js, and `parentId` builds a
// threaded reply on the first post  same cross-referencing convention as
// ./attributes.js + ./attributeValues.js.
// NOTE: `storeId` is required by the schema but is injected at seed time in
// src/script/seed.js (mapped to the actual active store), not hardcoded here.
const POST = {
  TAILLE_VETEMENT: "64e100000000000000000001",
  RENTREE_2026: "64e100000000000000000002",
  CHAUSSURES_CUIR: "64e100000000000000000003",
};

const postComments = [
  {
    _id: "64f100000000000000000001",
    postId: POST.TAILLE_VETEMENT,
    parentId: null,
    authorName: "Sophie Martin",
    authorEmail: "sophie.martin@example.com",
    content: "Merci pour ces conseils, éa m'a bien aidé pour ma dernière commande !",
    status: "approved",
  },
  {
    _id: "64f100000000000000000002",
    postId: POST.TAILLE_VETEMENT,
    parentId: "64f100000000000000000001",
    authorName: "L'équipe Sofiagen",
    authorEmail: "contact@sofiagen.com",
    content: "Avec plaisir Sophie, n'hésitez pas si vous avez d'autres questions !",
    status: "approved",
  },
  {
    _id: "64f100000000000000000003",
    postId: POST.TAILLE_VETEMENT,
    parentId: null,
    authorName: "Karim B.",
    authorEmail: "karim.b@example.com",
    content: "Est-ce que le guide des tailles est aussi valable pour les vétements enfants ?",
    status: "pending",
  },
  {
    _id: "64f100000000000000000004",
    postId: POST.RENTREE_2026,
    parentId: null,
    authorName: "Nadia T.",
    authorEmail: "nadia.t@example.com",
    content: "Super nouveautés, j'ai hôte de découvrir la nouvelle collection !",
    status: "approved",
  },
  {
    _id: "64f100000000000000000005",
    postId: POST.RENTREE_2026,
    parentId: null,
    authorName: "Yassine K.",
    authorEmail: "yassine.k@example.com",
    content: "Vous prévoyez une livraison plus rapide pour cette collection ?",
    status: "approved",
  },
  {
    _id: "64f100000000000000000006",
    postId: POST.RENTREE_2026,
    parentId: null,
    authorName: "visiteur",
    authorEmail: "spam@example.com",
    content: "Achetez des followers pas chers sur mon-site-douteux.com",
    status: "spam",
  },
  {
    _id: "64f100000000000000000007",
    postId: POST.CHAUSSURES_CUIR,
    parentId: null,
    authorName: "Amine R.",
    authorEmail: "amine.r@example.com",
    content: "Ces astuces fonctionnent vraiment bien, mes chaussures ont retrouvé leur éclat !",
    status: "approved",
  },
];

module.exports = postComments;
