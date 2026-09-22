const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const SubscriptionEvent = require("../models/SubscriptionEvent");

const migrateSubscriptionEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");

    const subscriptions = await Subscription.find({});
    let totalEvents = 0;
    let migrated = 0;

    for (const sub of subscriptions) {
      if (!sub.events || !Array.isArray(sub.events) || sub.events.length === 0) {
        continue;
      }

      const eventsToInsert = sub.events.map((event) => ({
        subscriptionId: sub._id,
        storeId: sub.storeId,
        type: event.type,
        message: event.message || "",
        payload: event.data || {},
        status: "info",
        createdBy: event.actor || null,
        createdAt: event.createdAt || new Date(),
      }));

      try {
        await SubscriptionEvent.insertMany(eventsToInsert, { ordered: false });
        totalEvents += eventsToInsert.length;
        migrated++;
        console.log(`  Subscription ${sub._id}: ${eventsToInsert.length} événements migrés`);
      } catch (insertError) {
        console.error(`  Erreur sur subscription ${sub._id}:`, insertError.message);
      }
    }

    console.log(`\nMigration terminé :`);
    console.log(`  - ${migrated} abonnement(s) traité(s)`);
    console.log(`  - ${totalEvents} événement(s) migré(s)`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur migration:", error);
    process.exit(1);
  }
};

migrateSubscriptionEvents();
