const employeeController = require('../controllers/employeeController');

function handleEmployeeRoutes(req, res, path) {
  
  const employeeIdMatch = path.match(/^\/api\/employees\/([0-9]+)$/);

  if (req.method === 'GET' && path === '/api/employees') {
    employeeController.getAllEmployees(req, res);
  
  } else if (req.method === 'GET' && employeeIdMatch) {
    const id = employeeIdMatch[1];
    employeeController.getEmployeeById(req, res, id);

  } else if (req.method === 'POST' && path === '/api/employees') {
    employeeController.createEmployee(req, res);

  } else if (req.method === 'PUT' && employeeIdMatch) {
    const id = employeeIdMatch[1];
    employeeController.updateEmployee(req, res, id);
  
  } else if (req.method === 'DELETE' && employeeIdMatch) {
    const id = employeeIdMatch[1];
    employeeController.deleteEmployee(req, res, id);
  
  } else {
    return false; 
  }
  
  return true;
}

module.exports = handleEmployeeRoutes;