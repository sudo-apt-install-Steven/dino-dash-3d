import { defineConfig } from 'vite';

const LEGAL_BANNER_JS = '/*! DINO DASH 3D | Copyright (c) 2026 Steven Tayllon teixeira Jerônimo De Melos | https://dino-dash-3d-six.vercel.app | Todos os direitos reservados (UNLICENSED) */\n';
const LEGAL_BANNER_HTML = '<!-- DINO DASH 3D | Copyright (c) 2026 Steven Tayllon teixeira Jerônimo De Melos | https://dino-dash-3d-six.vercel.app | Todos os direitos reservados -->\n';

function proprietaryBannerPlugin() {
  return {
    name: 'dino-proprietary-banner',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.includes('Steven Tayllon teixeira Jerônimo De Melos | https://dino-dash-3d-six.vercel.app')
        ? html
        : `${LEGAL_BANNER_HTML}${html}`;
    },
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'chunk' && asset.fileName.endsWith('.js')) {
          asset.code = `${LEGAL_BANNER_JS}${asset.code}`;
        } else if (asset.type === 'asset' && asset.fileName.endsWith('.css') && typeof asset.source === 'string') {
          asset.source = `${LEGAL_BANNER_JS}${asset.source}`;
        }
      }
    }
  };
}

const lanProxy = {
  '/api/lan-info': 'http://127.0.0.1:5174',
  '/api/rooms': 'http://127.0.0.1:5174',
  '/ws': {
    target: 'ws://127.0.0.1:5174',
    ws: true
  }
};

export default defineConfig({
  plugins: [proprietaryBannerPlugin()],
  server: {
    host: true,
    port: 5173,
    open: false,
    watch: {
      ignored: ['**/*.md']
    },
    proxy: lanProxy
  },
  preview: {
    host: true,
    port: 4173,
    proxy: lanProxy
  },
  esbuild: {
    legalComments: 'none'
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1050,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/qrcode')) return 'vendor-net';
          if (id.includes('/src/content/') || id.includes('\\src\\content\\')) return 'game-content';
          if (id.includes('ClaudeVoxelModels') || id.includes('VoxelLibrary') || id.includes('BossModels') || id.includes('PredatorModels')) return 'game-models';
          if (id.includes('/src/ui/') || id.includes('\\src\\ui\\')) return 'game-ui';
        }
      }
    }
  }
});
