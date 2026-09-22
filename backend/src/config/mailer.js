// Deprecated: kept only for any stray `require("../config/mailer")` that
// expects a raw nodemailer transporter. All new code must go through
// service/email/EmailService.js instead  this now just forwards to the
// single transport factory rather than calling nodemailer.createTransport
// itself (see MAIL-01).
const { getPlatformTransport } = require("../service/email/EmailTransportFactory");

module.exports = getPlatformTransport();
