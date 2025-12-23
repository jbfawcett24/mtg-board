import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA} from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MTG Board',
        short_name: 'MTG Board',
        description: 'Magic the Gathering Board State Manager',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon.png',
            sizes: '758x758',
            type: 'image/png'
          },
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/decks': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }

})
