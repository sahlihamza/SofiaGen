const fs = require('fs');
const c = fs.readFileSync('src/utils/translation/en.json', 'utf8');
const chars = [...c];
const bad = chars.filter(ch => ch.charCodeAt(0) === 0xFFFD || (ch.charCodeAt(0) < 32 && ch.charCodeAt(0) !== 10 && ch.charCodeAt(0) !== 13));
console.log('Total chars:', chars.length);
console.log('Bad chars:', bad.length);
const unique = [...new Set(bad)];
console.log('Unique bad chars:', unique.length);
unique.forEach(ch => {
  console.log(`  U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} (${ch.charCodeAt(0)})`);
});
// Show context
console.log('\nFirst 5 bad chars with context:');
let count = 0;
for (let i = 0; i < chars.length && count < 5; i++) {
  if (bad.includes(chars[i])) {
    console.log(`  Position ${i}: U+${chars[i].codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
    console.log(`  Context: ${JSON.stringify(chars.slice(Math.max(0, i - 10), i + 10).join(''))}`);
    count++;
  }
}
