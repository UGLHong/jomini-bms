const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000'

const isProd = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  devtools: { enabled: !isProd },
  srcDir: '.',
  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  imports: {
    dirs: ['composables', 'stores', 'utils'],
  },
  components: [{ path: '@/components', pathPrefix: false }],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtAccessTtl: Number(process.env.JWT_ACCESS_TTL || 900),
    jwtRefreshTtl: Number(process.env.JWT_REFRESH_TTL || 2_592_000),
    cookieDomain: process.env.COOKIE_DOMAIN || '',
    customAuthToken: process.env.CUSTOM_AUTH_TOKEN || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramInternalGroupId: process.env.TELEGRAM_INTERNAL_GROUP_ID || '',
    telegramSupplierBsgGroupId: process.env.TELEGRAM_SUPPLIER_BSG_GROUP_ID || '',
    telegramSupplierNickGroupId: process.env.TELEGRAM_SUPPLIER_NICK_GROUP_ID || '',
    telegramWebhookToken: process.env.TELEGRAM_WEBHOOK_TOKEN || '',
    telegramButtonUrl: process.env.TELEGRAM_BUTTON_URL || appUrl,
    flowxoCallbackUrl: process.env.FLOWXO_CALLBACK_URL || '',
    defaultTz: process.env.DEFAULT_TZ || 'Asia/Kuala_Lumpur',
    logLevel: process.env.LOG_LEVEL || 'info',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    supplierApiPollIntervalMs: Number(process.env.SUPPLIER_API_POLL_INTERVAL_MS || 30_000),
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || '',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || '',
    public: {
      appUrl,
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '*/5 * * * *': ['notifications:send-pending'],
      '0 16 * * *': ['reports:daily-internal-summary', 'reports:daily-supplier-summary'],
    },
    routeRules: {
      '/order/create': { proxy: '/api/order/create' },
      '/stock_status': { proxy: '/api/stock-status' },
    },
  },
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ms', name: 'Bahasa Melayu', file: 'ms.json' },
    ],
    lazy: true,
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'jbms_locale',
      redirectOn: 'root',
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
  app: {
    head: {
      title: 'Jomini BMS',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Jomini Gaming business management system' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  eslint: {
    config: {
      stylistic: false,
    },
  },
  // @ts-expect-error: nitro config is valid but not typed in defineNuxtConfig
})
