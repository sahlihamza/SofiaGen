const Order = require("../models/Order");
const orderItemService = require("./orderItemService");
const orderStatusHistoryService = require("./orderStatusHistoryService");
const paymentService = require("./paymentService");
const stockReservationService = require("./stockReservationService");
const cartService = require("./cartService");
const GalleryProduct = require("../models/GalleryProduct");
const logger = require("../config/logger");

// "Mes commandes" côté boutique. Tout part de la commande *et* du client
// authentifié : aucune méthode ici ne se contente d'un id de commande, sans
// quoi n'importe qui lirait la commande d'un autre.

class CustomerOrderError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Une commande n'est annulable que tant que la boutique ne l'a pas honoré.
const CANCELLABLE_STATUSES = ["Pending", "Processing"];

const findOwnedOrder = async (orderId, customer) => {
  if (!customer?._id) return null;

  // Le filtre porte le client : un id de commande valide mais étranger ne
  // remonte rien, exactement comme un id inexistant.
  return Order.findOne({ _id: orderId, user: customer._id });
};

// Ce que le client a le droit de faire sur cette commande, calculé côté
// serveur : le front n'affiche un bouton que si la réponse l'autorise.
const permissionsFor = (order, { itemCount }) => ({
  cancel: CANCELLABLE_STATUSES.includes(order.status),
  reorder: itemCount > 0,
  // Facture : l'envoi par e-mail existe déjà (POST /order/customer/invoice).
  invoice: !!order.invoice,
  // Pas encore de reçu de paiement ni de canal support côté API.
  receipt: false,
  support: false,
});

// L'image du produit ne vit pas sur la ligne de commande : elle est reprise du
// catalogue  l'affichage, en acceptant qu'un produit supprimé n'en ait plus.
const imagesForItems = async (items) => {
  const productIds = [...new Set(items.map((item) => String(item.productId)).filter(Boolean))];

  if (!productIds.length) return new Map();

  const gallery = await GalleryProduct.find({ product: { $in: productIds } }).sort({
    isPrimary: -1,
    order: 1,
  });

  const byProduct = new Map();
  for (const doc of gallery) {
    const key = String(doc.product);
    if (!byProduct.has(key)) byProduct.set(key, doc.image);
  }

  return byProduct;
};

/**
 * Le détail complet d'une commande du client : lignes, historique de statuts,
 * paiement et droits. Renvoie null si la commande n'existe pas ou n'est pas la
 * sienne  l'appelant répond 404 dans les deux cas, pour ne pas révéler
 * l'existence de la commande d'un autre.
 */
const getOrderDetail = async (orderId, customer) => {
  const order = await findOwnedOrder(orderId, customer);

  if (!order) return null;

  const [items, history, payments] = await Promise.all([
    orderItemService.getByOrderId(order._id),
    orderStatusHistoryService.getByOrderId(order._id),
    // Une commande peut porter plusieurs tentatives de paiement ; celle qui
    // fait foi est celle que la commande référence, sinon la plus récente.
    paymentService.getByOrderId(order._id),
  ]);

  const payment =
    payments.find((candidate) => String(candidate._id) === String(order.paymentId)) ||
    payments[0] ||
    null;

  const images = await imagesForItems(items);

  return {
    // La commande reste  plat : la page de confirmation existante
    // (store/src/pages/order/[id].js) consomme déjà cette réponse telle
    // quelle. Les sections du module "Mes commandes" s'ajoutent  côté.
    ...order.toJSON(),
    items: items.map((item) => ({
      _id: item._id,
      productId: item.productId,
      variationId: item.variationId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      tax: item.tax,
      total: item.total,
      image: images.get(String(item.productId)) || null,
    })),
    history: history.map((entry) => ({
      _id: entry._id,
      status: entry.status,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
    payment: payment
      ? {
          method: payment.method,
          status: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
          // transactionId n'est volontairement pas exposé au client.
        }
      : null,
    permissions: permissionsFor(order, { itemCount: items.length }),
  };
};

/**
 * Annule une commande  la demande du client. Le stock rûrervé au checkout est
 * rendu via les lignes de rûrervation  le même chemin que celui déjà emprunté
 * quand un paiement échoue, pour qu'une libération concurrente ne recrédite
 * jamais deux fois les mêmes unités.
 */
const cancelOrder = async (orderId, customer) => {
  const order = await findOwnedOrder(orderId, customer);

  if (!order) return null;

  if (order.status === "Cancel") {
    throw new CustomerOrderError(400, "ALREADY_CANCELLED", "Cette commande est déjà annulée.");
  }

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw new CustomerOrderError(
      400,
      "NOT_CANCELLABLE",
      "Cette commande est trop avancé pour être annulée. Contactez la boutique."
    );
  }

  order.status = "Cancel";

  // Un paiement déjà encaissé demande un remboursement, décidé par la
  // boutique : on ne touche qu'au paiement encore en attente.
  if (order.paymentStatus === "pending") {
    order.paymentStatus = "cancelled";
  }

  await order.save();

  await orderStatusHistoryService.record(order._id, "Cancel", {
    comment: "Annulée par le client",
  });

  await stockReservationService.releaseForOrder(order._id).catch((err) => {
    // L'annulation reste acquise même si la libération échoue : mieux vaut du
    // stock  rattraper qu'une commande bloqué.
    logger.error("Failed to release stock for cancelled order", err.message);
  });

  return getOrderDetail(orderId, customer);
};

/**
 * Remet les articles d'une commande passé dans le panier du client.
 *
 * Passe par cartService, donc chaque ligne subit les mêmes contrôles de
 * disponibilité, de stock et de prix qu'un ajout normal : ce qui n'est plus
 * commandable est signalé plutôt que d'échouer en bloc.
 */
const reorder = async (orderId, customer) => {
  const order = await findOwnedOrder(orderId, customer);

  if (!order) return null;

  const items = await orderItemService.getByOrderId(order._id);

  if (!items.length) {
    throw new CustomerOrderError(400, "ORDER_EMPTY", "Cette commande ne contient aucun article.");
  }

  if (!order.storeId) {
    throw new CustomerOrderError(
      400,
      "STORE_UNKNOWN",
      "Cette commande n'est rattaché  aucune boutique."
    );
  }

  const owner = cartService.resolveOwner({ storeId: order.storeId, customer });

  const unavailable = [];
  let added = 0;
  let cart = null;

  for (const item of items) {
    try {
      cart = await cartService.addItem(owner, {
        productId: item.productId,
        variationId: item.variationId || null,
        quantity: item.quantity,
      });
      added += 1;
    } catch (err) {
      unavailable.push({
        productName: item.productName,
        message: err.message,
      });
    }
  }

  if (!added) {
    throw new CustomerOrderError(
      400,
      "NOTHING_REORDERABLE",
      "Aucun article de cette commande n'est encore disponible."
    );
  }

  return {
    cart: cart || (await cartService.getCurrentCart(owner)),
    added,
    unavailable,
  };
};

module.exports = {
  CustomerOrderError,
  getOrderDetail,
  cancelOrder,
  reorder,
  CANCELLABLE_STATUSES,
};
