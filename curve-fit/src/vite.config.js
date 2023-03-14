import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'

export default defineConfig(({ command }) => {
  const input = { index: resolve(__dirname, 'index.html') }

  return {
    plugins: [vue()],
    // esbuild: {
    //   drop: ['console']
    // },
    build: {
      target: "esnext"
    },
    server: {
      // to set https in vite, please refer to https://dev.classmethod.jp/articles/vite-https-localhost/
      https: {
        key: fs.readFileSync('./certs/localhost-key.pem'),
        cert: fs.readFileSync('./certs/localhost.pem'),
      },
      // host: "dev.localhost"
      host: "localhost"
    }
  }
})
