const http = require('http');
http.get('http://localhost:5055/api/storefront/6a52b6e69286800053a80dd4/dd', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
