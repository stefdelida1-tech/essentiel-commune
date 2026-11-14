import fs from 'node:fs';

const content = fs.readFileSync('C:/Projets/essentiel-commune/scripts/substack_raw.js', 'utf-8');
const idx = content.indexOf('"body_html":');
if (idx !== -1) {
  // Extract from idx to next property
  const sub = content.slice(idx);
  const endIdx = sub.indexOf(',"truncated_body_text"');
  const jsonSlice = '{' + sub.slice(0, endIdx) + '}';
  try {
    const parsed = JSON.parse(jsonSlice);
    console.log('=== EXTRACTED NEWSLETTER CONTENT ===');
    console.log(parsed.body_html.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n'));
  } catch (e) {
    console.error('Parse error:', e.message);
  }
} else {
  console.log('body_html not found');
}
