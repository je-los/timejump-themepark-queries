import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from './http/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localEnvPath = resolve(__dirname, '../.env.local');

dotenv.config({ path: localEnvPath, override: true }); // prefer local overrides when present
dotenv.config();

const PORT = Number(process.env.PORT || 4000);

const server = createServer();

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
