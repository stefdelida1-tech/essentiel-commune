import fs from 'node:fs';

async function run() {
  const url = 'https://nicolastfn.substack.com/p/lessentiel-de-bondy-0';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await res.text();
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const s of scripts) {
    if (s.includes('Bondynois') && s.includes('Travaux')) {
      // Find window._initialData or window.__PRELOADED_STATE__
      const content = s.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      fs.writeFileSync('C:/Projets/essentiel-commune/scripts/substack_raw.js', content, 'utf-8');
      console.log('Saved script to substack_raw.js');
    }
  }

  // Check substack posts API
  const apiRes = await fetch('https://nicolastfn.substack.com/api/v1/posts?limit=5');
  if (apiRes.ok) {
    const list = await apiRes.json();
    console.log('API Posts count:', list.length);
    for (const p of list) {
      console.log('-', p.title, ':', p.slug, '(', p.post_date, ')');
      if (p.slug === 'lessentiel-de-bondy-0') {
        console.log('FULL POST BODY:');
        console.log(p.body_html?.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n'));
      }
    }
  } else {
    console.log('API returned status:', apiRes.status);
  }
}

run().catch(console.error);
