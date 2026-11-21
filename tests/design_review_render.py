import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "design-review"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PORT = 4182
BASE_URL = f"http://127.0.0.1:{PORT}"

LIMITED_DINOS = [
    "scary_raptor",
    "dracorex_solar",
    "nebulossauro",
    "cristaloceratops",
    "lich_rex_dungeon",
    "gladiador_carno",
    "meca_indominus_zero",
]

TARGET_ACCESSORIES = [
    "cowboy_hat",
    "wizard_hat",
    "monocle",
    "angel_wings",
    "turtle_shell",
    "halo",
    "orbital_eggs",
    "gold_chain",
    "viking_horn",
    "star_shades",
]


def wait_for_server(url: str, timeout_s: float = 20.0):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status < 500:
                    return True
        except Exception:
            time.sleep(0.25)
    raise RuntimeError(f"Preview server did not become ready at {url}")


def stop_server(proc):
    if proc is None:
        return
    try:
        proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def unlock_all_in_storage(page, selected_dino="trex"):
    page.evaluate(
        """({ dinos, accs, selectedDino }) => {
          const key = 'dino_dash_3d_save_v1';
          const raw = localStorage.getItem(key);
          const data = raw ? JSON.parse(raw) : {};
          data.unlockedDinos = Array.from(new Set([...(data.unlockedDinos || []), 'trex', 'triceratops', ...dinos]));
          data.unlockedAccessories = Array.from(new Set([...(data.unlockedAccessories || []), ...accs]));
          data.selectedDino = selectedDino;
          if (!data.customization) data.customization = { p1: { dinoId: selectedDino, presets: {} }, p2: { dinoId: 'triceratops', presets: {} } };
          if (!data.customization.p1) data.customization.p1 = { dinoId: selectedDino, presets: {} };
          data.customization.p1.dinoId = selectedDino;
          localStorage.setItem(key, JSON.stringify(data));
        }""",
        {"dinos": LIMITED_DINOS, "accs": TARGET_ACCESSORIES, "selectedDino": selected_dino},
    )


def dismiss_splash_and_wait_menu(page):
    page.wait_for_selector("#menu-play", timeout=15000)
    page.evaluate(
        """() => {
          const sp = document.querySelector('#splash-overlay, .splash-screen');
          if (sp) sp.remove();
        }"""
    )
    page.wait_for_timeout(200)


def capture_accessories_for_dino(page, dino_id: str, prefix: str):
    page.goto(BASE_URL, wait_until="domcontentloaded")
    dismiss_splash_and_wait_menu(page)
    unlock_all_in_storage(page, selected_dino=dino_id)
    page.reload(wait_until="domcontentloaded")
    dismiss_splash_and_wait_menu(page)

    # Open CustomizationScreen
    page.evaluate("() => window.__DINO_DASH_GAME__?.ui?.openSection('custom')")
    page.wait_for_selector("#cust-preview-box", timeout=10000)
    page.locator('[data-stab="accessories"]').click()
    page.wait_for_selector("#cust-clear-accs", timeout=10000)
    page.wait_for_timeout(300)

    # Enlarge preview box for crisp visual inspection
    page.evaluate(
        """() => {
          const box = document.querySelector('#cust-preview-box');
          if (box) {
            box.style.width = '420px';
            box.style.height = '340px';
          }
        }"""
    )
    page.wait_for_timeout(200)

    # Ensure no accessories equipped initially
    clear_btn = page.locator("#cust-clear-accs")
    if clear_btn.is_enabled():
        clear_btn.click()
        page.wait_for_timeout(200)

    preview_box = page.locator("#cust-preview-box")

    for acc_id in TARGET_ACCESSORIES:
        btn = page.locator(f'[data-toggle-acc="{acc_id}"]')
        btn.scroll_into_view_if_needed()
        btn.click()
        page.wait_for_timeout(280)
        preview_box.screenshot(path=str(OUT_DIR / f"acc_{prefix}_{acc_id}.png"))
        # Unequip so next is isolated
        btn = page.locator(f'[data-toggle-acc="{acc_id}"]')
        btn.click()
        page.wait_for_timeout(150)

    # 4 simultaneous multi-slot accessories: head + face + neck + back (+ aura)
    for acc_id in ["wizard_hat", "star_shades", "gold_chain", "angel_wings", "orbital_eggs"]:
        btn = page.locator(f'[data-toggle-acc="{acc_id}"]')
        btn.scroll_into_view_if_needed()
        btn.click()
        page.wait_for_timeout(180)
    page.wait_for_timeout(300)
    preview_box.screenshot(path=str(OUT_DIR / f"acc_{prefix}_multislot.png"))


