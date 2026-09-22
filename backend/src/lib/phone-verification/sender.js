// utils/sendVerificationCode.js

const twilio = require("twilio");
const logger = require("../../config/logger");

// Your Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const sendVerificationCode = async (phoneNumber, verificationCode) => {
  try {
    const message = await client.messages.create({
      body: `Your verification code is: ${verificationCode}`,
      from: "+15025571497",
      to: phoneNumber,
    });
    return true;
  } catch (error) {
    logger.error("Error sending verification code:", error);
    return false;
  }
};

module.exports = { sendVerificationCode };
