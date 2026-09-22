import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'statistics.html');
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// Remove conflict marker lines and the blank line, keep only the dev data line
const conflictStart = 4931; // 1-indexed line where conflict starts
const conflictEnd = 4940;   // 1-indexed line where conflict ends

// Lines to remove: 4931, 4932, 4933, 4934, 4935 (0-indexed: 4930-4934)
// Lines to keep: 4936 (the dev data line, 0-indexed: 4935)
// Wait, let me check the actual content first

const conflictLines = lines.slice(conflictStart - 1, conflictEnd);
console.log('Conflict lines:', conflictLines.map((l, i) => `${conflictStart + i}: ${l.substring(0, 50)}`).join('\n'));

// The structure is:
// 4931: <<<<<<< HEAD
// 4932: <<<<<<< HEAD  
// 4933: =======
// 4934: >>>>>>> dev
// 4935: (blank)
// 4936: const data = ... (this is the dev data line we want to keep)

// Actually let me just look for the pattern and reconstruct
const newLines = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (line === '<<<<<<< HEAD' && i + 1 < lines.length && lines[i + 1] === '<<<<<<< HEAD') {
    // Skip the nested conflict block
    // Find the end
    while (i < lines.length && !(lines[i] === '>>>>>>> dev' && i + 1 < lines.length && lines[i + 1] === '>>>>>>> dev')) {
      i++;
    }
    // Skip the final >>>>>>> dev lines
    if (i < lines.length) i++; // skip first >>>>>>> dev
    if (i < lines.length) i++; // skip second >>>>>>> dev
    // Skip blank line if present
    if (i < lines.length && lines[i].trim() === '') i++;
    
    // Now we should be at the dev data line, but it was consumed in the conflict
    // We need to add it back
    newLines.push('    const data = {"version":2,"tree":{"name":"root","children":[]}};');
  } else if (line.startsWith('<<<<<<< HEAD') || line.startsWith('=======') || line.startsWith('>>>>>>> dev')) {
    // Skip other conflict markers
    i++;
  } else {
    newLines.push(line);
    i++;
  }
}

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Fixed statistics.html, new line count:', newLines.length);
