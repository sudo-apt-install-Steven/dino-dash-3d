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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 40 },
            { name: 'vendor-net', test: /[\\/]node_modules[\\/](@supabase|qrcode)[\\/]/, priority: 40 },
            { name: 'modes-3d', test: /[\\/]src[\\/]modes[\\/]/, priority: 30 },
            { name: 'voxel-ultra', test: /(VoxelAccessories|LimitedDinoModels|DungeonProps)/, priority: 30 },
            { name: 'ultra-content', test: /(ultra_catalog|dungeon_catalog|limited_dinos|extra_biomes)/, priority: 30 },
            { name: 'game-content', test: /[\\/]src[\\/]content[\\/]/, priority: 20 },
            { name: 'game-models', test: /(ClaudeVoxelModels|VoxelLibrary|BossModels|PredatorModels)/, priority: 25 },
            { name: 'game-ui-screens', test: /(CustomizationScreen|SelectionScreen)/, priority: 25 },
            { name: 'game-ui', test: /[\\/]src[\\/]ui[\\/]/, priority: 15 }
          ]
        }
      }
    }
  }
});
