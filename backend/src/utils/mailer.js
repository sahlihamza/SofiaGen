const EmailService = require("../service/email/EmailService");

// Thin, backward-compatible wrappers around EmailService.send  every real
// call site in the codebase already imports these by name, so the shapes
// stay the same; only the transport underneath changed (see MAIL-01).
const sendEmail = async ({ to, from, cc, bcc, subject, text, html, type, storeId, channel }) => {
  try {
    return await EmailService.send({ to, from, cc, bcc, subject, text, html, type, storeId, channel });
  } catch (error) {
    console.error("L Erreur envoi email:", error.message);
    throw error;
  }
};

const sendPasswordResetEmail = async (to, resetUrl) => {
  return sendEmail({
    to,
    type: "password_reset",
    subject: "Réinitialisation de votre mot de passe - SofiaGen",
    text: `Vous avez demandé une réinitialisation de mot de passe. Cliquez sur ce lien (valide 1h) : ${resetUrl}\n\nSi vous n'êtes pas  l'origine de cette demande, ignorez cet email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color:#1f2937;">Réinitialisation de mot de passe</h2>
        <p style="color:#374151;">Vous avez demandé une réinitialisation de votre mot de passe SofiaGen.</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${resetUrl}"
             style="display:inline-block; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color:#6b7280; font-size:13px;">Ce lien expire dans 1 heure. Si vous n'êtes pas  l'origine de cette demande, ignorez simplement cet email.</p>
      </div>
    `,
  });
};

const sendStaffWelcomeEmail = async (to, { name, password, loginUrl }) => {
  return sendEmail({
    to,
    type: "staff_welcome",
    subject: "Votre compte SofiaGen a t créé",
    text: `Bonjour ${name},\n\nUn compte SofiaGen a t créé pour vous.\n\nEmail : ${to}\nMot de passe provisoire : ${password}\n\nConnectez-vous ici : ${loginUrl}\n\nPour des raisons de sécurité, modifiez ce mot de passe depuis votre profil dés votre première connexion.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color:#1f2937;">Bienvenue sur SofiaGen</h2>
        <p style="color:#374151;">Bonjour ${name}, un compte vient d'être créé pour vous.</p>
        <table style="margin: 20px 0; color:#374151; font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;"><strong>Email</strong></td><td>${to}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Mot de passe</strong></td><td style="font-family:monospace;">${password}</td></tr>
        </table>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${loginUrl}"
             style="display:inline-block; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Se connecter
          </a>
        </p>
        <p style="color:#6b7280; font-size:13px;">Pour des raisons de sécurité, modifiez ce mot de passe depuis votre profil dés votre première connexion.</p>
      </div>
    `,
  });
};

const sendSupportTicketConfirmationEmail = async (to, { ticketNumber, subject }) => {
  return sendEmail({
    to,
    subject: `Ticket de support créé : ${ticketNumber} - SofiaGen`,
    text: `Votre ticket de support a bien t créé.\n\nNuméro de ticket : ${ticketNumber}\nSujet : ${subject}\n\nNotre équipe support reviendra vers vous rapidement.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color:#1f2937;">Ticket de support créé</h2>
        <p style="color:#374151;">Votre demande a bien t enregistrée. Notre équipe support reviendra vers vous rapidement.</p>
        <table style="margin: 20px 0; color:#374151; font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;"><strong>Numéro de ticket</strong></td><td>${ticketNumber}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Sujet</strong></td><td>${subject}</td></tr>
        </table>
        <p style="color:#6b7280; font-size:13px;">Conservez ce numéro de ticket pour suivre l'avancement de votre demande.</p>
      </div>
    `,
  });
};

// Was referenced by InvitationService.js and UserManagementService.js
// (`require("../utils/mailer").sendInvitationEmail`) but never actually
// existed here  every one of those call sites threw "sendEmailFn is not a
// function" whenever it ran. Added for real as part of MAIL-01.
const sendInvitationEmail = async (to, name, invitationUrl) => {
  return sendEmail({
    to,
    type: "invitation",
    subject: "Invitation  rejoindre SofiaGen",
    text: `Bonjour ${name},\n\nVous avez t invité(e)  rejoindre SofiaGen.\n\nAcceptez l'invitation ici : ${invitationUrl}\n\nCe lien expire prochainement.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color:#1f2937;">Vous êtes invité(e) sur SofiaGen</h2>
        <p style="color:#374151;">Bonjour ${name}, vous avez t invité(e)  rejoindre SofiaGen.</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${invitationUrl}"
             style="display:inline-block; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Accepter l'invitation
          </a>
        </p>
        <p style="color:#6b7280; font-size:13px;">Ce lien d'invitation expire prochainement.</p>
      </div>
    `,
  });
};

// Same bug as sendInvitationEmail above: storeRoute.js's manual "add store"
// flow (POST /api/stores) has called this by name since it was written, but
// it never existed here  every store creation with a brand-new owner
// (ownerResult.createdOwner) threw "sendStoreOwnerInvitationEmail is not a
// function" right after the store was actually created. Added for real as
// part of MAIL-01.
const sendStoreOwnerInvitationEmail = async ({ to, storeName, ownerName, password, loginUrl }) => {
  return sendEmail({
    to,
    type: "staff_welcome",
    subject: `Votre boutique "${storeName}" a t créé sur SofiaGen`,
    text: `Bonjour ${ownerName},\n\nVotre boutique "${storeName}" a t créé sur SofiaGen et vous en êtes le propriétaire.\n\nEmail : ${to}\nMot de passe provisoire : ${password}\n\n${loginUrl ? `Connectez-vous ici : ${loginUrl}\n\n` : ""}Pour des raisons de sécurité, modifiez ce mot de passe depuis votre profil dés votre première connexion.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color:#1f2937;">Votre boutique SofiaGen a t créé</h2>
        <p style="color:#374151;">Bonjour ${ownerName}, votre boutique <strong>${storeName}</strong> a t créé et vous en êtes le propriétaire.</p>
        <table style="margin: 20px 0; color:#374151; font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;"><strong>Email</strong></td><td>${to}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Mot de passe</strong></td><td style="font-family:monospace;">${password}</td></tr>
        </table>
        ${
          loginUrl
            ? `<p style="text-align:center; margin: 24px 0;">
          <a href="${loginUrl}"
             style="display:inline-block; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Se connecter
          </a>
        </p>`
            : ""
        }
        <p style="color:#6b7280; font-size:13px;">Pour des raisons de sécurité, modifiez ce mot de passe depuis votre profil dés votre première connexion.</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendStaffWelcomeEmail,
  sendSupportTicketConfirmationEmail,
  sendInvitationEmail,
  sendStoreOwnerInvitationEmail,
};
