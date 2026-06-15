import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const mdPath = join(root, 'docs/system/01-system-overview.md');
const htmlPath = join(root, 'docs/system/01-system-overview.html');
const pdfPath = join(root, 'docs/system/Pyonea-System-Overview.pdf');

const md = readFileSync(mdPath, 'utf8');

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function parseMarkdown(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('---')) {
      i += 1;
      while (i < lines.length && !lines[i].startsWith('---')) i += 1;
      i += 1;
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      blocks.push({ type: `h${level}`, text: line.replace(/^#+\s*/, '') });
      i += 1;
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const rows = tableLines
        .filter((row) => !/^\|[\s:-]+\|$/.test(row.replace(/\|/g, '|')))
        .map((row) =>
          row
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim()),
        );
      blocks.push({ type: 'table', rows });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s*/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s/.test(lines[i]) && !/^\|.+\|$/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', text: paragraph.join(' ') });
  }

  return blocks;
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'h1':
          return `<h1>${inlineMarkdown(block.text)}</h1>`;
        case 'h2':
          return `<h2>${inlineMarkdown(block.text)}</h2>`;
        case 'h3':
          return `<h3>${inlineMarkdown(block.text)}</h3>`;
        case 'p':
          return `<p>${inlineMarkdown(block.text)}</p>`;
        case 'ul':
          return `<ul>${block.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`;
        case 'ol':
          return `<ol>${block.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`;
        case 'table': {
          const [head, ...body] = block.rows;
          return `<table><thead><tr>${head.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${body
            .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`;
        }
        default:
          return '';
      }
    })
    .join('\n');
}

const css = readFileSync(join(root, 'docs/system/pdf-style.css'), 'utf8');
const body = renderBlocks(parseMarkdown(md));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Pyonea — Full System Overview</title>
  <style>
    ${css}
    .cover {
      text-align: center;
      padding: 48mm 12mm 18mm;
      page-break-after: always;
    }
    .cover h1 {
      border: none;
      font-size: 30pt;
      margin-bottom: 0.2em;
    }
    .cover .meta {
      color: #64748b;
      font-size: 11pt;
      line-height: 1.8;
      margin-top: 1.5em;
    }
    .cover .brand {
      margin-top: 2.5em;
      font-size: 12pt;
      color: #3b8950;
      font-weight: 600;
    }
    .footer-note {
      margin-top: 2em;
      text-align: center;
      color: #64748b;
      font-style: italic;
    }
  </style>
</head>
<body>
  <section class="cover">
    <h1>Pyonea</h1>
    <p style="font-size: 18pt; color: #334155; margin: 0;">Full System Overview</p>
    <div class="meta">
      <div>System Documentation (Non-Technical)</div>
      <div>Version 1.0 · June 2025</div>
      <div>Audience: Business stakeholders, operations, support, sellers, buyers</div>
    </div>
    <div class="brand">Myanmar's B2B Wholesale Marketplace</div>
  </section>
  <main>
    ${body}
    <p class="footer-note">Pyonea — Myanmar's B2B Wholesale Marketplace</p>
  </main>
</body>
</html>`;

writeFileSync(htmlPath, html, 'utf8');

const edgeCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];

const browser = edgeCandidates.find((candidate) => {
  try {
    readFileSync(candidate);
    return true;
  } catch {
    return false;
  }
});

if (!browser) {
  console.error('No Edge/Chrome browser found for PDF generation.');
  console.error(`HTML saved to: ${htmlPath}`);
  process.exit(1);
}

const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--print-to-pdf=${pdfPath}`,
  '--print-to-pdf-no-header',
  fileUrl,
], { stdio: 'inherit' });

console.log(`PDF generated: ${pdfPath}`);
