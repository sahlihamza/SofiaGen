const http = require('http');

function fetchPage(slug) {
  return new Promise(resolve => {
    http.get(`http://localhost:5055/api/storefront/6a52b6e69286800053a80dd4/${slug}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`=== Result for slug: ${slug} ===`);
        console.log(data);
        resolve();
      });
    });
  });
}

async function main() {
  await fetchPage('dd');
  await fetchPage('eee');
  process.exit(0);
}

main();
