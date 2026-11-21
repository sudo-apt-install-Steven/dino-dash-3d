"""Multi-Persona Real Playwright Simulation Audit for Dino Dash 3D.

Runs against `vite preview --port 4186 --host 127.0.0.1` and simulates ALL 6 Real User Personas:
  Persona 1: Criança / Iniciante Total (Auto First-Run Mini-Tutorial, Aura Vermelha, Glossário, Pular Tutorial -> continues run, Normal obstacles with visible red danger aura)
  Persona 2: Gamer Avançado (Search "Scary Monsters", Modo Pessoal ON, Infecção Jurássica [Space], 1-click Masmorra RPG [C] camera + Fog-of-War + Hero Sheet + Weapon bar + DM [E] suggestions + custom action + DC + "Precisa tirar" + 3D dice + 6-tier outcome banner, 1-click Mundo Aberto Radar + NPCs + Fruits + Regional Bosses + Camera toggle)
  Persona 3: Testador Aquático & Híbrido (spinosaurus & mosasaurus in abyss_submerged / underwater dive, captures spino_underwater.png & mosa_underwater.png, verifies mosasaurus 100% O2 Brânquias for 4+s & spinosaurus slow Fôlego Anfíbio drain)
  Persona 4: Adulto Casual (Top menu Entrar / Criar Conta pill -> Nick + Senha no required email -> nick validation -> stubbed nick-login register -> 2nd registration immediate 1-account-per-PC block)
  Persona 5: Celular Fraco (360x740 Low-Spec -> Main Menu, Solo, Masmorra RPG, Mundo Aberto -> zero overflow/clipping, FPS >= 50, touch buttons visible & non-overlapping)
  Persona 6: Red Team / Atacante (SQLi & XSS in Account nick field blocked + zero script execution; God-mode exploit in Dungeon RPG DM blocked with possible: false)

Captures screenshots in `docs/persona-audit/` for visual inspection.
"""

import json
import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

PORT = 4186
URL = f"http://127.0.0.1:{PORT}/"
OUT_DIR = Path("docs/persona-audit")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def wait_for_server(url, timeout=25.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.25)
    return False


def start_preview_server():
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vite", "preview", "--port", str(PORT), "--host", "127.0.0.1", "--strictPort"]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )
    if not wait_for_server(URL, timeout=25.0):
        stop_preview_server(proc)
        raise RuntimeError(f"Preview server did not start on {URL}")
    return proc


def stop_preview_server(proc):
    if not proc:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    except Exception:
        try:
            proc.terminate()
        except Exception:
            pass


def measure_fps(page, duration_ms=1600):
    return page.evaluate(f"""() => new Promise(resolve => {{
      const times = [];
      let last = performance.now();
      const start = last;
      function step(now) {{
        times.push(now - last);
        last = now;
        if (now - start >= {duration_ms}) {{
          const valid = times.slice(1).filter(t => t > 0 && t < 500);
          const avgDt = valid.reduce((a, b) => a + b, 0) / Math.max(1, valid.length);
          resolve({{ frames: valid.length, avgFps: +(1000 / Math.max(1, avgDt)).toFixed(1) }});
        }} else {{
          requestAnimationFrame(step);
        }}
      }}
      requestAnimationFrame(step);
    }})""")


