const dotenv = require('dotenv');
const path = require('path');
const db = require('./src/config/db');
const Theme = require('./src/models/Theme');

dotenv.config({ path: path.join(process.cwd(), '.env') });

(async () => {
  try {
    await db.connectDB();
    const themes = await Theme.find({}).lean().limit(50);
    console.log('themesCount=', themes.length);
    themes.forEach(theme => {
      console.log(JSON.stringify({
        _id: theme._id?.toString?.(),
        name: theme.name,
        storeId: theme.storeId?.toString?.(),
        isActive: theme.isActive,
        isDraft: theme.isDraft,
        colors: theme.colors,
      }, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error('SCRIPT_ERROR', err);
    process.exit(1);
  }
})();
