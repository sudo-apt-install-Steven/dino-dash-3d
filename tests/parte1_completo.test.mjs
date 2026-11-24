import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { generateRandomDinoNick } from '../src/systems/Save.js';
import { getOAuthRedirectUrl, translateAuthError, AuthProfile } from '../src/systems/AuthProfile.js';
import { DINO_CATALOG } from '../src/dinos/DinoCatalog.js';
import { DinoFactory } from '../src/dinos/DinoFactory.js';
import { computeDinoAnchorPoints, resolveAccessoryAnchorKey, POSTURE_TYPES } from '../src/dinos/DinoAnchors.js';
import { SCULPTED_ACCESSORY_IDS, getAccessorySlot } from '../src/models/VoxelAccessories.js';
import { BIOMES } from '../src/world/Biomes.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('1.1 main.css defines custom slim themed scrollbars (Firefox + WebKit)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/main.css'), 'utf8');
  assert.match(css, /scrollbar-width\s*:\s*thin/);
  assert.match(css, /scrollbar-color\s*:/);
  assert.match(css, /::-webkit-scrollbar\b/);
  assert.match(css, /::-webkit-scrollbar-thumb\b/);
  assert.match(css, /::-webkit-scrollbar-track\b/);
});

test('1.2 & 1.3 Game.js cleans up free 3D modes, restores camera & resets modeId on openMainMenu', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/game/Game.js'), 'utf8');
  assert.match(src, /_returnModeId/);
  assert.match(src, /#mode3d-overlay/);
  assert.match(src, /\.m3d-dice-layer/);
  assert.match(src, /camera\.fov\s*=\s*Number\(Save\.data\.settings\?\.fov\)\s*\|\|\s*58/);
  assert.match(src, /camera\.updateProjectionMatrix\(\)/);
  assert.match(src, /this\.modeId\s*===\s*'arena_x1'/);
  assert.match(src, /this\.input\?\.reset\?\.\(\)/);
});

test('1.4 generateRandomDinoNick returns fun random nicknames <= 16 chars and never leftover test strings', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const nick = generateRandomDinoNick();
    assert.equal(typeof nick, 'string');
    assert.ok(nick.length >= 6 && nick.length <= 16, `unexpected nick length: ${nick}`);
    assert.match(nick, /^[A-Za-z0-9]+$/);
    assert.doesNotMatch(nick, /steven|teste|guest|convidado/i);
    seen.add(nick);
  }
  assert.ok(seen.size >= 30, `expected high uniqueness, got ${seen.size}`);
});

test('1.4 Save.js sanitizes leftover test nicknames like "steven teste" on load', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/systems/Save.js'), 'utf8');
  assert.match(src, /resolveCleanDefaultNick/);
  assert.match(src, /steven\\s\*teste/i);
});

test('1.5 OAuth & Auth: PKCE config, PT-BR error translations, linked identities, LGPD export & setup doc', () => {
  const transportSrc = fs.readFileSync(path.join(ROOT, 'src/net/TransportSupabase.js'), 'utf8');
  assert.match(transportSrc, /flowType\s*:\s*'pkce'/);
  assert.match(transportSrc, /detectSessionInUrl\s*:\s*true/);

  assert.equal(getOAuthRedirectUrl(), 'https://dino-dash-3d-six.vercel.app/');
  assert.match(translateAuthError('Unsupported provider: provider is not enabled', 'google'), /Google.*Supabase Auth/i);
  assert.match(translateAuthError('Manual linking is disabled', 'discord'), /Enable Manual Linking/i);
  assert.match(translateAuthError('Invalid login credentials'), /inválidos/i);

  const linked = AuthProfile.getLinkedIdentities({
    identities: [{ provider: 'google' }, { provider: 'discord' }],
    app_metadata: { provider: 'google' }
  });
  assert.equal(linked.google, true);
  assert.equal(linked.discord, true);

  const exported = AuthProfile.exportPersonalDataLGPD();
  assert.equal(exported.ok, true);
  assert.equal(exported.payload.schema, 'dino-dash-3d-lgpd-export-v1');

  const doc = fs.readFileSync(path.join(ROOT, 'docs/CONFIGURACAO_OAUTH.md'), 'utf8');
  assert.match(doc, /https:\/\/nldbezalwdsapxfjkyww\.supabase\.co\/auth\/v1\/callback/);
  assert.match(doc, /https:\/\/dino-dash-3d-six\.vercel\.app/);
  assert.match(doc, /http:\/\/localhost:5173/);
});

