const url = require('url');
const attractionController = require('../controllers/attractionController');
const router = (req, res) => {
    const parsedURL = url.parse(req.url, true);
    const path = parsedURL.pathname;

    console.log(`Request received for: ${req.method} ${path}}`);

    const attractionIdMatch = path.match(/^\/api\/attractions\/([0-9]+)$/);

    if (req.method === 'GET' && path === '/api/attractions') {
    attractionController.getAllAttractions(req, res);
  
    } 
    else if (req.method === 'GET' && attractionIdMatch) {
    const id = attractionIdMatch[1];
    attractionController.getAttractionById(req, res, id);
    }
    else if (req.method === 'POST' && path === '/api/attractions') {
        attractionController.createAttraction(req, res);

        // --- (You would add other resources here) ---
        // } else if (req.method === 'GET' && path === '/api/employees') {
        //   employeeController.getAllEmployees(req, res);
  
    }
    else if (req.method === 'PUT' && attractionIdMatch) {
        const id = attractionIdMatch[1];
        attractionController.updateAttraction(req, res, id);
    }
    else if (req.method === 'DELETE' && attractionIdMatch) {
        const id = attractionIdMatch[1];
        attractionController.deleteAttraction(req, res, id);
    }
    else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Route not found' }));
    }
};

module.exports = router;
