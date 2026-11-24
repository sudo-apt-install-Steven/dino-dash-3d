import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_15_DICE_TYPES,
  DICE_FACE_COUNTS,
  parseDiceNotation,
  evaluateDiceExpression,
  sanitizeReachableCheck,
  runChiSquaredUniformityTest
} from '../src/dice/DiceNotationParser.js';
import {
  DICE_SKINS_CATALOG,
  TRAY_SURFACES,
  buildSculptedDiceTray3D,
  renderDie2DFallbackSVG
} from '../src/dice/DiceSkins.js';
import {
  RPG_UI_STATES,
  TabletopStateMachine
} from '../src/rpg/TabletopStateMachine.js';
import {
  RPG_ILLUSTRATED_BIOMES,
  renderCollectibleCardHTML
} from '../src/rpg/SceneIllustrator2D.js';
import {
  DEFAULT_WORLD_NODES,
  DEFAULT_WORLD_EDGES
} from '../src/rpg/IllustratedMap2D.js';
import {
  DINO_PRESET_LIBRARY,
  generateDinoPresetFromLore,
  buildDinoModelFromPreset
} from '../src/rpg/DinoPresetBuilder.js';
import {
  OPEN_WORLD_ENTITIES_CATALOG,
  buildOpenWorldSculptedEntity,
  animateOpenWorldEntity
} from '../src/openworld/OpenWorldSculptedModels.js';
import {
  FIGHTING_MOVES,
  FIGHTING_COMBO_TABLE,
  FightingAnimator,
  computeFightingCameraPose
} from '../src/arena/FightingAnimator.js';
import {
  DINO_WEAPONS_CATALOG,
  attachWeaponToDinoModel
} from '../src/arena/DinoWeapons.js';
import {
  MIN_DINO_ALPHA_SOLO,
  MIN_DINO_ALPHA_MULTIPLAYER,
  clampDinoAlpha,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb
} from '../src/ui/ColorStudioPicker.js';
import {
  detectGamepadFamilyFromId,
  renderGamepadButtonSVG
} from '../src/systems/GamepadVisuals.js';

const ROOT = path.resolve(import.meta.dirname, '..');

