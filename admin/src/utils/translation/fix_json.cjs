const fs = require('fs');
let c = fs.readFileSync('fr.json', 'binary');
// Replace literal \n with real newline
c = c.replace(/\\n/g, '\n');
// Replace literal \r with nothing  
c = c.replace(/\\r/g, '');
// Make sure it starts with {
if (!c.startsWith('{')) {
    c = '{\n' + c;
}
fs.writeFileSync('fr.json', c, 'utf8');
console.log('Fixed');
