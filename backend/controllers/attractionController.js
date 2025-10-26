const attractionModel = require('../models/attractionModel.js');

const { sendJSON, sendError } = require('../utils/responseUtils.js');
const { parseBody } = require('../utils/bodyParser.js');

const getAllAttractions = async (req, res) => {
  try {
    const attractions = await attractionModel.getAll();
    sendJSON(res, 200, attractions);
  } catch (error) {
    console.error(error); // Log the error for debugging
    sendError(res, 500, 'Server error retrieving attractions');
  }
};

// Get a single attraction
// The 'id' will be passed from our router
const getAttractionById = async (req, res, id) => {
  try {
    const attraction = await attractionModel.getById(id);
    
    if (!attraction) {
      return sendError(res, 404, 'Attraction not found');
    }
    
    sendJSON(res, 200, attraction);
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error retrieving attraction');
  }
};

// Create a new attraction
const createAttraction = async (req, res) => {
  try {
    const body = await parseBody(req);
    
    // You would add data validation here (e.g., check if Name exists)
    
    const newAttraction = await attractionModel.create(body);
    sendJSON(res, 201, newAttraction); // 201 means "Created"
  } catch (error) {
    console.error(error);
    // 400 means "Bad Request" (e.g., malformed JSON)
    sendError(res, 400, 'Invalid attraction data'); 
  }
};

const updateAttraction = async (req, res, id) => {
  try {
    const body = await parseBody(req);
    
    await attractionModel.update(id, body);
    
    sendJSON(res, 200, { id: id, ...body });
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error updating attraction');
  }
};

const deleteAttraction = async (req, res, id) => {
  try {
    await attractionModel.remove(id);
    
    sendJSON(res, 200, { message: 'Attraction deleted successfully' });
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Server error deleting attraction');
  }
};


module.exports = {
  getAllAttractions,
  getAttractionById,
  createAttraction,
  updateAttraction,
  deleteAttraction
};