const crypto = require("crypto");
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

const PASSWORD_LENGTH = 14;

const pick = (charset) => charset[crypto.randomInt(charset.length)];

const generatePassword = () => {
  const chars = [pick(UPPERCASE), pick(LOWERCASE), pick(DIGITS), pick(SYMBOLS)];

  while (chars.length < PASSWORD_LENGTH) {
    chars.push(pick(ALL));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};

module.exports = { generatePassword };
