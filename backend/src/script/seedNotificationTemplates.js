const NotificationTemplate = require("../models/NotificationTemplate");
const { EVENT_CONFIG } = require("../service/NotificationEventHandler");
const AuditService = require("../service/AuditService");

const TEMPLATE_CONTENT = {
  "store.created": {
    name: "New store",
    title: { fr: "Nouveau store", en: "New store", ar: "E*,1 ,/J/" },
    message: {
      fr: "Le store {{storeName}} a t créé.",
      en: "Store {{storeName}} has been created.",
      ar: "*E %F4'! 'DE*,1 {{storeName}}.",
    },
    variables: ["storeName"],
    channels: { in_app: true, email: true, push: false },
  },
  "store.updated": {
    name: "Store updated",
    title: { fr: "Store mis à jour", en: "Store updated", ar: "*E *-/J+ 'DE*,1" },
    message: {
      fr: "Le store {{storeName}} a t mis à jour.",
      en: "Store {{storeName}} has been updated.",
      ar: "*E *-/J+ 'DE*,1 {{storeName}}.",
    },
    variables: ["storeName"],
    channels: { in_app: true, email: false, push: false },
  },
  "store.suspended": {
    name: "Store suspended",
    title: { fr: "Store suspendu", en: "Store suspended", ar: "*E *9DJB 'DE*,1" },
    message: {
      fr: "Le store {{storeName}} a t suspendu.",
      en: "Store {{storeName}} has been suspended.",
      ar: "*E *9DJB 'DE*,1 {{storeName}}.",
    },
    variables: ["storeName"],
    channels: { in_app: true, email: true, push: false },
  },
  "store.activated": {
    name: "Store activated",
    title: { fr: "Store activé", en: "Store activated", ar: "*E *A9JD 'DE*,1" },
    message: {
      fr: "Le store {{storeName}} a t réactivé.",
      en: "Store {{storeName}} has been activated.",
      ar: "*E *A9JD 'DE*,1 {{storeName}}.",
    },
    variables: ["storeName"],
    channels: { in_app: true, email: false, push: false },
  },
  "store.deleted": {
    name: "Store deleted",
    title: { fr: "Store supprimé", en: "Store deleted", ar: "*E -0A 'DE*,1" },
    message: {
      fr: "Le store {{storeName}} a t supprimé.",
      en: "Store {{storeName}} has been deleted.",
      ar: "*E -0A 'DE*,1 {{storeName}}.",
    },
    variables: ["storeName"],
    channels: { in_app: true, email: true, push: false },
  },

  "user.created": {
    name: "New user",
    title: { fr: "Nouvel utilisateur", en: "New user", ar: "E3*./E ,/J/" },
    message: {
      fr: "{{userName}} a rejoint l'équipe.",
      en: "{{userName}} joined the team.",
      ar: "'F6E {{userName}} %DI 'DA1JB.",
    },
    variables: ["userName"],
    channels: { in_app: true, email: false, push: false },
  },
  "user.invited": {
    name: "User invited",
    title: { fr: "Invitation envoyé", en: "User invited", ar: "*E* /9H) E3*./E" },
    message: {
      fr: "{{userName}} a t invité(e).",
      en: "{{userName}} was invited.",
      ar: "*E* /9H) {{userName}}.",
    },
    variables: ["userName"],
    channels: { in_app: true, email: false, push: false },
  },
  "user.updated": {
    name: "User updated",
    title: { fr: "Utilisateur mis à jour", en: "User updated", ar: "*E *-/J+ 'DE3*./E" },
    message: {
      fr: "Le profil de {{userName}} a t mis à jour.",
      en: "{{userName}}'s profile was updated.",
      ar: "*E *-/J+ EDA {{userName}}.",
    },
    variables: ["userName"],
    channels: { in_app: true, email: false, push: false },
  },
  "user.password_changed": {
    name: "Password changed",
    title: { fr: "Mot de passe modifié", en: "Password changed", ar: "*E *:JJ1 CDE) 'DE1H1" },
    message: {
      fr: "Votre mot de passe a t modifié.",
      en: "Your password was changed.",
      ar: "*E *:JJ1 CDE) 'DE1H1 'D.'5) (C.",
    },
    variables: [],
    channels: { in_app: true, email: true, push: false },
  },

  "order.created": {
    name: "New order",
    title: { fr: "Nouvelle commande", en: "New order", ar: "7D( ,/J/" },
    message: {
      fr: "La commande {{orderNumber}} a t créé ({{total}}).",
      en: "Order {{orderNumber}} has been created ({{total}}).",
      ar: "*E %F4'! 'D7D( {{orderNumber}} ({{total}}).",
    },
    variables: ["orderNumber", "customerName", "total"],
    channels: { in_app: true, email: true, push: false },
  },
  "order.updated": {
    name: "Order updated",
    title: { fr: "Commande mise  jour", en: "Order updated", ar: "*E *-/J+ 'D7D(" },
    message: {
      fr: "La commande {{orderNumber}} a t mise  jour.",
      en: "Order {{orderNumber}} has been updated.",
      ar: "*E *-/J+ 'D7D( {{orderNumber}}.",
    },
    variables: ["orderNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "order.cancelled": {
    name: "Order cancelled",
    title: { fr: "Commande annulée", en: "Order cancelled", ar: "*E %D:'! 'D7D(" },
    message: {
      fr: "La commande {{orderNumber}} a t annulée.",
      en: "Order {{orderNumber}} has been cancelled.",
      ar: "*E %D:'! 'D7D( {{orderNumber}}.",
    },
    variables: ["orderNumber"],
    channels: { in_app: true, email: true, push: false },
  },
  "order.completed": {
    name: "Order completed",
    title: { fr: "Commande terminé", en: "Order completed", ar: "'C*ED 'D7D(" },
    message: {
      fr: "La commande {{orderNumber}} a t livré/terminé.",
      en: "Order {{orderNumber}} has been completed.",
      ar: "'C*ED 'D7D( {{orderNumber}}.",
    },
    variables: ["orderNumber"],
    channels: { in_app: true, email: false, push: false },
  },

  "payment.created": {
    name: "Payment created",
    title: { fr: "Paiement initié", en: "Payment created", ar: "*E %F4'! /A9)" },
    message: {
      fr: "Un paiement de {{paymentAmount}} a t initié.",
      en: "A payment of {{paymentAmount}} was created.",
      ar: "*E %F4'! /A9) (BJE) {{paymentAmount}}.",
    },
    variables: ["paymentAmount"],
    channels: { in_app: true, email: false, push: false },
  },
  "payment.paid": {
    name: "Payment received",
    title: { fr: "Paiement reçu", en: "Payment received", ar: "*E '3*D'E 'D/A9)" },
    message: {
      fr: "Un paiement de {{paymentAmount}} a t reçu.",
      en: "A payment of {{paymentAmount}} was received.",
      ar: "*E '3*D'E /A9) (BJE) {{paymentAmount}}.",
    },
    variables: ["paymentAmount"],
    channels: { in_app: true, email: true, push: false },
  },
  "payment.failed": {
    name: "Payment failed",
    title: { fr: "échec du paiement", en: "Payment failed", ar: "A4D* 9EDJ) 'D/A9" },
    message: {
      fr: "Le paiement de {{paymentAmount}} a échoué.",
      en: "The payment of {{paymentAmount}} failed.",
      ar: "A4D* 9EDJ) 'D/A9 (BJE) {{paymentAmount}}.",
    },
    variables: ["paymentAmount"],
    channels: { in_app: true, email: true, push: false },
  },
  "payment.refunded": {
    name: "Payment refunded",
    title: { fr: "Paiement remboursé", en: "Payment refunded", ar: "*E '3*1/'/ 'D/A9)" },
    message: {
      fr: "Un remboursement de {{paymentAmount}} a t effectué.",
      en: "A refund of {{paymentAmount}} was issued.",
      ar: "*E '3*1/'/ E(D: {{paymentAmount}}.",
    },
    variables: ["paymentAmount"],
    channels: { in_app: true, email: true, push: false },
  },

  "subscription.created": {
    name: "Subscription created",
    title: { fr: "Abonnement créé", en: "Subscription created", ar: "*E %F4'! 'D'4*1'C" },
    message: {
      fr: "Votre abonnement au plan {{planName}} a t créé.",
      en: "Your {{planName}} subscription has been created.",
      ar: "*E %F4'! '4*1'CC AJ .7) {{planName}}.",
    },
    variables: ["planName"],
    channels: { in_app: true, email: true, push: false },
  },
  "subscription.renewed": {
    name: "Subscription renewed",
    title: { fr: "Abonnement renouvelé", en: "Subscription renewed", ar: "*E *,/J/ 'D'4*1'C" },
    message: {
      fr: "Votre abonnement {{planName}} a t renouvelé.",
      en: "Your {{planName}} subscription was renewed.",
      ar: "*E *,/J/ '4*1'CC {{planName}}.",
    },
    variables: ["planName"],
    channels: { in_app: true, email: false, push: false },
  },
  "subscription.expiring": {
    name: "Subscription expiring soon",
    title: { fr: "Abonnement bientît expiré", en: "Subscription expiring soon", ar: "'D'4*1'C 9DI H4C 'D'F*G'!" },
    message: {
      fr: "Votre abonnement {{planName}} expire le {{expiresAt}}.",
      en: "Your {{planName}} subscription expires on {{expiresAt}}.",
      ar: "JF*GJ '4*1'CC {{planName}} AJ {{expiresAt}}.",
    },
    variables: ["planName", "expiresAt"],
    channels: { in_app: true, email: true, push: false },
  },
  "subscription.expired": {
    name: "Subscription expired",
    title: { fr: "Abonnement expiré", en: "Subscription expired", ar: "'F*GI 'D'4*1'C" },
    message: {
      fr: "Votre abonnement {{planName}} a expiré.",
      en: "Your {{planName}} subscription has expired.",
      ar: "'F*GI '4*1'CC {{planName}}.",
    },
    variables: ["planName"],
    channels: { in_app: true, email: true, push: false },
  },
  "subscription.cancelled": {
    name: "Subscription cancelled",
    title: { fr: "Abonnement annulé", en: "Subscription cancelled", ar: "*E %D:'! 'D'4*1'C" },
    message: {
      fr: "Votre abonnement {{planName}} a t annulé.",
      en: "Your {{planName}} subscription was cancelled.",
      ar: "*E %D:'! '4*1'CC {{planName}}.",
    },
    variables: ["planName"],
    channels: { in_app: true, email: true, push: false },
  },

  "invoice.created": {
    name: "New invoice",
    title: { fr: "Nouvelle facture", en: "New invoice", ar: "A'*H1) ,/J/)" },
    message: {
      fr: "La facture {{invoiceNumber}} a t créé.",
      en: "Invoice {{invoiceNumber}} has been created.",
      ar: "*E %F4'! 'DA'*H1) {{invoiceNumber}}.",
    },
    variables: ["invoiceNumber"],
    channels: { in_app: true, email: true, push: false },
  },
  "invoice.paid": {
    name: "Invoice paid",
    title: { fr: "Facture payé", en: "Invoice paid", ar: "*E /A9 'DA'*H1)" },
    message: {
      fr: "La facture {{invoiceNumber}} a t payé.",
      en: "Invoice {{invoiceNumber}} has been paid.",
      ar: "*E /A9 'DA'*H1) {{invoiceNumber}}.",
    },
    variables: ["invoiceNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "invoice.overdue": {
    name: "Invoice overdue",
    title: { fr: "Facture en retard", en: "Invoice overdue", ar: "A'*H1) E*#.1)" },
    message: {
      fr: "La facture {{invoiceNumber}} est en retard de paiement.",
      en: "Invoice {{invoiceNumber}} is overdue.",
      ar: "'DA'*H1) {{invoiceNumber}} E*#.1) 9F 'D/A9.",
    },
    variables: ["invoiceNumber"],
    channels: { in_app: true, email: true, push: false },
  },

  "product.created": {
    name: "Product created",
    title: { fr: "Produit créé", en: "Product created", ar: "*E %F4'! EF*," },
    message: {
      fr: "Le produit {{productName}} a t créé.",
      en: "Product {{productName}} has been created.",
      ar: "*E %F4'! 'DEF*, {{productName}}.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },
  "product.updated": {
    name: "Product updated",
    title: { fr: "Produit mis à jour", en: "Product updated", ar: "*E *-/J+ 'DEF*," },
    message: {
      fr: "Le produit {{productName}} a t mis à jour.",
      en: "Product {{productName}} has been updated.",
      ar: "*E *-/J+ 'DEF*, {{productName}}.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },
  "product.low_stock": {
    name: "Low stock",
    title: { fr: "Stock faible", en: "Low stock", ar: "'DE.2HF EF.A6" },
    message: {
      fr: "Le produit {{productName}} a un stock faible ({{quantity}} restant).",
      en: "Product {{productName}} is low on stock ({{quantity}} left).",
      ar: "'DEF*, {{productName}} E.2HFG EF.A6 ({{quantity}} E*(BM).",
    },
    variables: ["productName", "quantity"],
    channels: { in_app: true, email: false, push: false },
  },
  "product.out_of_stock": {
    name: "Out of stock",
    title: { fr: "Rupture de stock", en: "Out of stock", ar: "FA'/ 'DE.2HF" },
    message: {
      fr: "Le produit {{productName}} est en rupture de stock.",
      en: "Product {{productName}} is out of stock.",
      ar: "'DEF*, {{productName}} FA/ EF 'DE.2HF.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: true, push: false },
  },

  "customer.created": {
    name: "New customer",
    title: { fr: "Nouveau client", en: "New customer", ar: "9EJD ,/J/" },
    message: {
      fr: "{{customerName}} vient de crér un compte.",
      en: "{{customerName}} just created an account.",
      ar: "B'E {{customerName}} (%F4'! -3'(.",
    },
    variables: ["customerName"],
    channels: { in_app: true, email: false, push: false },
  },
  "customer.updated": {
    name: "Customer updated",
    title: { fr: "Client mis à jour", en: "Customer updated", ar: "*E *-/J+ 'D9EJD" },
    message: {
      fr: "Le profil de {{customerName}} a t mis à jour.",
      en: "{{customerName}}'s profile was updated.",
      ar: "*E *-/J+ EDA {{customerName}}.",
    },
    variables: ["customerName"],
    channels: { in_app: true, email: false, push: false },
  },

  "customer.order_confirmed": {
    name: "Order confirmed (customer)",
    title: { fr: "Commande confirmé", en: "Order confirmed", ar: "*E *#CJ/ 'D7D(" },
    message: {
      fr: "Merci ! Votre commande {{orderNumber}} a bien t reçue ({{total}}).",
      en: "Thank you! Your order {{orderNumber}} has been received ({{total}}).",
      ar: "4C1K' DC! *E '3*D'E 7D(C {{orderNumber}} ({{total}}).",
    },
    variables: ["orderNumber", "total"],
    channels: { in_app: true, email: true, push: false },
  },
  "customer.order_status_updated": {
    name: "Order status updated (customer)",
    title: { fr: "Mise  jour de votre commande", en: "Your order was updated", ar: "*-/J+ -'D) 7D(C" },
    message: {
      fr: "Votre commande {{orderNumber}} est maintenant : {{status}}.",
      en: "Your order {{orderNumber}} is now: {{status}}.",
      ar: "7D(C {{orderNumber}} #5(- 'D"F: {{status}}.",
    },
    variables: ["orderNumber", "status"],
    channels: { in_app: true, email: true, push: false },
  },
  "customer.review_approved": {
    name: "Your review was approved (customer)",
    title: { fr: "Votre avis a t approuvé", en: "Your review was approved", ar: "*E* 'DEH'AB) 9DI *BJJEC" },
    message: {
      fr: "Votre avis sur {{productName}} a t approuvé et est maintenant visible.",
      en: "Your review on {{productName}} was approved and is now visible.",
      ar: "*E* 'DEH'AB) 9DI *BJJEC -HD {{productName}} H#5(- E1&JK' 'D"F.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },

  "review.created": {
    name: "New review",
    title: { fr: "Nouvel avis", en: "New review", ar: "*BJJE ,/J/" },
    message: {
      fr: "Un nouvel avis a t laissé sur {{productName}}.",
      en: "A new review was left on {{productName}}.",
      ar: "*E *1C *BJJE ,/J/ 9DI {{productName}}.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },
  "review.approved": {
    name: "Review approved",
    title: { fr: "Avis approuvé", en: "Review approved", ar: "*E* 'DEH'AB) 9DI 'D*BJJE" },
    message: {
      fr: "L'avis sur {{productName}} a t approuvé.",
      en: "The review on {{productName}} was approved.",
      ar: "*E* 'DEH'AB) 9DI *BJJE {{productName}}.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },
  "review.rejected": {
    name: "Review rejected",
    title: { fr: "Avis rejeté", en: "Review rejected", ar: "*E 1A6 'D*BJJE" },
    message: {
      fr: "L'avis sur {{productName}} a t rejeté.",
      en: "The review on {{productName}} was rejected.",
      ar: "*E 1A6 *BJJE {{productName}}.",
    },
    variables: ["productName"],
    channels: { in_app: true, email: false, push: false },
  },

  "ticket.created": {
    name: "New support ticket",
    title: { fr: "Nouveau ticket", en: "New ticket", ar: "*0C1) ,/J/)" },
    message: {
      fr: "Le ticket {{ticketNumber}} a t créé.",
      en: "Ticket {{ticketNumber}} has been created.",
      ar: "*E %F4'! 'D*0C1) {{ticketNumber}}.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "ticket.updated": {
    name: "Ticket updated",
    title: { fr: "Ticket mis à jour", en: "Ticket updated", ar: "*E *-/J+ 'D*0C1)" },
    message: {
      fr: "Le ticket {{ticketNumber}} a t mis à jour.",
      en: "Ticket {{ticketNumber}} has been updated.",
      ar: "*E *-/J+ 'D*0C1) {{ticketNumber}}.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "ticket.assigned": {
    name: "Ticket assigned",
    title: { fr: "Ticket assigné", en: "Ticket assigned", ar: "*E *9JJF 'D*0C1)" },
    message: {
      fr: "Le ticket {{ticketNumber}} vous a t assigné.",
      en: "Ticket {{ticketNumber}} was assigned to you.",
      ar: "*E *9JJF 'D*0C1) {{ticketNumber}} DC.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "ticket.agent_replied": {
    name: "Agent replied (customer)",
    title: { fr: "Nouvelle réponse à votre ticket", en: "New reply on your ticket", ar: "1/ ,/J/ 9DI *0C1*C" },
    message: {
      fr: "Vous avez reçu une réponse sur le ticket {{ticketNumber}}.",
      en: "You received a reply on ticket {{ticketNumber}}.",
      ar: "DB/ *DBJ* 1/K' 9DI 'D*0C1) {{ticketNumber}}.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: true, push: false },
  },
  "ticket.customer_replied": {
    name: "Customer replied",
    title: { fr: "Réponse du client", en: "Customer replied", ar: "1/ 'D9EJD" },
    message: {
      fr: "Le client a répondu sur le ticket {{ticketNumber}}.",
      en: "The customer replied on ticket {{ticketNumber}}.",
      ar: "1/ 'D9EJD 9DI 'D*0C1) {{ticketNumber}}.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: false, push: false },
  },
  "ticket.status_changed": {
    name: "Ticket status changed (customer)",
    title: { fr: "Votre ticket a t mis à jour", en: "Your ticket was updated", ar: "*E *-/J+ *0C1*C" },
    message: {
      fr: "Le statut de votre ticket {{ticketNumber}} est maintenant : {{status}}.",
      en: "Your ticket {{ticketNumber}} is now: {{status}}.",
      ar: "*0C1*C {{ticketNumber}} #5(-* 'D"F: {{status}}.",
    },
    variables: ["ticketNumber", "status"],
    channels: { in_app: true, email: true, push: false },
  },
  "ticket.sla_warning": {
    name: "SLA warning",
    title: { fr: "SLA bientît dépassé", en: "SLA warning", ar: "*-0J1 '*A'BJ) E3*HI 'D./E)" },
    message: {
      fr: "Le ticket {{ticketNumber}} approche de sa deadline de résolution (moins de 2h restantes).",
      en: "Ticket {{ticketNumber}} is approaching its resolution deadline (under 2h left).",
      ar: "'D*0C1) {{ticketNumber}} *B*1( EF 'DEH9/ 'DFG'&J DD-D (#BD EF 3'9*JF E*(BJ)).",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: true, push: false },
  },
  "ticket.sla_overdue": {
    name: "SLA overdue",
    title: { fr: "SLA dépassé", en: "SLA overdue", ar: "*E *,'H2 '*A'BJ) E3*HI 'D./E)" },
    message: {
      fr: "Le ticket {{ticketNumber}} a dépassé sa deadline de résolution.",
      en: "Ticket {{ticketNumber}} has passed its resolution deadline.",
      ar: "*,'H2* 'D*0C1) {{ticketNumber}} 'DEH9/ 'DFG'&J DD-D.",
    },
    variables: ["ticketNumber"],
    channels: { in_app: true, email: true, push: false },
  },

  "security.login": {
    name: "Login",
    title: { fr: "Connexion", en: "Login", ar: "*3,JD 'D/.HD" },
    message: {
      fr: "Une connexion a t détecté sur votre compte.",
      en: "A login was detected on your account.",
      ar: "*E 15/ *3,JD /.HD 9DI -3'(C.",
    },
    variables: [],
    channels: { in_app: true, email: false, push: false },
  },
  "security.new_login": {
    name: "New login",
    title: { fr: "Nouvelle connexion", en: "New login", ar: "*3,JD /.HD ,/J/" },
    message: {
      fr: "Nouvelle connexion depuis {{ipAddress}}.",
      en: "New login from {{ipAddress}}.",
      ar: "*3,JD /.HD ,/J/ EF {{ipAddress}}.",
    },
    variables: ["ipAddress"],
    channels: { in_app: true, email: true, push: false },
  },
  "security.failed_login": {
    name: "Failed login attempt",
    title: { fr: "Tentative de connexion échoué", en: "Failed login attempt", ar: "E-'HD) *3,JD /.HD A'4D)" },
    message: {
      fr: "Une tentative de connexion a échoué sur votre compte.",
      en: "A failed login attempt was made on your account.",
      ar: "A4D* E-'HD) *3,JD /.HD 9DI -3'(C.",
    },
    variables: [],
    channels: { in_app: true, email: true, push: false },
  },
  "security.password_changed": {
    name: "Password changed",
    title: { fr: "Mot de passe modifié", en: "Password changed", ar: "*E *:JJ1 CDE) 'DE1H1" },
    message: {
      fr: "Le mot de passe de votre compte a t modifié.",
      en: "Your account password was changed.",
      ar: "*E *:JJ1 CDE) E1H1 -3'(C.",
    },
    variables: [],
    channels: { in_app: true, email: true, push: false },
  },
  "security.new_device": {
    name: "New device",
    title: { fr: "Nouvel appareil", en: "New device", ar: ",G'2 ,/J/" },
    message: {
      fr: "Un nouvel appareil s'est connecté à votre compte.",
      en: "A new device signed in to your account.",
      ar: "B'E ,G'2 ,/J/ (*3,JD 'D/.HD %DI -3'(C.",
    },
    variables: [],
    channels: { in_app: true, email: true, push: false },
  },
  "security.alert": {
    name: "Security alert",
    title: { fr: "Alerte sécurité", en: "Security alert", ar: "*F(JG #EFJ" },
    message: {
      fr: "Une alerte de sécurité nécessite votre attention : {{details}}",
      en: "A security alert needs your attention: {{details}}",
      ar: "*F(JG #EFJ J*7D( 'F*('GC: {{details}}",
    },
    variables: ["details"],
    channels: { in_app: true, email: true, push: false },
  },

  "system.error": {
    name: "System error",
    title: { fr: "Erreur système", en: "System error", ar: ".7# AJ 'DF8'E" },
    message: {
      fr: "Une erreur système s'est produite : {{details}}",
      en: "A system error occurred: {{details}}",
      ar: "-/+ .7# AJ 'DF8'E: {{details}}",
    },
    variables: ["details"],
    channels: { in_app: true, email: true, push: false },
  },
  "invoice.reminder": {
    name: "Invoice payment reminder",
    title: { fr: "Rappel de paiement", en: "Payment reminder", ar: "*0CJ1 ('D/A9" },
    message: {
      fr: "La facture {{invoiceNumber}} d'un montant de {{amount}} arrive  échéance le {{dueDate}}.",
      en: "Invoice {{invoiceNumber}} of {{amount}} is due on {{dueDate}}.",
      ar: "'DA'*H1) {{invoiceNumber}} (E(D: {{amount}} *3*-B AJ {{dueDate}}.",
    },
    variables: ["invoiceNumber", "amount", "dueDate"],
    channels: { in_app: true, email: true, push: false },
  },
  "wallet.low_balance": {
    name: "Wallet low balance",
    title: { fr: "Solde du portefeuille faible", en: "Wallet balance low", ar: "15J/ 'DE-A8) EF.A6" },
    message: {
      fr: "Le solde de votre portefeuille est de {{currentBalance}}. Rechargez pour éviter toute interruption.",
      en: "Your wallet balance is {{currentBalance}}. Top up to avoid service interruption.",
      ar: "15J/ E-A8*C GH {{currentBalance}}. #9/ 'D*9(&) D*,F( 'FB7'9 'D./E).",
    },
    variables: ["currentBalance"],
    channels: { in_app: true, email: true, push: false },
  },
  "promotion.offer": {
    name: "Promotion offer",
    title: { fr: "Nouvelle offre disponible", en: "New offer available", ar: "916 ,/J/ E*'-" },
    message: {
      fr: "{{promotionName}} : profitez de {{discount}} jusqu'au {{validUntil}}.",
      en: "{{promotionName}}: enjoy {{discount}} until {{validUntil}}.",
      ar: "{{promotionName}}: '3*A/ EF {{discount}} -*I {{validUntil}}.",
    },
    variables: ["promotionName", "discount", "validUntil"],
    channels: { in_app: true, email: false, push: false },
  },
};

const DIRECT_ONLY_EVENTS = {
  "customer.order_confirmed": { category: "orders", priority: "normal" },
  "customer.order_status_updated": { category: "orders", priority: "normal" },
  "customer.review_approved": { category: "reviews", priority: "low" },
};

const seedNotificationTemplates = async () => {
  const templates = [];
  const allConfigs = { ...EVENT_CONFIG, ...DIRECT_ONLY_EVENTS };
  for (const code of Object.keys(allConfigs)) {
    const content = TEMPLATE_CONTENT[code];
    if (!content) continue; // every declared event must have content above
    templates.push({
      code,
      name: content.name,
      category: allConfigs[code].category,
      priority: allConfigs[code].priority,
      enabled: true,
      channels: content.channels,
      title: content.title,
      message: content.message,
      variables: content.variables,
    });
  }

  for (const tpl of templates) {
    await NotificationTemplate.findOneAndUpdate({ code: tpl.code }, tpl, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  await AuditService.logAction({
    actorType: "system",
    module: "NotificationTemplate",
    action: "seed",
    entityType: "NotificationTemplate",
    status: "success",
    severity: "low",
    newValue: { count: templates.length },
  }).catch(() => {});

  return NotificationTemplate.find();
};

module.exports = seedNotificationTemplates;
module.exports.TEMPLATE_CONTENT = TEMPLATE_CONTENT;

if (require.main === module) {
  require("dotenv").config();
  const mongoose = require("mongoose");

  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const templates = await seedNotificationTemplates();
      console.log(` ${templates.length} notification templates créés/mis à jour`);
      process.exit(0);
    } catch (error) {
      console.error("L Erreur seed notification templates:", error.message);
      process.exit(1);
    }
  })();
}
