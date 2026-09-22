const fs = require('fs');
let c = fs.readFileSync('fr.json', 'utf8');
c = c.replace(/^\uFEFF/, ''); // Remove BOM if any
if (!c.trim().startsWith('{')) {
    c = '{\n' + c;
}
fs.writeFileSync('fr.json', c);
console.log('Fixed');
