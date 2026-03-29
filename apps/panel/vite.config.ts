import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const panelPort = Number(env.PANEL_PORT || 41730);
  const apiPort = Number(env.PANEL_API_PORT || 41731);

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: panelPort,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: panelPort,
    },
  };
});
