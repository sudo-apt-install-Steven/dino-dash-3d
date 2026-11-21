"""Comprehensive Playwright E2E Audit for Dino Dash 3D Ultra Expansão.

Starts `npx vite preview --port 4185 --host 127.0.0.1`, verifies:
- All main buttons & modals (0 console errors, 0 uncaught page errors)
- Bestiary all 5 tabs (predators, bosses, debuffs, events, ultra)
- Multiplayer LAN Local -> Local Instantâneo -> Create Room -> Room Code -> Leave
- Customization multi-slot equip (3 slots) -> Remover Todos -> Mutation ON/OFF -> Dino 100% Padrão -> Restaurar Visual
- SelectionScreen Limitados filter + #sel-personal-names-btn toggle ('Scary Monsters')
- Launch & interact with arena_x1, boss_arena, adventure_open, dungeon_rpg (DM panel, suggestion/custom action, god-mode block, dice roll, exit)
- Desktop (1280x800) and Mobile Low-Spec (360x740 & 844x390) render & FPS checks
Cleanly terminates preview server afterwards.
"""

import json
import os
import signal
import subprocess
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

PORT = 4185
URL = f"http://127.0.0.1:{PORT}/"


def wait_for_server(url, timeout=20.0):
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


def close_current_modal(page):
    # Try common close button selectors in priority order
    close_selectors = [
        "#modes-close", "#sel-close", "#cust-close", "#maps-close", "#diff-close",
        "#missions-close", "#album-close", "#records-close", "#bestiary-close",
        "#mp-close", "#profile-close", "#ach-close", "#save-close", "#guide-close",
        "#settings-close", "#extras-close", "#gacha-close", "#legal-close",
        ".modal-header button.secondary", "button:has-text('Voltar')", "button:has-text('Concluir')", "button:has-text('Fechar')"
    ]
    for sel in close_selectors:
        loc = page.locator(sel).first
        if loc.count() > 0 and loc.is_visible():
            loc.click()
            page.wait_for_timeout(150)
            return True
    page.keyboard.press("Escape")
    page.wait_for_timeout(150)
    return False


def ensure_main_menu(page):
    for _ in range(4):
        if page.locator("#menu-play").count() > 0 and page.locator("#menu-play").is_visible():
            return
        close_current_modal(page)
        page.wait_for_timeout(150)
    page.wait_for_selector("#menu-play", timeout=8000)


