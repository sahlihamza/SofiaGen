const fs = require('fs');

function findReplacements(obj, prefix = '') {
  const results = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (value.includes('\uFFFD')) {
        results.push({ key: fullKey, value: JSON.stringify(value) });
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      results.push(...findReplacements(value, fullKey));
    }
  }
  return results;
}

for (const f of ['en', 'fr', 'es', 'ar']) {
  const data = JSON.parse(fs.readFileSync('src/utils/translation/' + f + '.json', 'utf8'));
  const results = findReplacements(data);
  console.log(f + '.json: ' + results.length + ' strings with U+FFFD');
  results.slice(0, 10).forEach(r => {
    console.log('  ' + r.key + ': ' + r.value);
  });
  if (results.length > 10) console.log('  ... and ' + (results.length - 10) + ' more');
}
