const winston = require("winston");
const { SPLAT } = require("triple-beam");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "HH:mm:ss DD MMM YYYY",
    }),
    winston.format.colorize(),
    winston.format.printf((info) => {
      const { timestamp, level, message } = info;
      const extras = info[SPLAT] || [];
      const extraText = extras
        .map((extra) => (extra instanceof Error ? extra.stack || extra.message : extra))
        .join(" ");
      return `[${timestamp}] ${level}: ${message}${extraText ? " " + extraText : ""}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    // new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

module.exports = logger;
