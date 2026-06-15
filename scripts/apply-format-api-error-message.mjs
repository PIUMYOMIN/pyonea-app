import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const SKIP_FILES = new Set([
  'native-api.ts',
  'native-push-notifications.ts',
  'seo-export.ts',
  'apply-format-api-error-message.mjs',
]);

const TERNARY_PATTERNS = [
  [/(\w+) instanceof Error \? \1\.message : (t\([^)]*(?:\([^)]*\)[^)]*)*\))/g, 'formatApiErrorMessage($1, $2)'],
  [/(\w+) instanceof Error \? \1\.message : ('(?:[^'\\]|\\.)*')/g, 'formatApiErrorMessage($1, $2)'],
  [/(\w+) instanceof Error \? \1\.message : ("(?:[^"\\]|\\.)*")/g, 'formatApiErrorMessage($1, $2)'],
  [/error instanceof ApiError \? error\.message : ('(?:[^'\\]|\\.)*')/g, 'formatApiErrorMessage(error, $1)'],
  [/error instanceof ApiError \? error\.message : ("(?:[^"\\]|\\.)*")/g, 'formatApiErrorMessage(error, $1)'],
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(fullPath);
  }
  return files;
}

function ensureImport(content, filePath) {
  if (content.includes('formatApiErrorMessage')) {
    if (content.includes("formatApiErrorMessage") && content.includes("from '@/utils/native-api'")) {
      if (/formatApiErrorMessage/.test(content.split("from '@/utils/native-api'")[0])) {
        return content;
      }
    }
  }

  if (!content.includes('formatApiErrorMessage')) return content;

  const importFromNativeApi = /import\s*\{([^}]+)\}\s*from\s*['"]@\/utils\/native-api['"];?/;
  const match = content.match(importFromNativeApi);
  if (match) {
    const specifiers = match[1];
    if (specifiers.includes('formatApiErrorMessage')) return content;
    const next = specifiers.trim().endsWith(',')
      ? `${specifiers}\n  formatApiErrorMessage,`
      : `${specifiers},\n  formatApiErrorMessage,`;
    return content.replace(importFromNativeApi, `import {${next}} from '@/utils/native-api';`);
  }

  const lines = content.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('import ')) insertAt = i + 1;
  }
  lines.splice(insertAt, 0, "import { formatApiErrorMessage } from '@/utils/native-api';");
  return lines.join('\n');
}

let updated = 0;

for (const filePath of walk(ROOT)) {
  const fileName = filePath.split(/[/\\]/).pop();
  if (SKIP_FILES.has(fileName)) continue;

  let content = readFileSync(filePath, 'utf8');
  const original = content;

  if (!/instanceof (Error|ApiError) \?/.test(content)) continue;

  for (const [pattern, replacement] of TERNARY_PATTERNS) {
    content = content.replace(pattern, replacement);
  }

  if (content === original) continue;

  content = ensureImport(content, filePath);
  writeFileSync(filePath, content, 'utf8');
  updated += 1;
  console.log(filePath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''));
}

console.log(`Updated ${updated} files.`);
