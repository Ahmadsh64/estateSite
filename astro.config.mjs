import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server', // כל האתר server-rendered
  adapter: node({
    mode: 'standalone'
  }),
});
