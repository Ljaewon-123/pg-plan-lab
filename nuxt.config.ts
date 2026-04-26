// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/a11y',
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/scripts',
    '@artmizu/nuxt-prometheus',
  ],

  css: ['~/assets/css/main.css', 'pev2/dist/pev2.css'],
})
