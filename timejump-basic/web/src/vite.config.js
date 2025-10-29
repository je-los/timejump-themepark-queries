import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react' // optional if you already use it

export default defineConfig({
  // plugins: [react()],
  server: {
    host: '0.0.0.0',                 // allow external access
    port: 5173,
    allowedHosts: [
      'timejump-themepark.com',
      'www.timejump-themepark.com'
    ],
    // optional but helpful when proxy/SSL is involved:
    // strictPort: true,
    // hmr: { host: 'timejump-themepark.com', port: 5173 },
  }
})