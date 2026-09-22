import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'statistics.html');
let content = fs.readFileSync(filePath, 'utf8');

// Remove conflict markers from statistics.html
content = content.replace(
  /<<<<<<< HEAD\n<<<<<<< HEAD\n=======\n>>>>>>> dev\n\n/,
  ''
);

// Find the data line pattern and replace the broken section
const marker = '    const run = () => {';
const dataLine = '    const data = {"version":2,"tree":{"name":"root","children":[]}};';

content = content.replace(marker, dataLine + '\n\n' + marker);

fs.writeFileSync(filePath, content);
console.log('Fixed statistics.html');
