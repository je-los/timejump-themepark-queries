import dotenv from 'dotenv';
import { createServer } from './http/server.js';

dotenv.config();

const PORT = Number(process.env.PORT || 4000);

const server = createServer();

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
