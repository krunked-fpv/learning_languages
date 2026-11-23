import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('/src/curriculum/adultMode/mashups/')) {
            if (norm.includes('/corpTrades') || norm.includes('/wave1/corp')) {
              return 'adult-mashup-corp-trades';
            }
            if (norm.includes('/midwestNortheast') || norm.includes('/wave1/midwest')) {
              return 'adult-mashup-midwest-northeast';
            }
            if (norm.includes('/southGenz') || norm.includes('/wave1/south')) {
              return 'adult-mashup-south-genz';
            }
            if (norm.includes('/caliCountry') || norm.includes('/wave2/cali')) {
              return 'adult-mashup-cali-country';
            }
            if (norm.includes('/stonerTactical') || norm.includes('/wave2/stoner')) {
              return 'adult-mashup-stoner-tactical';
            }
            if (norm.includes('/wave1/')) return 'adult-mashups-wave1-shared';
            if (norm.includes('/wave2/')) return 'adult-mashups-wave2-shared';
            return 'adult-mashups';
          }
          if (norm.includes('/src/curriculum/adultMode/')) {
            return 'adult-atlas';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
