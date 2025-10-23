const url = require('url');

const router = (req, res) => {
    const parsedURL = url.parse(req.url, true);
    const path = parsedURL.pathname;

    console.log(`Request received for: ${req.method} ${path}}`);

    if (req.method === 'GET' && path === '/api/test') {
        res.writeHead(200, { 'Content-Type': 'application/json'});
        res.end(JSON.stringify({message: 'Success! router is working'}));
    }
    else{
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({message: 'Route not found'}));
    }
};

module.exports = router;
