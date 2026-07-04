import { defineConfig } from 'vite';

const USERSCRIPT_ENTRY = '/Search-Engine-Result-Hider_autoupdate.user.js';

function userscriptFullReload() {
  return {
    name: 'userscript-full-reload',
    handleHotUpdate({ file, server }) {
      if (file.endsWith('Search-Engine-Result-Hider_autoupdate.user.js')) {
        server.ws.send({
          type: 'full-reload',
          path: USERSCRIPT_ENTRY
        });
        return [];
      }
    }
  };
}

export default defineConfig({
  plugins: [userscriptFullReload()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      host: '127.0.0.1',
      port: 5173,
      protocol: 'ws'
    }
  }
});
