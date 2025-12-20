import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ['cesium'],
          mars3d: ['mars3d']
        }
      }
    }
  },
  server: {
    port: 5174,
    host: true
  },
  optimizeDeps: {
    include: ['cesium', 'three', 'mars3d'],
    exclude: ['three/examples/jsm/controls/OrbitControls.js']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // 定义Cesium基础URL
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})