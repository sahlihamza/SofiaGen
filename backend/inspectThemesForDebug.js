const dotenv = require('dotenv');
const path = require('path');
const db = require('./src/config/db');
const Theme = require('./src/models/Theme');

dotenv.config({ path: path.join(process.cwd(), '.env') });

(async () => {
  try {
    await db.connectDB();
    const themes = await Theme.find({}).lean().limit(200);
    console.log('themesCount=', themes.length);
    const byStore = {};
    themes.forEach(theme => {
      const sid = theme.storeId ? String(theme.storeId) : 'null';
      if (!byStore[sid]) byStore[sid] = [];
      byStore[sid].push({
        _id: theme._id?.toString?.(),
        name: theme.name,
        isActive: theme.isActive,
        isDraft: theme.isDraft,
      });
    });
    console.log(JSON.stringify(byStore, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERR', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
