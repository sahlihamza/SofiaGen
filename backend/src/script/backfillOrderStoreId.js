require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const logger = require("../config/logger");
const Order = require("../models/Order");
const { getActiveStoreId } = require("../utils/getActiveStore");

// SFG-78: Order didn't carry storeId before this ticket, so every order
// created before the field existed needs one. There is no historical record
// of which store an old order belonged to (this app has only ever had a
// single active store), so the only sound backfill value is the current
// active store  anything else would be a guess.
//
// Dry-run by default: prints what WOULD change without writing anything.
// Pass --apply to actually perform the update. Every order id touched by an
// --apply run is appended to a log file so the change can be verified or
// reversed later (re-running with the ids from the log and $unset storeId).
const LOG_DIR = path.join(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "backfillOrderStoreId.log.json");

const backfillOrderStoreId = async ({ apply = false } = {}) => {
  const storeId = await getActiveStoreId();

  const missingCount = await Order.countDocuments({ storeId: { $exists: false } });
  logger.info(
    `9  ${missingCount} commande(s) sans storeId. Boutique active cible : ${storeId}.`
  );

  if (missingCount === 0) {
    logger.info(" Rien  faire, toutes les commandes ont déjà un storeId.");
    return { missingCount, updated: 0, dryRun: !apply };
  }

  if (!apply) {
    logger.info(
      "9  Mode dry-run (par défaut) : aucune écriture effectué. Relancer avec --apply pour appliquer."
    );
    return { missingCount, updated: 0, dryRun: true };
  }

  const orderIds = await Order.find({ storeId: { $exists: false } }).distinct("_id");

  const result = await Order.updateMany(
    { storeId: { $exists: false } },
    { $set: { storeId } }
  );

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(
    LOG_FILE,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        storeId: storeId.toString(),
        orderIds: orderIds.map((id) => id.toString()),
      },
      null,
      2
    ),
    "utf8"
  );

  logger.info(
    ` ${result.modifiedCount} commande(s) mise(s)  jour avec storeId=${storeId}. Journal : ${LOG_FILE}`
  );

  return { missingCount, updated: result.modifiedCount, dryRun: false };
};

module.exports = backfillOrderStoreId;

if (require.main === module) {
  const apply = process.argv.includes("--apply");

  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      await backfillOrderStoreId({ apply });
      process.exit(0);
    } catch (error) {
      logger.error("L Erreur backfill storeId des commandes:", error.message);
      process.exit(1);
    }
  })();
}
