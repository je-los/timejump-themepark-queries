const testController = require('../controllers/testController');

function handleTestRoute(req, res, path) {
  
  const attractionIdMatch = path.match(/^\/api\/attractions\/([0-9]+)$/);

  if (req.method === 'GET') {
    return testController.hello(req, res);
  
  }  else {
    return false; 
  }
  

}

module.exports = handleTestRoute;