test('1.6 Anchor Points: spike_collar mounts on neckPivot and backpack sits squarely on dorsal back (NEVER on tail) across ALL dinos', () => {
  assert.ok(DINO_CATALOG.length >= 63);
  const posturesSeen = new Set();

  for (const spec of DINO_CATALOG) {
    // Testa coleira de espinhos + mochila simultaneamente em TODOS os 63+ dinos
    const model = DinoFactory.build(spec.id, {
      accessories: ['crown', 'glasses', 'spike_collar', 'backpack', 'spikes', 'aura_fire']
    }, { allowHybrid: false });

    assert.ok(model.anchors, `${spec.id} must expose anchors`);
    assert.ok(POSTURE_TYPES.includes(model.posture), `${spec.id} invalid posture ${model.posture}`);
    posturesSeen.add(model.posture);

    // 1) Coleira de espinhos DEVE estar anexada ao neckPivot (não flutuando no torso!)
    const collar = model.neckPivot.children.find((ch) => ch.userData?.accessoryId === 'spike_collar');
    assert.ok(collar, `${spec.id}: spike_collar must be mounted on neckPivot`);
    assert.equal(collar.userData.anchorKey, 'neck');
    assert.ok(Number.isFinite(collar.position.y) && collar.position.y > 0, `${spec.id}: collar Y valid`);

    // 2) Mochila DEVE estar montada no torso SOBRE AS COSTAS (z centro bem à frente do início da cauda!)
    const pack = model.torso.children.find((ch) => ch.userData?.accessoryId === 'backpack');
    assert.ok(pack, `${spec.id}: backpack must be mounted on torso`);
    assert.equal(pack.userData.anchorKey, 'backPack');
    assert.ok(pack.position.z <= 0.05, `${spec.id}: backpack anchor Z (${pack.position.z}) must be on dorsal back, not tail`);
    assert.ok(pack.rotation.x <= -1.2, `${spec.id}: backpack must lie along dorsal back (rotX=${pack.rotation.x})`);

    // Verifica BoundingBox local da mochila no espaço do torso: nunca invade o rabo além do final do dorso!
    model.root.updateMatrixWorld(true);
    const invTorso = new THREE.Matrix4().copy(model.torso.matrixWorld).invert();
    const packBox = new THREE.Box3().setFromObject(pack).applyMatrix4(invTorso);
    const center = new THREE.Vector3();
    packBox.getCenter(center);
    assert.ok(center.y >= 0.35, `${spec.id}: backpack center Y (${center.y.toFixed(2)}) must rest ON TOP of back`);
    assert.ok(center.z <= 0.35, `${spec.id}: backpack center Z (${center.z.toFixed(2)}) must NOT sit on the tail`);
  }

  assert.ok(posturesSeen.size >= 4, `expected >= 4 distinct postures verified, got ${[...posturesSeen].join(',')}`);
});

test('1.6 Every sculpted accessory resolves to a valid anchor key and mounts cleanly across postures', () => {
  const sampleDinos = ['trex', 'triceratops', 'stegosaurus', 'brachiosaurus', 'spinosaurus', 'mosasaurus', 'quetzalcoatlus', 'archelon', 'scary_monsters'];
  for (const dinoId of sampleDinos) {
    for (const accId of SCULPTED_ACCESSORY_IDS) {
      const slot = getAccessorySlot(accId);
      const key = resolveAccessoryAnchorKey(slot, accId);
      const anchors = computeDinoAnchorPoints({ bodyId: dinoId });
      assert.ok(anchors[key], `${dinoId}/${accId} resolved missing anchor key ${key}`);
    }
  }
});

test('1.7 Real 3D biome preview renderer is wired into Menus.js and MultiplayerLobby.js', () => {
  const rendererSrc = fs.readFileSync(path.join(ROOT, 'src/world/BiomePreviewRenderer.js'), 'utf8');
  assert.match(rendererSrc, /renderBiomeThumbnailsBatch/);
  assert.match(rendererSrc, /buildBiomeDioramaScene/);
  assert.match(rendererSrc, /WebGLRenderer/);

  const menusSrc = fs.readFileSync(path.join(ROOT, 'src/ui/Menus.js'), 'utf8');
  assert.match(menusSrc, /BiomePreviewRenderer/);
  assert.match(menusSrc, /biome-thumb-3d/);

  const lobbySrc = fs.readFileSync(path.join(ROOT, 'src/ui/MultiplayerLobby.js'), 'utf8');
  assert.match(lobbySrc, /BiomePreviewRenderer/);
  assert.match(lobbySrc, /mp-biome-thumb/);

  assert.ok(BIOMES.length >= 30);
});
