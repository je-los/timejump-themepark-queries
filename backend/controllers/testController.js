

const { sendJSON, sendError } = require('../utils/responseUtils.js');
const { parseBody } = require('../utils/bodyParser.js');

const hello = async (req, res) => {
  try {

    sendJSON(res, 200, {isSuccessfull: true, message: 'hello'});
  } catch (error) {
    console.error(error); // Log the error for debugging
    sendError(res, 500, 'Server error retrieving attractions');
  }
};




module.exports = {
    hello
};