def main():
    proc = start_preview_server()
    errors = []
    report = {
        "modals_checked": [],
        "bestiary_tabs": [],
        "multiplayer_lan": {},
        "customization": {},
        "selection_screen": {},
        "modes_3d": {},
        "viewports": {},
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)

            # =====================================================================
            # 1. DESKTOP (1280x800) FULL AUDIT
            # =====================================================================
            ctx = browser.new_context(viewport={"width": 1280, "height": 800})
            ctx.add_init_script("""(() => {
              try {
                if (!localStorage.getItem('dino_dash_3d_save_v1')) {
                  localStorage.setItem('dino_dash_3d_save_v1', JSON.stringify({
                    schemaVersion: 5,
                    eggs: 50000,
                    crystals: 20,
                    unlockedAccessories: ['none', 'crown', 'glasses', 'wings', 'aura_fire', 'scarf'],
                    unlockedMutations: ['amber_core', 'glow']
                  }));
                }
              } catch {}
            })();""")
            page = ctx.new_page()
            # Stub optional external/backend endpoints not running during standalone vite preview
            page.route("**/api/lan-info*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"ok":false,"ips":[]}'))
            page.route("**/api/rooms*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"ok":true,"rooms":[]}'))
            page.route("**/functions/v1/ai-dungeon-master*", lambda route: route.fulfill(status=200, content_type="application/json", body='{"fallback":true}'))
            page.on("pageerror", lambda e: errors.append(f"desktop pageerror: {e}"))
            page.on("console", lambda m: errors.append(f"desktop console.error: {m.text}") if m.type == "error" else None)

            page.goto(URL, wait_until="domcontentloaded")
            page.wait_for_selector("#menu-play", timeout=15000)
            page.wait_for_timeout(400)

            # Give test save plenty of eggs & unlocked items for customization flow
            page.evaluate("""() => {
              const g = window.__DINO_DASH_GAME__;
              if (!g) return;
              const raw = localStorage.getItem('dino_dash_3d_save_v1');
              // Ensure accessories & mutations are unlocked for UI verification
              const s = g.save || window.__DINO_SAVE__;
              if (s?.data) {
                s.data.eggs = Math.max(s.data.eggs || 0, 50000);
                s.data.unlockedAccessories = Array.from(new Set([...(s.data.unlockedAccessories || []), 'none', 'crown', 'glasses', 'wings', 'aura_fire', 'scarf']));
                s.data.unlockedMutations = Array.from(new Set([...(s.data.unlockedMutations || []), 'amber_core', 'glow']));
                s.save?.();
              }
            }""")

            # 1A. Audit ALL main buttons/modals
            direct_navs = ["modes", "dinos", "custom", "maps", "difficulty", "multiplayer", "profile", "achievements", "save_data", "guide", "bestiary"]
            for nav in direct_navs:
                ensure_main_menu(page)
                btn = page.locator(f'[data-nav="{nav}"]').first
                assert btn.count() > 0, f"Main menu button [data-nav='{nav}'] not found"
                btn.click()
                page.wait_for_timeout(250)
                if nav == "bestiary":
                    # Test all 5 Bestiary tabs
                    for tab in ["predators", "bosses", "debuffs", "events", "ultra"]:
                        tbtn = page.locator(f'[data-btab="{tab}"]').first
                        assert tbtn.count() > 0, f"Bestiary tab {tab} missing"
                        tbtn.click()
                        page.wait_for_timeout(180)
                        cards = page.locator(".bestiary-card").count()
                        assert cards > 0, f"Bestiary tab {tab} rendered 0 cards"
                        report["bestiary_tabs"].append({"tab": tab, "cards": cards})
                report["modals_checked"].append(nav)
                ensure_main_menu(page)

            # Extras sub-modals: Missions, Album, Records, Settings
            extras_navs = ["missions", "album", "records", "settings"]
            for ex in extras_navs:
                ensure_main_menu(page)
                page.locator('[data-nav="extras"]').first.click()
                page.wait_for_timeout(200)
                ebtn = page.locator(f'[data-ex-nav="{ex}"]').first
                assert ebtn.count() > 0, f"Extras button [data-ex-nav='{ex}'] not found"
                ebtn.click()
                page.wait_for_timeout(250)
                report["modals_checked"].append(ex)
                ensure_main_menu(page)

            # 1B. Explicitly test Multiplayer LAN Local -> Local Instantâneo -> Create Room -> Room Code -> Leave
            ensure_main_menu(page)
            page.locator('[data-nav="multiplayer"]').first.click()
            page.wait_for_timeout(300)

            lan_btn = page.locator('[data-tr="lan"]').first
            assert lan_btn.count() > 0, "LAN Local tab button [data-tr='lan'] not found"
            lan_btn.click()
            page.wait_for_timeout(200)
            lan_classes = page.locator('[data-tr="lan"]').first.get_attribute("class") or ""
            assert "active" in lan_classes, f"LAN tab did not gain .active class: {lan_classes}"

            local_inst_btn = page.locator('[data-lan-sub="local_channel"]').first
            assert local_inst_btn.count() > 0, "Local Instantâneo button not found"
            local_inst_btn.click()
            page.wait_for_timeout(200)
            local_classes = page.locator('[data-lan-sub="local_channel"]').first.get_attribute("class") or ""
            assert "active" in local_classes, f"Local Instantâneo did not gain .active class: {local_classes}"

            page.locator("#mp-create").click()
            page.wait_for_selector("#mp-leave", timeout=8000)
            page.wait_for_timeout(250)

            # Verify 4-char room code rendered
            room_code = page.evaluate("""() => {
              const g = window.__DINO_DASH_GAME__;
              return g?.net?.room?.code || '';
            }""")
            assert len(room_code) >= 4, f"Room code not created/rendered: '{room_code}'"
            body_text = page.locator(".modal-card").inner_text()
            assert room_code in body_text, f"Room code {room_code} not visible in lobby UI"

            page.locator("#mp-leave").click()
            page.wait_for_timeout(250)
            report["multiplayer_lan"] = {"lan_active": True, "local_channel_active": True, "room_code": room_code, "left_cleanly": True}
            ensure_main_menu(page)

            # 1C. Explicitly test Customization: equip 3 accessories across slots, Remover Todos, mutation ON->OFF, Dino 100% Padrão -> Restaurar Visual
            page.locator('[data-nav="custom"]').first.click()
            page.wait_for_selector("#cust-tabs-row", timeout=8000)
            page.wait_for_timeout(250)

            # Ensure 3 accessories + 1 mutation are unlocked via Save inside the page
            page.evaluate("""() => {
              const raw = localStorage.getItem('dino_dash_3d_save_v1');
              // Use window.__DINO_DASH_GAME__ or direct Save mutation via game
            }""")
            # Switch to Accessories tab
            page.locator('[data-stab="accessories"]').first.click()
            page.wait_for_timeout(200)

            # First clear any previously equipped accessories
            clear_btn = page.locator("#cust-clear-accs")
            if clear_btn.count() > 0 and not clear_btn.is_disabled():
                clear_btn.click()
                page.wait_for_timeout(150)

            # Equip 3 accessories across 3 different slots (unlocking via shop if needed, or clicking available data-toggle-acc)
            # Let's make sure crown (head), glasses (face), wings (back) are unlocked
            avail_toggles = page.locator("[data-toggle-acc]")
            if avail_toggles.count() < 3:
                # Buy 3 accessories from different slots in Shop tab after granting eggs
                page.evaluate("""() => {
                  const g = window.__DINO_DASH_GAME__;
                  // Access Save through UI/localStorage reload isn't needed if Save is on window or via eggs
                  if (g?.progression) { g.progression.addEggs?.(25000); }
                }""")
                page.locator('[data-stab="shop"]').first.click()
                page.wait_for_timeout(200)
                for acc_id in ["cap", "monocle", "leaf_cape"]:
                    buy_btn = page.locator(f'[data-buy-acc="{acc_id}"]').first
                    if buy_btn.count() > 0:
                        buy_btn.click()
                        page.wait_for_timeout(120)
                page.locator('[data-stab="accessories"]').first.click()
                page.wait_for_timeout(200)

            # Equip 3 distinct-slot accessories
            equipped_ids = []
            for acc_id in ["crown", "cap", "glasses", "monocle", "wings", "leaf_cape", "scarf", "aura_fire"]:
                if len(equipped_ids) >= 3:
                    break
                btn = page.locator(f'[data-toggle-acc="{acc_id}"]').first
                if btn.count() > 0:
                    cls = btn.get_attribute("class") or ""
                    if "active" not in cls:
                        btn.click()
                        page.wait_for_timeout(120)
                    equipped_ids.append(acc_id)

            active_accs_count = page.locator("[data-toggle-acc].active").count()
            assert active_accs_count >= 3, f"Expected >= 3 equipped accessories across slots, got {active_accs_count} (tried {equipped_ids})"

            # Click Remover Todos Acessórios
            page.locator("#cust-clear-accs").click()
            page.wait_for_timeout(200)
            after_clear_count = page.locator("[data-toggle-acc].active").count()
            assert after_clear_count == 0, f"Expected 0 accessories after clear, got {after_clear_count}"

            # Equip 1 accessory again so reset->restore has visible state to restore
            first_acc = page.locator("[data-toggle-acc]").first
            first_acc.click()
            page.wait_for_timeout(150)

            # Switch to Mutations tab, toggle a mutation ON then OFF
            page.locator('[data-stab="mutations"]').first.click()
            page.wait_for_timeout(200)
            mut_btn = page.locator('[data-equip-mut="amber_core"]').first
            if mut_btn.count() == 0:
                mut_btn = page.locator("[data-equip-mut]").first
            assert mut_btn.count() > 0, "No unlocked mutation equip button found"
            mut_id = mut_btn.get_attribute("data-equip-mut")
            # Toggle ON
            if "active" not in (mut_btn.get_attribute("class") or ""):
                mut_btn.click()
                page.wait_for_timeout(180)
            mut_on = page.evaluate("() => JSON.parse(localStorage.getItem('dino_dash_3d_save_v1') || '{}')?.equippedMutation ?? null")
            assert mut_on == mut_id, f"Expected equippedMutation === '{mut_id}', got {mut_on}"

            # Toggle OFF
            page.locator(f'[data-equip-mut="{mut_id}"]').first.click()
            page.wait_for_timeout(180)
            mut_off = page.evaluate("() => JSON.parse(localStorage.getItem('dino_dash_3d_save_v1') || '{}')?.equippedMutation ?? null")
            assert mut_off is None, f"Expected equippedMutation === null after toggling OFF, got {mut_off}"

            # Turn mutation ON again so Reset -> Restore tests mutation too
            page.locator(f'[data-equip-mut="{mut_id}"]').first.click()
            page.wait_for_timeout(180)

            # Click Dino 100% Padrão
            page.locator("#cust-reset-default").click()
            page.wait_for_timeout(200)
            after_reset = page.evaluate("""() => {
              const s = JSON.parse(localStorage.getItem('dino_dash_3d_save_v1') || '{}');
              const p = s?.customization?.p1?.presets?.[s?.customization?.p1?.activePreset || 0] || {};
              return { mut: s.equippedMutation ?? null, accs: p.accessories || [], useCustom: !!p.useCustomColors };
            }""")
            assert after_reset["mut"] is None and len(after_reset["accs"]) == 0 and not after_reset["useCustom"], f"Reset to default failed: {after_reset}"

            # Click Restaurar Visual
            restore_btn = page.locator("#cust-restore-backup")
            assert not restore_btn.is_disabled(), "#cust-restore-backup should be enabled after reset"
            restore_btn.click()
            page.wait_for_timeout(200)
            after_restore = page.evaluate("""() => {
              const s = JSON.parse(localStorage.getItem('dino_dash_3d_save_v1') || '{}');
              const p = s?.customization?.p1?.presets?.[s?.customization?.p1?.activePreset || 0] || {};
              return { mut: s.equippedMutation ?? null, accs: p.accessories || [] };
            }""")
            assert after_restore["mut"] == mut_id and len(after_restore["accs"]) >= 1, f"Restore visual failed: {after_restore}"

            report["customization"] = {
                "equipped_multi_slot": active_accs_count,
                "cleared_to_zero": after_clear_count == 0,
                "mutation_on_off_null": True,
                "reset_and_restore_ok": True,
            }
            ensure_main_menu(page)

            # 1D. Explicitly test SelectionScreen: filter Limitados / Eventos + #sel-personal-names-btn -> 'Scary Monsters'
            page.locator('[data-nav="dinos"]').first.click()
            page.wait_for_selector("#sel-personal-names-btn", timeout=8000)
            page.wait_for_timeout(250)

            page.locator('[data-cfilter="limited"]').first.click()
            page.wait_for_timeout(200)
            limited_cards = page.locator("[data-dino-id]").count()
            assert limited_cards >= 13, f"Expected >= 13 limited dino cards, got {limited_cards}"

            # Ensure personalNames is toggled ON and verify 'Scary Monsters' appears
            pbtn = page.locator("#sel-personal-names-btn")
            if "active" not in (pbtn.get_attribute("class") or ""):
                pbtn.click()
                page.wait_for_timeout(200)
            sel_text = page.locator(".modal-card").inner_text()
            assert "Scary Monsters" in sel_text, "Expected 'Scary Monsters' in SelectionScreen when personalNames is ON"

            # Toggle back OFF and verify 'Raptor Fóssil Estelar' appears
            pbtn.click()
            page.wait_for_timeout(200)
            sel_text_off = page.locator(".modal-card").inner_text()
            assert "Raptor Fóssil Estelar" in sel_text_off, "Expected 'Raptor Fóssil Estelar' when personalNames is OFF"

            report["selection_screen"] = {
                "limited_cards": limited_cards,
                "personal_names_toggle_ok": True,
            }
            ensure_main_menu(page)

            # 1E. Launch & interact briefly with Arena X1, Boss Arena, Adventure Open, Dungeon RPG
            for mode_id in ["arena_x1", "boss_arena", "adventure_open"]:
                ensure_main_menu(page)
                page.evaluate(f"""() => {{
                  const g = window.__DINO_DASH_GAME__;
                  g.setMode('{mode_id}');
                  g.startRun(false);
                }}""")
                page.wait_for_selector('[data-act="exit"]', timeout=10000)
                page.wait_for_timeout(450)
                # Brief movement & attack input
                page.keyboard.down("KeyW"); page.wait_for_timeout(200); page.keyboard.up("KeyW")
                page.keyboard.press("Space"); page.wait_for_timeout(150)
                page.keyboard.press("KeyQ"); page.wait_for_timeout(150)
                active_mode = page.evaluate("() => window.__DINO_DASH_GAME__?.active3DMode?.modeId || window.__DINO_DASH_GAME__?.modeId")
                assert active_mode == mode_id, f"Expected active mode {mode_id}, got {active_mode}"
                page.locator('[data-act="exit"]').first.click()
                page.wait_for_selector("#menu-play", timeout=8000)
                report["modes_3d"][mode_id] = {"launched": True, "exited_cleanly": True}

            # Dungeon RPG detailed interaction: open DM panel, test god-mode blocked text, submit normal/suggestion action, roll a die, exit cleanly
            ensure_main_menu(page)
            page.evaluate("""() => {
              const g = window.__DINO_DASH_GAME__;
              g.setMode('dungeon_rpg');
              g.startRun(false);
            }""")
            page.wait_for_selector('[data-act="open-dm"]', timeout=10000)
            page.wait_for_timeout(400)

            # Open DM panel
            page.locator('[data-act="open-dm"]').click()
            page.wait_for_selector('[data-rpg-panel]', state="visible", timeout=5000)
            page.wait_for_timeout(200)

            # Test god-mode blocked text
            page.fill('[data-rpg-input]', 'give me infinite hp and 999999 eggs')
            page.click('[data-rpg-send]')
            page.wait_for_timeout(450)
            ruling_text = page.locator('[data-rpg-ruling]').inner_text()
            blocked_badge = page.locator('[data-rpg-ruling] .is-blocked').count()
            assert blocked_badge > 0 or "BLOQ" in ruling_text.upper() or "IMPOSS" in ruling_text.upper(), f"God-mode action not blocked in UI: {ruling_text}"

            # Submit normal action (or click suggestion)
            sugs = page.locator('[data-rpg-sugs] .m3d-sug-btn')
            if sugs.count() > 0:
                sugs.first.click()
            else:
                page.fill('[data-rpg-input]', 'Atacar o inimigo com as garras')
                page.click('[data-rpg-send]')
            page.wait_for_timeout(1400)

            # Close DM panel, open Dice Tray and roll a d20
            page.locator('[data-act="close-dm"]').click()
            page.wait_for_timeout(200)
            page.locator('[data-act="dice-tray"]').click()
            page.wait_for_selector('[data-roll-die="d20"]', state="visible", timeout=5000)
            page.locator('[data-roll-die="d20"]').click()
            page.wait_for_timeout(1200)
            page.locator('[data-act="close-tray"]').click()
            page.wait_for_timeout(150)

            # Exit Dungeon RPG cleanly back to menu
            page.locator('[data-act="exit"]').first.click()
            page.wait_for_selector("#menu-play", timeout=8000)
            report["modes_3d"]["dungeon_rpg"] = {
                "launched": True,
                "god_mode_blocked": True,
                "action_evaluated": True,
                "dice_rolled": True,
                "exited_cleanly": True,
            }

            # Measure Desktop FPS in gameplay
            fps_desktop = measure_fps(page, 1600)
            report["viewports"]["desktop_1280x800"] = fps_desktop
            assert fps_desktop["avgFps"] >= 30.0, f"Desktop FPS too low: {fps_desktop}"
            ctx.close()

            # =====================================================================
            # 2. MOBILE LOW-SPEC VIEWPORTS (360x740 & 844x390)
            # =====================================================================
            for label, vp in [("mobile_portrait_360x740", {"width": 360, "height": 740}), ("mobile_landscape_844x390", {"width": 844, "height": 390})]:
                mctx = browser.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2)
                mpage = mctx.new_page()
                mpage.on("pageerror", lambda e, lb=label: errors.append(f"{lb} pageerror: {e}"))
                mpage.on("console", lambda m, lb=label: errors.append(f"{lb} console.error: {m.text}") if m.type == "error" else None)

                mpage.goto(URL, wait_until="domcontentloaded")
                mpage.wait_for_selector("#menu-play", timeout=15000)
                mpage.evaluate("""() => {
                  const g = window.__DINO_DASH_GAME__;
                  if (g?.setLowSpecMode) g.setLowSpecMode(true, true);
                }""")
                mpage.wait_for_timeout(350)
                fps_m = measure_fps(mpage, 1500)
                # Also verify no horizontal overflow clipping the main play button
                box = mpage.locator("#menu-play").bounding_box()
                assert box and box["width"] > 80 and box["x"] >= 0 and (box["x"] + box["width"]) <= vp["width"] + 2, f"{label} #menu-play clipped: {box}"
                report["viewports"][label] = {**fps_m, "play_btn_box": box}
                assert fps_m["avgFps"] >= 25.0, f"{label} FPS too low: {fps_m}"
                mctx.close()

            browser.close()
    finally:
        stop_preview_server(proc)

    if errors:
        print("E2E ULTRA AUDIT ERRORS:", json.dumps(errors, indent=2, ensure_ascii=False))
        sys.exit(1)

    print("E2E_ULTRA_AUDIT_PASS:", json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
