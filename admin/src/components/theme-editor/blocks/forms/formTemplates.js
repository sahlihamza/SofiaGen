/**
 * formTemplates  modèles de formulaires prédéfinis (Contact, Newsletter,
 * Devis, RSVP, Inscription, Demande de devis).
 *
 * Chaque template renvoie un objet `config` complet prét  être injecté dans
 * le data-config du block. L'admin peut ensuite personnaliser via les traits.
 */

const base = (overrides) => ({
  formId: `form-${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  subtitle: "",
  submitText: "Envoyer",
  layout: { columns: 1, labelPosition: "top" },
  messages: {
    success: "Merci, votre message a bien t envoyé.",
    successSub: "Nous vous répondrons dans les plus brefs délais.",
    error: "Veuillez corriger les erreurs ci-dessus.",
  },
  actions: { email: { enabled: true } },
  ...overrides,
});

const field = (id, type, label, extra = {}) => ({
  id, type, name: id, label, required: true, width: 1, ...extra,
});

export const FORM_TEMPLATES = [
  {
    id: "contact",
    label: "Contact",
    icon: "fa fa-envelope",
    build: () => base({
      title: "Contactez-nous",
      subtitle: "Une question ? écrivez-nous.",
      layout: { columns: 2, labelPosition: "top" },
      fields: [
        field("name", "text", "Nom complet", { placeholder: "Jean Dupont", required: true, width: 1 }),
        field("email", "email", "Email", { placeholder: "jean@exemple.com", required: true, width: 1 }),
        field("subject", "text", "Sujet", { width: 1 }),
        field("phone", "tel", "Téléphone", { required: false, width: 1 }),
        field("message", "textarea", "Message", { rows: 5, width: 2, maxLength: 1000 }),
      ],
    }),
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: "fa fa-newspaper",
    build: () => base({
      title: "Inscrivez-vous  la newsletter",
      submitText: "S'abonner",
      layout: { columns: 1, labelPosition: "hidden" },
      fields: [
        field("email", "email", "Email", { placeholder: "votre@email.com", required: true }),
      ],
      actions: { email: { enabled: false }, integrations: [{ type: "mailchimp", enabled: true, config: {} }] },
    }),
  },
  {
    id: "quote",
    label: "Demande de devis",
    icon: "fa fa-file-invoice",
    build: () => base({
      title: "Demande de devis",
      subtitle: "Décrivez votre projet, nous vous recontactons.",
      submitText: "Demander un devis",
      steps: [
        { title: "Vous", fields: [
          field("company", "text", "Sociét", { width: 1 }),
          field("name", "text", "Contact", { width: 1 }),
          field("email", "email", "Email", { width: 1 }),
          field("phone", "tel", "Téléphone", { required: false, width: 1 }),
        ]},
        { title: "Projet", fields: [
          field("service", "select", "Service", { width: 1, options: [
            { label: "Site web", value: "web" },
            { label: "E-commerce", value: "ecommerce" },
            { label: "Référencement", value: "seo" },
            { label: "Autre", value: "other" },
          ]}),
          field("budget", "select", "Budget", { width: 1, options: [
            { label: "< 5k", value: "5" }, { label: "5-15k", value: "15" },
            { label: "15-30k", value: "30" }, { label: "> 30k", value: "30+" },
          ]}),
          field("deadline", "datepicker", "échéance", { width: 1 }),
          field("details", "textarea", "Détails", { rows: 5, width: 2 }),
        ]},
      ],
    }),
  },
  {
    id: "rsvp",
    label: "RSVP / événement",
    icon: "fa fa-calendar-check",
    build: () => base({
      title: "Répondez  l'invitation",
      submitText: "Confirmer ma présence",
      fields: [
        field("name", "text", "Nom", { width: 1 }),
        field("email", "email", "Email", { width: 1 }),
        field("attending", "radio", "Présence ?", { width: 2, options: [
          { label: "Oui, je serai lé", value: "yes" },
          { label: "Non, désolé", value: "no" },
        ]}),
        field("guests", "number", "Nombre d'invités", { required: false, min: 0, max: 10, width: 1, condition: { field: "attending", op: "eq", value: "yes" } }),
        field("diet", "text", "Restrictions alimentaires", { required: false, width: 1, condition: { field: "attending", op: "eq", value: "yes" } }),
      ],
    }),
  },
  {
    id: "registration",
    label: "Inscription",
    icon: "fa fa-user-plus",
    build: () => base({
      title: "Créz votre compte",
      submitText: "S'inscrire",
      fields: [
        field("firstname", "text", "Prénom", { width: 1 }),
        field("lastname", "text", "Nom", { width: 1 }),
        field("email", "email", "Email", { width: 2 }),
        field("password", "password", "Mot de passe", { width: 1 }),
        field("confirm", "password", "Confirmer", { width: 1 }),
        field("terms", "toggle", "J'accepte les conditions", { width: 2, placeholder: "J'accepte les CGU" }),
      ],
    }),
  },
  {
    id: "blank",
    label: "Vide",
    icon: "fa fa-plus",
    build: () => base({ title: "Nouveau formulaire", fields: [] }),
  },
];

export const getTemplate = (id) => FORM_TEMPLATES.find((t) => t.id === id)?.build() || null;
