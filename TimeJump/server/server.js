const mysql = require('mysql2');
const http = require('http');

const con = mysql.createPool({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '',         //Password to access local database copy
    database: 'timejumpdb',             //Name of schema
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if(req.method === 'OPTIONS'){
        res.writeHead(204);
        res.end();
        return;
    }

    if(req.url === '/employee' && req.method === 'GET'){
        try{
            const[result] = await con.query('CALL sp_GetAllEmployees()');
            const rows = result[0];
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(rows));
        }catch(error){
            console.error(error);
            res.writeHead(500);
            res.end(JSON.stringify({message : 'Error fetching data'}));
        }
    }else{
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({message : 'Endpoint not found'}));
    }
});

const port = 3001;
server.listen(port, () => {
    console.log(`Node.js server is running on http://localhost:${port}`);
});