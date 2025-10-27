const employeeModel = require('../models/employeeModel.js');

const { sendJSON, sendError } = require('../utils/responseUtils.js');
const { parseBody } = require('../utils/bodyParser.js');

const getAllEmployees = async (req, res) => {
  try {
    const employees = await employeeModel.getAll();
    sendJSON(res, 200, employees);
  } catch (error) {
    console.error(error); // Log the error for debugging
    sendError(res, 500, 'Server error retrieving Employees');
  }
};

// The 'id' will be passed from our router
const getEmployeeById = async (req, res, id) => {
  try {
    const employee = await employeeModel.getById(id);
    
    if (!employee) {
      return sendError(res, 404, 'Employee not found');
    }
    
    sendJSON(res, 200, employee);
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error retrieving employee');
  }
};

const createEmployee = async (req, res) => {
  try {
    const body = await parseBody(req);
    
    // You would add data validation here (e.g., check if Name exists)
    
    const newEmployee = await employeeModel.create(body);
    sendJSON(res, 201, newEmployee); // 201 means "Created"
  } catch (error) {
    console.error(error);
    sendError(res, 400, 'Invalid employee data'); 
  }
};

const updateEmployee = async (req, res, id) => {
  try {
    const body = await parseBody(req);
    
    await employeeModel.update(id, body);
    
    sendJSON(res, 200, { id: id, ...body });
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error updating employee');
  }
};

const deleteEmployee = async (req, res, id) => {
  try {
    await employeeModel.remove(id);
    
    sendJSON(res, 200, { message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error deleting employee');
  }
};


module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};