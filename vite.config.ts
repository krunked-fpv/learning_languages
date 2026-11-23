import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function wanderlingCourseModePlugin(mode: string): Plugin {
  const isTestEnv = mode === 'test' || Boolean(process.env.VITEST);
  return {
    name: 'wanderling-course-mode-loader',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        (source === './baseCoursesLoader' || source === './baseCoursesLoader.ts') &&
        importer &&
        importer.replace(/\\/g, '/').includes('/src/curriculum/')
      ) {
        return resolve(
          __dirname,
          isTestEnv
            ? 'src/curriculum/baseCoursesLoader.test.ts'
            : 'src/curriculum/baseCoursesLoader.prod.ts'
        );
      }
      return null;
    },
  };
}

const BASE_COURSE_FILE_RE =
  /\/src\/curriculum\/(es|fr|de|it|pt|en|zh|ja|hi|bn|ar|arz|ru|id|vi|sw)(Units6to8|Units9to16)?\.ts$/;

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [wanderlingCourseModePlugin(mode), react()],
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !/adult-mashup-|course-(?!es-)/i.test(dep)),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('/node_modules/')) {
            return 'vendor';
          }
          if (norm.includes('/src/art/vocab/')) {
            return 'art-vocab';
          }
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
            if (norm.includes('/ebonics')) return 'adult-ebonics';
            if (norm.includes('/suburban')) return 'adult-suburban';
            return 'adult-atlas';
          }
          const courseMatch = norm.match(BASE_COURSE_FILE_RE);
          if (courseMatch) {
            const [, lang, suffix] = courseMatch;
            return suffix === 'Units9to16' ? `course-${lang}-b1c2` : `course-${lang}-a1a2`;
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
}));