test('Design System & GPU Motion tokens enforce zinc-950 depth and transform/opacity hardware acceleration', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/styles/design-tokens.css'), 'utf8');
  assert.match(css, /--dd-void:\s*#09090b/);
  assert.match(css, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  assert.match(css, /overscroll-behavior-y:\s*contain/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('Parte 2.7 Chi-Squared Uniformity Test: 10,000 cryptographic rolls PASS on ALL 15 dice (D2 to D100)', () => {
  assert.equal(ALL_15_DICE_TYPES.length, 15);
  for (const die of ALL_15_DICE_TYPES) {
    const sides = DICE_FACE_COUNTS[die];
    const res = runChiSquaredUniformityTest(sides, 10000);
    assert.equal(res.pass, true, `${die} failed Chi-Squared uniformity: chi2=${res.chi2} > crit=${res.criticalValue}`);
  }
});

test('Parte 2.7 Dice Notation Parser handles 2d6+3, 4d6dl1/kh3, adv/dis, exploding (!), reroll, and enforces <= 20 dice', () => {
  const p1 = evaluateDiceExpression('2d6+3', () => 4);
  assert.equal(p1.total, 11);

  let seq = [2, 6, 5, 4];
  const p2 = evaluateDiceExpression('4d6dl1', () => seq.shift());
  assert.equal(p2.total, 15);
  assert.equal(p2.dice.filter((d) => d.kept).length, 3);

  let advSeq = [5, 19];
  const p3 = evaluateDiceExpression('1d20adv+2', () => advSeq.shift());
  assert.equal(p3.total, 21);

  let expSeq = [8, 8, 3];
  const p4 = evaluateDiceExpression('1d8!', () => expSeq.shift());
  assert.equal(p4.total, 19);

  assert.throws(() => parseDiceNotation('25d6'), /Máximo de 20 dados/);
});

test('Parte 2.1 RPG Bug Fixes: zero unreachable DCs (no CD 10 on D8+0!) + Anti-Flicker State Machine + non-repeating options', () => {
  // Antes pedia 10 num D8 sem bônus -> impossível! Agora clampa para <= 8 e calcula probabilidade real > 0!
  const fixed = sanitizeReachableCheck({ dieType: 'd8', count: 1, modifier: 0, dc: 10 });
  assert.equal(fixed.dc, 8);
  assert.equal(fixed.wasClamped, true);
  assert.ok(fixed.probability > 0 && fixed.probability <= 1);

  const sm = new TabletopStateMachine();
  sm.presentScene({ narration: 'Você entra na clareira jurássica.' });
  const snap1 = sm.getSnapshot();
  assert.equal(snap1.phase, RPG_UI_STATES.CHOOSING);
  assert.ok(snap1.visibleOptions.length >= 3);
  const firstSig = snap1.visibleOptions.map((o) => o.label).join('|');

  // Inicia rolagem -> opções somem imediatamente e tentativa de trocar opções durante o giro é BLOQUEADA!
  const check = sm.beginActionRoll(snap1.visibleOptions[0]);
  assert.ok(check);
  assert.equal(sm.getSnapshot().phase, RPG_UI_STATES.ROLLING);
  assert.equal(sm.getSnapshot().visibleOptions.length, 0);
  assert.equal(sm.presentScene({ narration: 'Intrusão indevida no meio da rolagem!' }), false);

  // Finaliza rolagem e avança -> novas opções NÃO repetem o conjunto anterior
  sm.completeRoll({ total: 16, isCrit: false, isFumble: false }, 'Sucesso firme!');
  assert.equal(sm.getSnapshot().phase, RPG_UI_STATES.OUTCOME);
  sm.advanceToNextScene({ narration: 'Uma caverna de cristais surge adiante.', rawOptions: snap1.visibleOptions });
  const secondSig = sm.getSnapshot().visibleOptions.map((o) => o.label).join('|');
  assert.notEqual(secondSig, firstSig);
});

test('Parte 2.7 Dice Skins (13 PBR finishes), 3D Tray & 2D SVG Fallback work cleanly', () => {
  assert.equal(DICE_SKINS_CATALOG.length, 13);
  assert.ok(TRAY_SURFACES.felt && TRAY_SURFACES.wood && TRAY_SURFACES.leather);
  const tray = buildSculptedDiceTray3D('felt');
  assert.ok(tray.children.length >= 9);
  const svg = renderDie2DFallbackSVG('d20', 20, 'royal_gold');
  assert.match(svg, /<svg/);
  assert.match(svg, />20</);
});

test('Partes 3 & 4 Scene Illustrator (12 biomes + collectible cards), Cartographic Map & Lore Dino Preset Builder', () => {
  assert.equal(Object.keys(RPG_ILLUSTRATED_BIOMES).length, 12);
  const cardHtml = renderCollectibleCardHTML({ name: 'Garra Solar', rarity: 'lendario', effect: '+3 Ataque' });
  assert.match(cardHtml, /Garra Solar/);
  assert.ok(DEFAULT_WORLD_NODES.length >= 8 && DEFAULT_WORLD_EDGES.length >= 8);

  const stealthPreset = generateDinoPresetFromLore('Cresci nas sombras como um raptor ágil e furtivo caçador noturno.');
  assert.equal(stealthPreset.species, 'raptor');
  assert.equal(stealthPreset.archetype, 'Batedor');
  const model = buildDinoModelFromPreset(stealthPreset);
  assert.ok(model.root && model.anchors && DINO_PRESET_LIBRARY.sizes.length === 5);
});

test('Parte 5 Open World Sculpted Entities replace legacy primitives with multi-part articulated meshes & full metadata', () => {
  for (const [id, meta] of Object.entries(OPEN_WORLD_ENTITIES_CATALOG)) {
    assert.ok(meta.name && meta.description && meta.effect && meta.usageTip, `${id} missing metadata`);
    const entity = buildOpenWorldSculptedEntity(id);
    let meshCount = 0;
    entity.traverse((o) => { if (o.isMesh) meshCount++; });
    assert.ok(meshCount >= 4, `${id} must be multi-part sculpted (got ${meshCount} meshes), never a single primitive`);
    animateOpenWorldEntity(entity, 1.25, { moving: true, attacking: true });
  }
});

test('Parte 6 Arena X1 Fighting Animator, Combos, Dino Weapons, Family Mode & 2.5D Camera', () => {
  const dino = buildDinoModelFromPreset({ species: 'trex', size: 'medium' });
  for (const wId of Object.keys(DINO_WEAPONS_CATALOG)) {
    const attached = attachWeaponToDinoModel(dino, wId);
    assert.ok(attached, `Weapon ${wId} failed to attach`);
  }

  const fighter = new FightingAnimator(dino, { dinoId: 'trex', weaponSpec: DINO_WEAPONS_CATALOG.iron_claws, familyMode: true });
  assert.equal(fighter.startMove('light', 50).started, true);
  // Avança até fase active para permitir cancelamento em combo L -> M -> H!
  fighter.update(6 / 60);
  assert.equal(fighter.getPhase(), 'active');
  assert.equal(fighter.startMove('medium', 50).started, true);
  fighter.update(10 / 60);
  const resH = fighter.startMove('heavy', 50);
  assert.equal(resH.started, true);
  assert.equal(resH.matchedCombo?.id, 'apex_crusher');
  assert.ok(FIGHTING_MOVES.super && FIGHTING_COMBO_TABLE.length >= 4);

  const cam = computeFightingCameraPose({ x: -3, z: 0 }, { x: 3, z: 0 }, { cinematicZoom: 0.25, trauma: 0.3, time: 1.0 });
  assert.ok(Number.isFinite(cam.position.x) && cam.fov < 50);
});

test('Partes 7 & 8 Color Studio anti-invisibility alpha clamp & Gamepad Xbox/PS/Switch SVG glyphs', () => {
  assert.equal(clampDinoAlpha(0, { multiplayer: false }), MIN_DINO_ALPHA_SOLO);
  assert.equal(clampDinoAlpha(0.1, { multiplayer: true }), MIN_DINO_ALPHA_MULTIPLAYER);

  const rgb = hexToRgb('#f59e0b');
  const hsl = rgbToHsl(rgb);
  const roundtrip = rgbToHex(hslToRgb(hsl));
  assert.match(roundtrip, /^#[0-9a-f]{6}$/);

  assert.equal(detectGamepadFamilyFromId('Sony Interactive Entertainment Wireless Controller DualSense'), 'playstation');
  assert.equal(detectGamepadFamilyFromId('Nintendo Switch Pro Controller (057e)'), 'switch');
  assert.equal(detectGamepadFamilyFromId('Xbox 360 Controller (XInput STANDARD GAMEPAD)'), 'xbox');

  const psCross = renderGamepadButtonSVG('south', { family: 'playstation' });
  const swB = renderGamepadButtonSVG('south', { family: 'switch' });
  assert.match(psCross, /<path/);
  assert.match(swB, />B</);
});
