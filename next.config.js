/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // swcMinify está habilitado por defecto en Next.js 15
  experimental: {
    // Next.js 15 features
  },
  // Configuración para variables de entorno públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const useHsts = isProduction && (appUrl.startsWith('https://') || appUrl === '');
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    if (useHsts) {
      securityHeaders.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' });
    }
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Suprimir warning de pg-native (dependencia opcional de pg, no usada en runtime)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pg-native');
    }
    return config;
  },
}

module.exports = nextConfig
