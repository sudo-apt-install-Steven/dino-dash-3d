// Verificador automatizado de Orçamento de Performance & Bundle no CI.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const distAssets = path.resolve(process.cwd(), 'dist', 'assets');
assert.ok(fs.existsSync(distAssets), 'dist/assets directory must exist (run npm run build first)');

const files = fs.readdirSync(distAssets);
let totalCssKB = 0;
let maxJsChunkKB = 0;

for (const file of files) {
  const full = path.join(distAssets, file);
  const sizeKB = fs.statSync(full).size / 1024;
  if (file.endsWith('.css')) {
    totalCssKB += sizeKB;
  } else if (file.endsWith('.js')) {
    if (sizeKB > maxJsChunkKB) maxJsChunkKB = sizeKB;
    if (file.startsWith('vendor-three-')) {
      assert.ok(sizeKB <= 600, `vendor-three chunk exceeded budget: ${sizeKB.toFixed(1)} KB > 600 KB`);
    } else if (file.startsWith('vendor-net-')) {
      assert.ok(sizeKB <= 320, `vendor-net chunk exceeded budget: ${sizeKB.toFixed(1)} KB > 320 KB`);
    } else {
      assert.ok(sizeKB <= 1050, `JS chunk ${file} exceeded budget: ${sizeKB.toFixed(1)} KB > 1050 KB`);
    }
  }
}

assert.ok(totalCssKB <= 100, `Total CSS exceeded budget: ${totalCssKB.toFixed(1)} KB > 100 KB`);
console.log(`✔ Performance budget PASS (max JS chunk: ${maxJsChunkKB.toFixed(1)} KB, total CSS: ${totalCssKB.toFixed(1)} KB)`);
