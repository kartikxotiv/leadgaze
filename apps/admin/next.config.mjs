import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Resolve the monorepo root dynamically (two levels up from apps/admin)
const MONOREPO_ROOT = path.resolve(__dirname, '../..');

const INTERNAL_PACKAGES = [
  '@kit/ui',
  '@kit/auth',
  '@kit/accounts',
  '@kit/shared',
  '@kit/supabase',
  '@kit/i18n',
  '@kit/next',
  '@kit/core',
  '@kit/service-cloud',
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: INTERNAL_PACKAGES,
  images: {
    remotePatterns: getRemotePatterns(),
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  serverExternalPackages: [],
  /**
   * Suppress the "multiple lockfiles" warning — the real lockfile is pnpm-lock.yaml at the repo root.
   */
  /**
   * Suppress the "multiple lockfiles" warning — the real lockfile is pnpm-lock.yaml at the monorepo root.
   */
  outputFileTracingRoot: MONOREPO_ROOT,
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  experimental: {
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-select',
      'date-fns',
      ...INTERNAL_PACKAGES,
    ],
  },
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default config;

function getRemotePatterns() {
  /** @type {import('next').NextConfig['remotePatterns']} */
  const remotePatterns = [];

  if (SUPABASE_URL) {
    const url = new URL(SUPABASE_URL);
    remotePatterns.push({
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
    });
  }

  if (!IS_PRODUCTION) {
    remotePatterns.push(
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    );
  }

  return remotePatterns;
}
