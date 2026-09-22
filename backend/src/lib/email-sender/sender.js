const rateLimit = require("express-rate-limit");
const logger = require("../../config/logger");
const EmailService = require("../../service/email/EmailService");

// Deprecated shims kept for backward compatibility  every real call site
// still imports sendMail/sendEmail by these names. Both now go through
// EmailService.send instead of building their own nodemailer transport (see
// MAIL-01). No verify() here either: EmailService only verifies at boot.

// Same transport as sendEmail, but detached from the HTTP response: it resolves
// or rejects, and the caller decides what to do. Use it when the mail is a side
// effect of a request that already has its own response to send (creating a
// customer, for instance) instead of being the whole point of the request.
const sendMail = async (body) => {
  return EmailService.send(body);
};

const sendEmail = (body, res, message) => {
  EmailService.send(body)
    .then(() => {
      res.send({ message });
    })
    .catch((err) => {
      logger.error("Error sending email:", err);
      res.status(403).send({
        message: `Error sending email: ${err.message}`,
      });
    });
};
//limit email verification and forget password
const minutes = 30;
const emailVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const passwordVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const supportMessageLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const phoneVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 2,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

module.exports = {
  sendEmail,
  sendMail,
  emailVerificationLimit,
  passwordVerificationLimit,
  supportMessageLimit,
  phoneVerificationLimit,
};
