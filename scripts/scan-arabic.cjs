const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') results.push(...walk(full));
    } else if (/\.(jsx?|tsx?)$/.test(file) && !file.includes('translations.js') && !file.includes('.test.')) {
      results.push(full);
    }
  }
  return results;
}

const arabicRegex = /[\u0600-\u06FF]/;
const files = walk('./src');
const componentsSummary = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const fileMatches = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (arabicRegex.test(trimmed)) {
      fileMatches.push({ line: idx + 1, content: trimmed });
    }
  });
  if (fileMatches.length > 0) {
    componentsSummary.push({ file, count: fileMatches.length, matches: fileMatches });
  }
}

componentsSummary.sort((a, b) => b.count - a.count);
for (const item of componentsSummary) {
  console.log(`${item.count.toString().padStart(3)} matches: ${item.file}`);
}
