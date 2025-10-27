const http = require('http');
const { URL } = require('url');
require('dotenv').config();

const { pool, allowedOrigin } = require('./db');

const attractionsRoute = require('./routes/attractions');
const parkingRoute = require('./routes/parking');
const ticketsRoute = require('./routes/tickets');
const employeeRoute = require('./routes/employee');
const maintenanceRoute = require('./routes/maintenance');

const PORT = process.env.SERVER_PORT || 3001;


const server = http.createServer((req, res) => {
  const { method, headers } = req;
  const reqUrl = new URL(req.url, `http://${headers.host}`);
  const pathname = reqUrl.pathname;

  // CORS headers for every response
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    // Handle CORS preflight request quickly
    res.writeHead(204);
    return res.end();
  }

  // Routing logic for API endpoints:
  if (method === 'GET' && pathname === '/api/attractions') {
    // Get all attractions
    attractionsRoute.getAttractions(res).catch(err => {
      console.error('Error in GET /api/attractions:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch attractions' }));
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/parking') {
    // Get parking availability
    parkingRoute.getParking(res).catch(err => {
      console.error('Error in GET /api/parking:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch parking data' }));
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/employee/visitors') {
    // Get list of visitors (employees only)
    employeeRoute.getVisitors(res).catch(err => {
      console.error('Error in GET /api/employee/visitors:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch visitors data' }));
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/maintenance') {
    // Get maintenance records (e.g., open issues)
    maintenanceRoute.getMaintenanceRecords(res).catch(err => {
      console.error('Error in GET /api/maintenance:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch maintenance records' }));
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/tickets') {
    // Purchase ticket(s)
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let data;
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      try {
        await ticketsRoute.purchaseTicket(res, data);
      } catch (err) {
        console.error('Error in POST /api/tickets:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to process ticket purchase' }));
      }
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/employee/login') {
    // Employee login (demo authentication)
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let data;
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
      try {
        await employeeRoute.loginEmployee(res, data);
      } catch (err) {
        console.error('Error in POST /api/employee/login:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Login failed due to server error' }));
      }
    });
    return;
  }

  if (method === 'PATCH' && pathname.startsWith('/api/maintenance/')) {
    // Update a maintenance record by ID
    const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
    // URL pattern expected: /api/maintenance/{id}
    if (parts.length === 3 && parts[1] === 'maintenance') {
      const idStr = parts[2];
      const recordId = parseInt(idStr, 10);
      if (isNaN(recordId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Maintenance record ID must be a number' }));
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        let data;
        try {
          data = body ? JSON.parse(body) : {};
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
        try {
          await maintenanceRoute.updateMaintenance(res, recordId, data);
        } catch (err) {
          console.error('Error in PATCH /api/maintenance:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to update maintenance record' }));
        }
      });
      return;
    }
  }

  // No route matched:
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
