// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import svgLoader from "vite-svg-loader";

// Full static: es lo que necesita GitHub Pages (ni SSR ni API routes).
// Las islas Vue hacen fetch al backend en el navegador, no en build time.
export default defineConfig({
  output: 'static',
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss(), svgLoader({ defaultImport: "url" })],
  },
  // Si publicas en usuario.github.io/repo, descomenta y ajusta:
  // base: '/trueno-pro-club-tourney',
});
