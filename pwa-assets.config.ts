import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run generate-icons` → public/favicon.svg 로부터 PWA 아이콘 PNG 생성
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})
