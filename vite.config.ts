import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * 로컬 개발용: api/*.ts (Vercel 함수)를 Vite 개발 서버에서 그대로 실행.
 * 배포 시에는 Vercel이 같은 파일을 서버리스 함수로 실행합니다.
 */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()
        const name = url.slice('/api/'.length).split('?')[0]
        if (!/^[a-z-]+$/.test(name)) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const handler = mod[req.method ?? 'GET'] as ((r: Request) => Promise<Response>) | undefined
          if (!handler) {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const response = await handler(
            new Request(`http://localhost${url}`, {
              method: req.method,
              headers,
              body: chunks.length ? new Uint8Array(Buffer.concat(chunks)) : undefined,
            }),
          )
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// `npm run dev:mobile` → HTTPS로 실행 (휴대폰에서 카메라·마이크 접근하려면 HTTPS 필요)
export default defineConfig(({ mode }) => {
  // .env.local 의 OPENAI_API_KEY 등을 서버 코드(api/)에서 쓸 수 있게 (VITE_ 접두사가 없으므로 브라우저로는 노출되지 않음)
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      devApi(),
      mode === 'https' && basicSsl(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: '분리수거 AI',
          short_name: '분리수거AI',
          description: '사진이나 말로 물어보면 우리 동네 분리배출 방법을 알려줘요',
          lang: 'ko',
          theme_color: '#F58220',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})
