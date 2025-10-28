const url = require('url');
const handleAttractionRoutes = require('./attractionRoutes');
const handleEmployeeRoutes = require('./employeeRoutes');
const testRoute = require('./testRoute');


const router = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  console.log(`Request received for: ${req.method} ${path}`);

  testRoute(req,res,path)

  // DELEGATION LOGIC
  // if (path.startsWith('/api/attractions')) {
  //   handleAttractionRoutes(req, res, path); // This file is now responsible for its *own* 404s

  // } else if (path.startsWith('/api/employees')) {
  //   handleEmployeeRoutes(req, res, path); // This file is now responsible for its *own* 404s

  // } else {
    
  //   res.writeHead(404, { 'Content-Type': 'application/json' });
  //   res.end(JSON.stringify({ message: 'Route not found' }));
  // }
};

module.exports = router;