def main():
    cmd = ["npx.cmd" if os.name == "nt" else "npx", "vite", "preview", "--port", str(PORT), "--host", "127.0.0.1"]
    proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    errors = []
    try:
        wait_for_server(BASE_URL)
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True)
            ctx = browser.new_context(viewport={"width": 1280, "height": 800})
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

            # 1. Limited Dinosaurs via ModelGallery (?debug=models)
            page.goto(f"{BASE_URL}/?debug=models", wait_until="domcontentloaded")
            page.wait_for_selector("#mg-canvas-host", timeout=15000)
            page.wait_for_timeout(500)

            # Turn off auto-rotate for consistent framing
            autorot = page.locator("#mg-autorot")
            if "ON" in autorot.inner_text():
                autorot.click()
                page.wait_for_timeout(150)

            dino_budgets = {}
            for dino_id in LIMITED_DINOS:
                page.fill("#mg-search", dino_id)
                page.wait_for_timeout(180)
                item_btn = page.locator(f'#mg-list [data-id="{dino_id}"]')
                if item_btn.count() == 0:
                    # Fallback: search by clear and click matching button
                    page.fill("#mg-search", "")
                    page.wait_for_timeout(150)
                    item_btn = page.locator(f'#mg-list [data-id="{dino_id}"]')
                item_btn.first.click()
                page.wait_for_timeout(350)
                budget_text = page.locator("#mg-model-budget").inner_text()
                dino_budgets[dino_id] = budget_text
                page.locator("#mg-canvas-host").screenshot(path=str(OUT_DIR / f"dino_{dino_id}.png"))

            # SelectionScreen check for scary_raptor
            page.goto(BASE_URL, wait_until="domcontentloaded")
            dismiss_splash_and_wait_menu(page)
            page.evaluate("() => window.__DINO_DASH_GAME__?.ui?.openSection('dinos')")
            page.wait_for_selector("#sel-preview-box", timeout=10000)
            page.fill("#sel-search", "scary")
            page.wait_for_timeout(200)
            page.locator('[data-dino-id="scary_raptor"]').first.click()
            page.wait_for_timeout(350)
            page.screenshot(path=str(OUT_DIR / "selection_scary_raptor.png"))

            # 2. Accessories on trex (biped) and triceratops (quadruped)
            capture_accessories_for_dino(page, "trex", "trex")
            capture_accessories_for_dino(page, "triceratops", "trike")

            # 3. Dungeon RPG Room + 3D Dice (D20, D100, D4, D6)
            page.goto(BASE_URL, wait_until="domcontentloaded")
            dismiss_splash_and_wait_menu(page)
            page.evaluate(
                """() => {
                  const g = window.__DINO_DASH_GAME__;
                  g.setMode('dungeon_rpg');
                  g.startRun(false);
                }"""
            )
            page.wait_for_timeout(1000)
            page.screenshot(path=str(OUT_DIR / "dungeon_rpg_room.png"))

            dice_tray_btn = page.locator('[data-act="dice-tray"]')
            if dice_tray_btn.count() > 0:
                dice_tray_btn.first.click()
                page.wait_for_timeout(250)

            for die in ["d20", "d100", "d4", "d6"]:
                die_btn = page.locator(f'[data-roll-die="{die}"]')
                if die_btn.count() > 0 and die_btn.first.is_visible():
                    die_btn.first.click()
                    # Capture settled/mid 3D die render
                    page.wait_for_timeout(900)
                    page.screenshot(path=str(OUT_DIR / f"dice_{die}.png"))
                    page.wait_for_timeout(900)

            # 4. Arena X1 Scene
            page.evaluate(
                """() => {
                  const g = window.__DINO_DASH_GAME__;
                  g.exitToMenu?.();
                }"""
            )
            page.wait_for_timeout(400)
            page.evaluate(
                """() => {
                  const g = window.__DINO_DASH_GAME__;
                  g.setMode('arena_x1');
                  g.startRun(false);
                }"""
            )
            page.wait_for_timeout(1000)
            page.screenshot(path=str(OUT_DIR / "arena_x1_scene.png"))

            print(json.dumps({"budgets": dino_budgets, "errors": errors}, indent=2))
            browser.close()
    finally:
        stop_server(proc)

    if errors:
        print("ERRORS DETECTED:", errors)
        sys.exit(1)


if __name__ == "__main__":
    main()
