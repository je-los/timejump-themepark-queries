const attractionController = require('../controllers/attractionController');

function handleAttractionRoutes(req, res, path) {
  
  const attractionIdMatch = path.match(/^\/api\/attractions\/([0-9]+)$/);

  if (req.method === 'GET' && path === '/api/attractions') {
    attractionController.getAllAttractions(req, res);
  
  } else if (req.method === 'GET' && attractionIdMatch) {
    const id = attractionIdMatch[1];
    attractionController.getAttractionById(req, res, id);

  } else if (req.method === 'POST' && path === '/api/attractions') {
    attractionController.createAttraction(req, res);

  } else if (req.method === 'PUT' && attractionIdMatch) {
    const id = attractionIdMatch[1];
    attractionController.updateAttraction(req, res, id);
  
  } else if (req.method === 'DELETE' && attractionIdMatch) {
    const id = attractionIdMatch[1];
    attractionController.deleteAttraction(req, res, id);
  
  } else {
    return false; 
  }
  
  return true;
}

module.exports = handleAttractionRoutes;