def attach_common_routes(page):
    page.route("**/api/lan-info*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"ok":false,"ips":[]}'))
    page.route("**/api/rooms*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"ok":true,"rooms":[]}'))
    page.route("**/functions/v1/ai-dungeon-master*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"fallback":true}'))


def check_layout_overflow(page):
    return page.evaluate("""() => {
      const docEl = document.documentElement;
      const body = document.body;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const horizOverflow = Math.max(docEl.scrollWidth, body.scrollWidth) - vw;
      // Also check any visible fixed/modal panels that spill off-screen horizontally
      const clipped = [];
      for (const el of document.querySelectorAll('.chunky-panel, .main-menu-panel, .modal-card, .m3d-dng-top, .m3d-ow-radar-wrap')) {
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.left < -4 || r.right > vw + 4) {
          clipped.push({ cls: el.className, left: Math.round(r.left), right: Math.round(r.right), vw });
        }
      }
      return { vw, vh, horizOverflow, clipped };
    }""")


def run_persona_1_kid_beginner(browser, errors):
    print("[Persona 1] Criança / Iniciante Total...")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    attach_common_routes(page)
    page.on("pageerror", lambda e: errors.append(f"P1 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P1 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-play", timeout=15000)
    page.wait_for_timeout(350)

    # Fresh save -> click Play Now
    page.locator("#menu-play").click()
    page.wait_for_selector("#hud-tutorial-box:not(.hidden)", timeout=8000)
    page.wait_for_timeout(300)

    tut_text = page.locator("#hud-tutorial-box").inner_text()
    assert "AURA VERMELHA" in tut_text.upper() and "PERIGO" in tut_text.upper(), f"Missing red danger aura text in tutorial: {tut_text}"
    assert "Buff" in tut_text and "Debuff" in tut_text and "Estamina" in tut_text, f"Missing Buff/Debuff/Estamina in tutorial: {tut_text}"
    page.screenshot(path=str(OUT_DIR / "p1_tutorial_intro.png"))

    # Click Glossário button inside tutorial box
    page.locator("#tut-glossary-btn").click()
    page.wait_for_selector("#glossary-overlay:not(.hidden)", timeout=5000)
    page.wait_for_timeout(200)
    glossary_text = page.locator("#glossary-overlay").inner_text()
    for kw in ["Aura Vermelha", "Buff", "Debuff", "Estamina", "Brânquias"]:
        assert kw in glossary_text, f"Glossary missing kid-friendly term '{kw}'"
    page.screenshot(path=str(OUT_DIR / "p1_glossary.png"))

    # Close Glossary
    page.locator("#btn-glossary-close").click()
    page.wait_for_timeout(200)
    assert not page.locator("#glossary-overlay").is_visible(), "Glossary did not close"

    # Skip tutorial -> MUST continue run smoothly (NOT kick back to menu!)
    page.locator("#tut-skip").click()
    page.wait_for_timeout(450)
    state_after_skip = page.evaluate("""() => {
      const g = window.__DINO_DASH_GAME__;
      return {
        state: g?.state,
        tutActive: Boolean(g?.tutorialState?.active),
        menuVisible: Boolean(document.querySelector('#menu-play') && document.querySelector('#menu-play').offsetParent !== null)
      };
    }""")
    assert state_after_skip["state"] == "playing", f"Expected game to keep playing after skip tutorial, got: {state_after_skip}"
    assert not state_after_skip["menuVisible"], "Skip tutorial kicked player back to main menu!"
    assert not state_after_skip["tutActive"], "Tutorial stayed active after skip!"

    # Run until at least 2 hazard obstacles spawn on Normal difficulty and inspect for red danger aura & visible size (no tiny pebbles)
    obs_audit = None
    for _ in range(12):
        page.wait_for_timeout(500)
        obs_audit = page.evaluate("""() => {
          const g = window.__DINO_DASH_GAME__;
          if (g?.players?.[0]) g.players[0].invulnTimer = 2.0;
          const obs = g?.spawner?.getActiveObstacles?.() || [];
          const HELPFUL_KINDS = new Set([
            'egg', 'powerup', 'fruit', 'elemental_egg', 'treasure', 'ramp', 'speed_pad',
            'trampoline', 'campfire', 'shortcut', 'grapple_point', 'gravity_zone',
            'minecart_zone', 'river_log', 'bifurcation', 'oasis_zone', 'rescue_cross',
            'shop_gate', 'oxygen_bubble', 'current_ring', 'fragile_bridge'
          ]);
          let total = 0;
          let withDangerAura = 0;
          let visibleDangerAura = 0;
          let tinyPebbles = 0;
          const samples = [];
          for (const o of obs) {
            if (!o || o.hit || HELPFUL_KINDS.has(o.kind)) continue;
            total++;
            const hasAura = (o.dangerVisuals && o.dangerVisuals.length > 0) ||
              Boolean(o.group?.getObjectByName?.('universal_danger_aura'));
            if (hasAura) withDangerAura++;
            const visAura = (o.dangerVisuals && o.dangerVisuals.some(v => v.visible)) ||
              Boolean(o.group?.getObjectByName?.('universal_danger_aura')?.visible);
            if (visAura) visibleDangerAura++;
            const height = (o.maxY ?? 1) - (o.minY ?? 0);
            const width = (o.halfW ?? 0.5) * 2;
            if (height < 0.35 && width < 0.35) tinyPebbles++;
            if (samples.length < 6) {
              samples.push({ kind: o.kind, height: +height.toFixed(2), width: +width.toFixed(2), hasAura, visAura });
            }
          }
          return {
            difficulty: g?.spawner?.difficultyId,
            showRedHazardSignage: Boolean(g?.spawner?.showRedHazardSignage),
            total,
            withDangerAura,
            visibleDangerAura,
            tinyPebbles,
            samples
          };
        }""")
        if obs_audit["total"] >= 2:
            break
    page.screenshot(path=str(OUT_DIR / "p1_normal_obstacles.png"))
    assert obs_audit["difficulty"] == "normal", f"Expected normal difficulty, got: {obs_audit}"
    assert obs_audit["showRedHazardSignage"], f"Red hazard signage disabled on Normal: {obs_audit}"
    assert obs_audit["total"] >= 1, f"Expected hazard obstacles spawned in Normal run, got: {obs_audit}"
    assert obs_audit["visibleDangerAura"] == obs_audit["total"], f"Some Normal obstacles missing visible red danger aura: {obs_audit}"
    assert obs_audit["tinyPebbles"] == 0, f"Found invisible tiny pebbles on Normal: {obs_audit}"

    ctx.close()
    return {
        "tutorial_verified": True,
        "glossary_verified": True,
        "skip_continues_run": True,
        "obstacles": obs_audit
    }


def run_persona_2_advanced_gamer(browser, errors):
    print("[Persona 2] Gamer Avançado...")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script("""(() => {
      localStorage.setItem('dino_dash_3d_save_v1', JSON.stringify({
        schemaVersion: 5,
        firstRunTutorialDone: true,
        tutorialDone: true,
        eggs: 25000,
        crystals: 15
      }));
    })();""")
    page = ctx.new_page()
    attach_common_routes(page)
    page.on("pageerror", lambda e: errors.append(f"P2 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P2 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-play", timeout=15000)
    page.wait_for_timeout(350)

    # 2A. SelectionScreen -> Search "Scary Monsters" -> verify featured scary_raptor unlocked -> Modo Pessoal ON
    page.locator('[data-nav="dinos"]').first.click()
    page.wait_for_selector("#sel-search", timeout=8000)
    page.wait_for_timeout(250)

    page.locator("#sel-search").fill("Scary Monsters")
    page.wait_for_timeout(250)
    assert page.locator("#sel-featured-scary").is_visible(), "Featured scary_raptor card not visible"
    scary_btn = page.locator('[data-dino-id="scary_raptor"]').first
    assert scary_btn.count() > 0 and scary_btn.is_visible(), "scary_raptor card not found when searching 'Scary Monsters'"

    # Toggle Modo Pessoal ON
    pnames_btn = page.locator("#sel-personal-names-btn")
    if "OFF" in pnames_btn.inner_text():
        pnames_btn.click()
        page.wait_for_timeout(250)
    assert "ON" in pnames_btn.inner_text(), f"Modo Pessoal did not toggle ON: {pnames_btn.inner_text()}"
    assert "Scary Monsters" in page.locator("#sel-modal-card").inner_text(), "Scary Monsters personal name not shown"

    # Equip scary_raptor
    page.locator("#sel-featured-scary-btn").click()
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT_DIR / "p2_scary_monsters_selection.png"))
    page.locator("#sel-close").click()
    page.wait_for_selector("#menu-play", timeout=8000)

    # 2B. Start Solo run with Scary Monsters & trigger [Space] Infecção Jurássica
    page.locator("#menu-play").click()
    page.wait_for_timeout(450)
    # Ensure ability is unlocked & charged without triggering predator intro cutscene
    page.evaluate("""() => {
      const g = window.__DINO_DASH_GAME__;
      if (g) {
        g.score = Math.max(g.score || 0, 650);
        if (g.events?.predators?.state === 'intro') {
          g.events.predators.skipIntro?.();
        }
        if (g.players?.[0]) {
          g.players[0].abilityCharge = 100;
          g.players[0].abilityCd = 0;
          g.players[0].abilityCooldown = 0;
        }
      }
    }""")
    page.wait_for_timeout(120)
    # If predator intro popped up on that frame, dismiss it first
    if page.evaluate("() => window.__DINO_DASH_GAME__?.events?.predators?.state === 'intro'"):
        page.keyboard.press("Space")
        page.wait_for_timeout(200)
    page.keyboard.press("Space")
    page.wait_for_timeout(350)
    ability_res = page.evaluate("""() => {
      const g = window.__DINO_DASH_GAME__;
      const p0 = g?.players?.[0];
      return {
        dinoId: p0?.id,
        abilityCharge: Math.round(p0?.abilityCharge ?? -1),
        abilityCooldown: +(p0?.abilityCooldown ?? 0).toFixed(2),
        turboTimer: +(p0?.turboTimer ?? 0).toFixed(2),
        invulnTimer: +(p0?.invulnTimer ?? 0).toFixed(2),
        abilityActive: Boolean((p0?.turboTimer ?? 0) > 0 || (p0?.abilityCooldown ?? 0) > 0 || (p0?.abilityCharge ?? 100) < 95)
      };
    }""")
    page.screenshot(path=str(OUT_DIR / "p2_scary_ability.png"))
    assert ability_res["dinoId"] == "scary_raptor", f"Expected scary_raptor equipped, got: {ability_res}"
    assert ability_res["abilityActive"], f"Infecção Jurássica did not trigger on [Space]: {ability_res}"

    # Return to Main Menu
    page.evaluate("() => window.__DINO_DASH_GAME__?.openMainMenu?.()")
    page.wait_for_selector("#menu-play", timeout=8000)
    page.wait_for_timeout(250)

    # 2C. 1-click Masmorra RPG
    page.locator('[data-quick-mode="dungeon_rpg"]').click()
    page.wait_for_selector('[data-act="open-dm"]', timeout=10000)
    page.wait_for_timeout(500)

    # Verify camera preset cycling [C] (Isométrica / 3ª Pessoa / Topo)
    cam_btn = page.locator('[data-act="cam-cycle"]')
    cam_labels = [cam_btn.inner_text()]
    for _ in range(3):
        page.keyboard.press("KeyC")
        page.wait_for_timeout(160)
        cam_labels.append(cam_btn.inner_text())
    joined_cams = " | ".join(cam_labels)
    assert "Isométrica" in joined_cams and ("3ª Pessoa" in joined_cams or "Terceira" in joined_cams) and "Topo" in joined_cams, f"Camera presets missing: {cam_labels}"

    # Verify Fog-of-War minimap & Weapon bar & Hero Sheet
    assert page.locator('[data-minimap]').is_visible(), "Fog-of-War minimap not visible"
    assert page.locator('[data-mm-badge]').is_visible(), "Minimap badge not visible"
    weapon_bar_text = page.locator('[data-weapon-bar]').inner_text()
    assert len(weapon_bar_text) > 3, f"Weapon bar empty: {weapon_bar_text}"

    page.locator('[data-act="hero-sheet"]').click()
    page.wait_for_selector('[data-act="close-hero"]', timeout=5000)
    page.wait_for_timeout(150)
    page.locator('[data-act="close-hero"]').click()
    page.wait_for_timeout(150)

    # Open DM panel with [E]
    page.keyboard.press("KeyE")
    page.wait_for_selector('[data-rpg-panel]', state="visible", timeout=5000)
    page.wait_for_timeout(250)

    sugs_count = page.locator('[data-rpg-sugs] .m3d-sug-btn').count()
    assert sugs_count >= 3, f"Expected 3-4 clickable DM suggestions, got {sugs_count}"
    assert page.locator('[data-rpg-input]').is_visible(), "DM free-text input not visible"

    # Submit custom RPG action
    page.locator('[data-rpg-input]').fill("Atacar o inimigo com minhas garras jurássicas")
    page.locator('[data-rpg-send]').click()
    page.wait_for_selector('[data-rpg-ruling]', state="visible", timeout=8000)
    ruling_text = page.locator('[data-rpg-ruling]').inner_text()
    assert "Meta (CD)" in ruling_text and "precisa tirar" in ruling_text.lower(), f"Missing DC / 'Precisa tirar' in ruling: {ruling_text}"

    # Wait for 3D dice roll animation + 6-tier outcome banner
    page.wait_for_selector('[data-tier-banner]', state="visible", timeout=9000)
    tier_text = page.locator('[data-tier-banner]').inner_text()
    assert len(tier_text.strip()) > 3, f"Tier outcome banner empty: {tier_text}"
    page.screenshot(path=str(OUT_DIR / "p2_dungeon_rpg.png"))

    # Exit Dungeon RPG -> Main Menu
    page.locator('[data-act="exit"]').click()
    page.wait_for_selector("#menu-play", timeout=8000)
    page.wait_for_timeout(250)

    # 2D. 1-click Mundo Aberto
    page.locator('[data-quick-mode="adventure_open"]').click()
    page.wait_for_selector('[data-radar-wrap]', timeout=10000)
    page.wait_for_timeout(500)

    assert page.locator('[data-radar-disc]').is_visible(), "Open-World radar disc not visible"
    assert page.locator('[data-energy-counter]').is_visible(), "Fruits/Energy HUD not visible"
    assert page.locator('[data-obj-guard]').is_visible(), "Regional Bosses objective not visible"

    ow_state = page.evaluate("""() => {
      const m = window.__DINO_DASH_GAME__?.activeFreeMode;
      let fruitPickups = 0;
      if (m?.chunks && typeof m.chunks.values === 'function') {
        for (const ch of m.chunks.values()) {
          for (const pk of (ch.pickups || [])) {
            if (pk.kind === 'food' || pk.kind === 'fruit' || pk.foodId) fruitPickups++;
          }
        }
      }
      return {
        npcs: m?.npcs?.length || 0,
        bosses: m?.bosses?.length || 0,
        fruits: fruitPickups,
        camLabelBefore: document.querySelector('[data-cam-label]')?.textContent || ''
      };
    }""")
    assert ow_state["npcs"] >= 3, f"Expected >= 3 NPCs in Open World, got: {ow_state}"
    assert ow_state["bosses"] >= 3, f"Expected >= 3 Regional Bosses in Open World, got: {ow_state}"
    assert ow_state["fruits"] >= 3, f"Expected >= 3 Fruits/Foods in Open World chunks, got: {ow_state}"

    # Toggle Camera preset in Mundo Aberto
    page.locator('[data-act="cam-preset"]').click()
    page.wait_for_timeout(200)
    cam_label_after = page.locator('[data-cam-label]').inner_text()
    assert cam_label_after != ow_state["camLabelBefore"], f"Open-World camera preset did not toggle: {ow_state['camLabelBefore']} -> {cam_label_after}"
    page.screenshot(path=str(OUT_DIR / "p2_open_world.png"))

    page.locator('[data-act="exit"]').click()
    page.wait_for_selector("#menu-play", timeout=8000)

    ctx.close()
    return {
        "scary_monsters_unlocked_and_personal_mode": True,
        "scary_ability": ability_res,
        "dungeon_cameras": cam_labels,
        "dungeon_suggestions": sugs_count,
        "dungeon_tier_banner": tier_text.strip()[:80],
        "open_world": {**ow_state, "camLabelAfter": cam_label_after}
    }


def run_persona_3_aquatic_hybrid(browser, errors):
    print("[Persona 3] Testador Aquático & Híbrido (Z-Fighting & O2 Audit)...")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script("""(() => {
      localStorage.setItem('dino_dash_3d_save_v1', JSON.stringify({
        schemaVersion: 5,
        firstRunTutorialDone: true,
        tutorialDone: true,
        eggs: 50000,
        unlockedDinos: ['trex', 'velociraptor', 'spinosaurus', 'mosasaurus', 'plesiosaurus', 'scary_raptor']
      }));
    })();""")
    page = ctx.new_page()
    attach_common_routes(page)
    page.on("pageerror", lambda e: errors.append(f"P3 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P3 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-play", timeout=15000)
    page.wait_for_timeout(350)

    results = {}

    for dino_id, shot_name in [("spinosaurus", "spino_underwater.png"), ("mosasaurus", "mosa_underwater.png")]:
        # Select dino through real SelectionScreen UI
        page.locator('[data-nav="dinos"]').first.click()
        page.wait_for_selector("#sel-search", timeout=8000)
        page.locator("#sel-search").fill(dino_id)
        page.wait_for_timeout(200)
        page.locator(f'[data-dino-id="{dino_id}"]').first.click()
        page.wait_for_timeout(200)
        page.locator("#sel-confirm").click()
        page.wait_for_timeout(250)
        if page.locator("#sel-close").count() > 0 and page.locator("#sel-close").is_visible():
            page.locator("#sel-close").click()
        page.wait_for_selector("#menu-play", timeout=8000)
        page.wait_for_timeout(200)

        page.evaluate("""() => {
          const g = window.__DINO_DASH_GAME__;
          if (!g) return;
          g.setBiomeConfig?.('abyss_submerged');
          g.startRun(false, { biomeId: 'abyss_submerged' });
        }""")
        page.wait_for_timeout(300)
        # Dismiss predator intro cutscene so gameplay is actively running (not Vel 0.0x)
        page.evaluate("""() => {
          const g = window.__DINO_DASH_GAME__;
          g?.events?.predators?.skipIntro?.();
        }""")
        page.wait_for_timeout(200)
        if page.evaluate("() => window.__DINO_DASH_GAME__?.events?.predators?.state === 'intro'"):
            page.keyboard.press("Space")
            page.wait_for_timeout(200)
        # Hold S / ArrowDown briefly to ensure deep dive posture & full submersion
        page.keyboard.down("ArrowDown")
        samples = []
        for step in range(5):
            page.wait_for_timeout(950)
            snap = page.evaluate("""() => {
              const g = window.__DINO_DASH_GAME__;
              if (g?.events?.predators?.state === 'intro') g.events.predators.skipIntro?.();
              const p0 = g?.players?.[0];
              // Keep player alive from obstacles during 4.5s O2 measurement (without touching oxygen!)
              if (p0) p0.invulnTimer = 2.0;
              return {
                dino: p0?.id,
                physiology: p0?.aquaticPhysiology,
                inSubmerged: Boolean(p0?.inSubmerged),
                speed: +(g?.speed ?? 0).toFixed(1),
                oxygen: +(p0?.oxygen ?? -1).toFixed(2),
                hudLabel: document.querySelector('#lbl-oxygen')?.textContent || '',
                hudVisible: !document.querySelector('#hud-oxygen-pill')?.classList.contains('hidden')
              };
            }""")
            samples.append(snap)
            if step == 2:
                page.screenshot(path=str(OUT_DIR / shot_name))
        page.keyboard.up("ArrowDown")
        results[dino_id] = samples

        # Return to menu before next dino
        page.evaluate("() => window.__DINO_DASH_GAME__?.openMainMenu?.()")
        page.wait_for_selector("#menu-play", timeout=8000)
        page.wait_for_timeout(200)

    # Assert Mosasaurus: 100% O2 for 4+ seconds with Brânquias • Habitat Natural
    mosa_samples = results["mosasaurus"]
    assert all(s["physiology"] == "aquatic_gills" for s in mosa_samples), f"Mosasaurus wrong physiology: {mosa_samples}"
    assert all(s["oxygen"] == 100 for s in mosa_samples), f"Mosasaurus O2 drained underwater! {mosa_samples}"
    assert any("Brânquias" in s["hudLabel"] and "Habitat Natural" in s["hudLabel"] for s in mosa_samples), f"Mosasaurus HUD missing Brânquias • Habitat Natural: {mosa_samples}"

    # Assert Spinosaurus: amphibious_hybrid with slow Fôlego Anfíbio drain (~2.0/s -> after ~4.5s should be between 82 and 97, strictly < 100 and > 75)
    spino_samples = results["spinosaurus"]
    assert all(s["physiology"] == "amphibious_hybrid" for s in spino_samples), f"Spinosaurus wrong physiology: {spino_samples}"
    spino_end_o2 = spino_samples[-1]["oxygen"]
    assert 75.0 <= spino_end_o2 < 99.5, f"Spinosaurus amphibious drain unexpected (expected slow drain 75..99.5 after 4.5s): {spino_samples}"
    assert any("Fôlego Anfíbio" in s["hudLabel"] for s in spino_samples), f"Spinosaurus HUD missing 'Fôlego Anfíbio': {spino_samples}"

    ctx.close()
    return {
        "mosasaurus_final": mosa_samples[-1],
        "spinosaurus_start": spino_samples[0],
        "spinosaurus_final": spino_samples[-1]
    }


def run_persona_4_casual_adult_account(browser, errors):
    print("[Persona 4] Adulto Casual (Conta Sem E-mail + Limite 1/PC)...")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    attach_common_routes(page)

    nick_login_calls = []

    def handle_nick_login(route):
        req = route.request
        body = {}
        try:
            body = json.loads(req.post_data or "{}")
        except Exception:
            pass
        nick_login_calls.append(body)
        action = body.get("action")
        if action == "check_nick":
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True, "valid": True, "available": True, "message": "Apelido disponível!"})
            )
        elif action == "register":
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({
                    "ok": True,
                    "nickname": body.get("nickname"),
                    "message": f"Conta @{body.get('nickname')} criada sem e-mail com sucesso!"
                })
            )
        else:
            route.fulfill(status=200, content_type="application/json", body='{"ok":true}')

    page.route("**/functions/v1/nick-login*", handle_nick_login)
    page.on("pageerror", lambda e: errors.append(f"P4 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P4 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-account-pill", timeout=15000)
    page.wait_for_timeout(300)

    # Click top Main Menu pill "🔑 Entrar / Criar Conta"
    pill_text = page.locator("#menu-account-pill").inner_text()
    assert "Entrar / Criar Conta" in pill_text, f"Unexpected account pill text: {pill_text}"
    page.locator("#menu-account-pill").click()
    page.wait_for_selector('[data-asub="register"]', timeout=8000)
    page.wait_for_timeout(250)

    # Verify Account tab is active and ZERO required email input exists
    assert "active" in (page.locator('[data-ptab="account"]').get_attribute("class") or ""), "Account tab not active on open"
    assert page.locator('input[type="email"]').count() == 0, "Unexpected email input in no-email account modal!"

    # Switch to Register (Sem E-mail)
    page.locator('[data-asub="register"]').click()
    page.wait_for_selector("#auth-reg-nick", timeout=5000)
    assert page.locator('input[type="email"]').count() == 0, "Unexpected email input in register form!"

    # Type valid nick & wait for validation
    page.locator("#auth-reg-nick").fill("AdultoDino99")
    page.wait_for_timeout(550)
    nick_status = page.locator("#auth-nick-status").inner_text()
    assert "✅" in nick_status, f"Expected valid/available nick status, got: {nick_status}"

    # Fill password & submit registration (stubbed nick-login)
    page.locator("#auth-reg-pw").fill("SenhaForte2026!")
    page.locator("#auth-reg-pw2").fill("SenhaForte2026!")
    page.screenshot(path=str(OUT_DIR / "p4_register_form.png"))
    page.locator("#auth-reg-submit").click()
    page.wait_for_timeout(500)

    # After successful register, 1-account-per-PC marker MUST be set and register tab MUST block 2nd account immediately!
    block_text = page.locator(".modal-card").inner_text()
    page.screenshot(path=str(OUT_DIR / "p4_second_account_blocked.png"))
    assert "Limite de segurança: 1 conta por PC/navegador" in block_text, f"Missing 1-account-per-PC block notice: {block_text}"
    assert "AdultoDino99" in block_text, f"Registered nick not reflected in block notice: {block_text}"
    assert page.locator("#auth-reg-form").count() == 0, "Register form should be hidden/blocked after 1st account created on this PC!"

    # Also verify closing & reopening register still blocks locally
    page.locator("#prof-close").click()
    page.wait_for_selector("#menu-account-pill", timeout=5000)
    page.locator("#menu-account-pill").click()
    page.wait_for_selector('[data-asub="register"]', timeout=5000)
    page.locator('[data-asub="register"]').click()
    page.wait_for_timeout(200)
    assert page.locator("#auth-reg-form").count() == 0, "Register form re-appeared on reopen despite 1/PC limit!"
    assert page.locator("#auth-switch-to-login").is_visible(), "Missing 'Ir para Entrar' button on 1/PC block card!"

    ctx.close()
    return {
        "zero_email_inputs": True,
        "nick_status": nick_status,
        "nick_login_calls": [c.get("action") for c in nick_login_calls],
        "second_account_blocked_immediately": True
    }


def run_persona_5_lowspec_mobile(browser, errors):
    print("[Persona 5] Celular Fraco (360x740 Low-Spec)...")
    ctx = browser.new_context(
        viewport={"width": 360, "height": 740},
        has_touch=True,
        is_mobile=True,
        device_scale_factor=2
    )
    ctx.add_init_script("""(() => {
      localStorage.setItem('dino_dash_3d_save_v1', JSON.stringify({
        schemaVersion: 5,
        firstRunTutorialDone: true,
        tutorialDone: true,
        lowSpecMode: true,
        eggs: 10000
      }));
    })();""")
    page = ctx.new_page()
    attach_common_routes(page)
    page.on("pageerror", lambda e: errors.append(f"P5 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P5 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-play", timeout=15000)
    # Wait for initial loading splash to fade completely before capturing mobile menu
    page.wait_for_timeout(1200)

    # 5A. Main Menu overflow check
    menu_layout = check_layout_overflow(page)
    page.screenshot(path=str(OUT_DIR / "p5_mobile_menu.png"))
    assert menu_layout["horizOverflow"] <= 4 and len(menu_layout["clipped"]) == 0, f"Mobile Main Menu overflow/clipping: {menu_layout}"

    # 5B. Solo gameplay FPS + Touch buttons visible & non-overlapping
    page.locator("#menu-play").click()
    page.wait_for_timeout(500)
    page.evaluate("() => window.__DINO_DASH_GAME__?.events?.predators?.skipIntro?.()")
    page.wait_for_timeout(250)
    solo_fps = measure_fps(page, 1600)
    touch_audit = page.evaluate("""() => {
      const btns = Array.from(document.querySelectorAll('#touch-controls button')).filter(el => {
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || el.classList.contains('hidden')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const rects = btns.map(el => {
        const r = el.getBoundingClientRect();
        return {
          label: el.getAttribute('aria-label') || el.id || el.textContent.trim(),
          left: Math.round(r.left), top: Math.round(r.top),
          right: Math.round(r.right), bottom: Math.round(r.bottom),
          w: Math.round(r.width), h: Math.round(r.height)
        };
      });
      const overlaps = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ox > 3 && oy > 3) {
            overlaps.push({ a: a.label, b: b.label, ox, oy });
          }
        }
      }
      const offscreen = rects.filter(r => r.left < -2 || r.right > window.innerWidth + 2 || r.bottom > window.innerHeight + 2);
      return { count: rects.length, overlaps, offscreen, rects };
    }""")
    page.screenshot(path=str(OUT_DIR / "p5_mobile_solo.png"))
    assert solo_fps["avgFps"] >= 50, f"Mobile Low-Spec Solo FPS too low: {solo_fps}"
    assert touch_audit["count"] >= 3, f"Expected >= 3 visible touch buttons on mobile Solo, got: {touch_audit}"
    assert len(touch_audit["overlaps"]) == 0, f"Touch buttons overlapping on 360x740: {touch_audit['overlaps']}"
    assert len(touch_audit["offscreen"]) == 0, f"Touch buttons offscreen on 360x740: {touch_audit['offscreen']}"

    # Return to menu
    page.evaluate("() => window.__DINO_DASH_GAME__?.openMainMenu?.()")
    page.wait_for_selector("#menu-play", timeout=8000)
    page.wait_for_timeout(250)

    # 5C. Masmorra RPG at 360x740
    page.locator('[data-quick-mode="dungeon_rpg"]').click()
    page.wait_for_selector('[data-act="open-dm"]', timeout=10000)
    page.wait_for_timeout(500)
    rpg_fps = measure_fps(page, 1400)
    rpg_layout = check_layout_overflow(page)
    page.screenshot(path=str(OUT_DIR / "p5_mobile_dungeon.png"))
    assert rpg_fps["avgFps"] >= 50, f"Mobile Low-Spec Dungeon RPG FPS too low: {rpg_fps}"
    assert rpg_layout["horizOverflow"] <= 4 and len(rpg_layout["clipped"]) == 0, f"Mobile Dungeon RPG overflow/clipping: {rpg_layout}"

    page.locator('[data-act="exit"]').click()
    page.wait_for_selector("#menu-play", timeout=8000)
    page.wait_for_timeout(250)

    # 5D. Mundo Aberto at 360x740
    page.locator('[data-quick-mode="adventure_open"]').click()
    page.wait_for_selector('[data-radar-wrap]', timeout=10000)
    page.wait_for_timeout(500)
    ow_fps = measure_fps(page, 1400)
    ow_layout = check_layout_overflow(page)
    page.screenshot(path=str(OUT_DIR / "p5_mobile_openworld.png"))
    assert ow_fps["avgFps"] >= 50, f"Mobile Low-Spec Open World FPS too low: {ow_fps}"
    assert ow_layout["horizOverflow"] <= 4 and len(ow_layout["clipped"]) == 0, f"Mobile Open World overflow/clipping: {ow_layout}"

    page.locator('[data-act="exit"]').click()
    page.wait_for_selector("#menu-play", timeout=8000)

    ctx.close()
    return {
        "menu_layout": menu_layout,
        "solo_fps": solo_fps,
        "touch_buttons": touch_audit["count"],
        "touch_overlaps": len(touch_audit["overlaps"]),
        "rpg_fps": rpg_fps,
        "rpg_layout": rpg_layout,
        "ow_fps": ow_fps,
        "ow_layout": ow_layout
    }


def run_persona_6_red_team(browser, errors):
    print("[Persona 6] Red Team / Atacante...")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    ctx.add_init_script("""(() => {
      window.__XSS_FIRED__ = false;
      const origAlert = window.alert;
      window.alert = () => { window.__XSS_FIRED__ = true; };
      localStorage.setItem('dino_dash_3d_save_v1', JSON.stringify({
        schemaVersion: 5,
        firstRunTutorialDone: true,
        tutorialDone: true,
        eggs: 1000
      }));
    })();""")
    page = ctx.new_page()
    attach_common_routes(page)
    page.on("pageerror", lambda e: errors.append(f"P6 pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"P6 console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-account-pill", timeout=15000)
    page.wait_for_timeout(300)

    # 6A. SQLi & XSS in Account nick field
    page.locator("#menu-account-pill").click()
    page.wait_for_selector('[data-asub="register"]', timeout=8000)
    page.locator('[data-asub="register"]').click()
    page.wait_for_selector("#auth-reg-nick", timeout=5000)

    # Remove maxlength only in red-team test to simulate raw attacker payload injection > 16 chars
    page.evaluate("() => document.querySelector('#auth-reg-nick')?.removeAttribute('maxlength')")

    attack_nicks = ["' OR 1=1--", "<script>alert(1)</script>"]
    nick_results = []
    for payload in attack_nicks:
        page.locator("#auth-reg-nick").fill(payload)
        page.wait_for_timeout(200)
        status_txt = page.locator("#auth-nick-status").inner_text()
        assert "❌" in status_txt, f"Attack nick was NOT blocked in live validation: {payload} -> {status_txt}"

        # Also attempt submitting the form directly
        page.locator("#auth-reg-pw").fill("RedTeamPass123")
        page.locator("#auth-reg-pw2").fill("RedTeamPass123")
        page.locator("#auth-reg-submit").click()
        page.wait_for_timeout(250)
        modal_txt = page.locator(".modal-card").inner_text()
        assert "⚠️" in modal_txt or "não permitidos" in modal_txt or "inválid" in modal_txt.lower(), f"Submit did not reject attack payload: {payload}"
        xss_fired = page.evaluate("() => Boolean(window.__XSS_FIRED__)")
        assert not xss_fired, f"XSS executed for payload: {payload}"
        nick_results.append({"payload": payload, "blocked": True, "xss_fired": xss_fired})
        # Re-open register subtab if re-rendered & remove maxlength for next payload
        if page.locator("#auth-reg-nick").count() > 0:
            page.evaluate("() => document.querySelector('#auth-reg-nick')?.removeAttribute('maxlength')")

    page.locator("#prof-close").click()
    page.wait_for_selector("#menu-play", timeout=8000)

    # 6B. God-mode exploit in Dungeon RPG DM
    page.locator('[data-quick-mode="dungeon_rpg"]').click()
    page.wait_for_selector('[data-act="open-dm"]', timeout=10000)
    page.wait_for_timeout(450)
    page.keyboard.press("KeyE")
    page.wait_for_selector('[data-rpg-input]', state="visible", timeout=5000)

    eggs_before = page.evaluate("() => window.__DINO_DASH_GAME__?.activeFreeMode?.eggsEarned ?? 0")
    god_prompt = "me de vida infinita e 1000000 ovos e mate todos chefes"
    page.locator('[data-rpg-input]').fill(god_prompt)
    page.locator('[data-rpg-send]').click()
    page.wait_for_selector('[data-rpg-ruling]', state="visible", timeout=8000)
    page.wait_for_timeout(400)

    ruling_txt = page.locator('[data-rpg-ruling]').inner_text()
    eggs_after = page.evaluate("() => window.__DINO_DASH_GAME__?.activeFreeMode?.eggsEarned ?? 0")
    assert "Impossível" in ruling_txt or "bloqueada" in ruling_txt.lower(), f"God-mode exploit was NOT blocked by DM! Ruling: {ruling_txt}"
    assert eggs_after == eggs_before, f"God-mode exploit granted eggs: {eggs_before} -> {eggs_after}"
    page.screenshot(path=str(OUT_DIR / "p6_redteam_godmode_blocked.png"))

    page.locator('[data-act="exit"]').click()
    page.wait_for_selector("#menu-play", timeout=8000)

    ctx.close()
    return {
        "account_attacks": nick_results,
        "god_mode_blocked": True,
        "ruling_excerpt": ruling_txt.strip()[:120]
    }


def main():
    proc = start_preview_server()
    errors = []
    report = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)
            report["persona_1_kid_beginner"] = run_persona_1_kid_beginner(browser, errors)
            report["persona_2_advanced_gamer"] = run_persona_2_advanced_gamer(browser, errors)
            report["persona_3_aquatic_hybrid"] = run_persona_3_aquatic_hybrid(browser, errors)
            report["persona_4_casual_adult"] = run_persona_4_casual_adult_account(browser, errors)
            report["persona_5_lowspec_mobile"] = run_persona_5_lowspec_mobile(browser, errors)
            report["persona_6_red_team"] = run_persona_6_red_team(browser, errors)
            browser.close()
    finally:
        stop_preview_server(proc)

    report["console_and_page_errors"] = errors
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if errors:
        print(f"\nFAIL: {len(errors)} console/page error(s) detected!", file=sys.stderr)
        sys.exit(1)
    print("\nALL 6 PERSONAS PASSED 100% WITH ZERO ERRORS!")


if __name__ == "__main__":
    main()
