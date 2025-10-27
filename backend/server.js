require('dotenv').config();
const http = require('http');

const mainRouter = require('./routes/index.js');

const server = http.createServer((req,res) => {
    mainRouter(req, res);

});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`); //BACKTICK ` ` NOT ' ', BACKTICK IS NEXT TO 1 ON KEYBOARD
});