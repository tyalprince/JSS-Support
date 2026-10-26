import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN is set
// (e.g. on Vercel). Without it the build is unchanged.
const sentryUpload = !!process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  plugins: [
    react(),
    sentryUpload &&
      sentryVitePlugin({
        org: 'tyal-prince',
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        telemetry: false,
      }),
  ].filter(Boolean),
  build: sentryUpload ? { sourcemap: 'hidden' } : {},
})
