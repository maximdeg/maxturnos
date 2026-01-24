/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify está habilitado por defecto en Next.js 15
  experimental: {
    // Next.js 15 features
  },
  // Configuración para variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
