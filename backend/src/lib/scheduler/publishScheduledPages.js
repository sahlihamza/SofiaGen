const Page = require("../../models/Page");

async function publishScheduledPages() {
  const now = new Date();
  const duePages = await Page.find({
    scheduleStatus: "scheduled",
    scheduledAt: { $lte: now },
  });
  
  for (const page of duePages) {
    page.isPublished = true;
    page.isDraft = false;
    page.publishedAt = now;
    page.scheduleStatus = "published";
    await page.save();
  }
  
  return duePages.length;
}

module.exports = publishScheduledPages;
