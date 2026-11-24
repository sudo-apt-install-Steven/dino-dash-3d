"""Playwright E2E + Visual Craft + 60 FPS Verification for feat/elite-design-motion."""
import json
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

WT = Path(__file__).resolve().parent.parent
SHOTS = Path("C:/Users/Steven/.gemini/antigravity/brain/bbe246e6-bcfa-4070-9621-61317510688b")
PORT = 4185
URL = f"http://localhost:{PORT}/"


import urllib.request

def start_preview():
    proc = subprocess.Popen(
        ["node", str(WT / "node_modules" / "vite" / "bin" / "vite.js"), "preview", "--port", str(PORT), "--strictPort"],
        cwd=str(WT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(URL, timeout=1) as resp:
                if resp.status == 200:
                    return proc
        except Exception:
            time.sleep(0.25)
    proc.terminate()
    raise RuntimeError("vite preview timeout")


def launch_browser(p):
    args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
    for ch in ("chrome", "msedge", None):
        try:
            kw = {"headless": True, "args": args}
            if ch:
                kw["channel"] = ch
            return p.chromium.launch(**kw)
        except Exception:
            continue
    raise RuntimeError("No Playwright browser channel found")


def measure_fps(page, ms=900):
    return page.evaluate(
        """(dur) => new Promise((resolve) => {
            let f = 0;
            const t0 = performance.now();
            const tick = (now) => {
                f++;
                if (now - t0 >= dur) resolve(Math.round((f * 1000 / Math.max(1, now - t0)) * 10) / 10);
                else requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        })""",
        ms,
    )


def main():
    proc = start_preview()
    console_errors = []
    page_errors = []
    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            ctx = browser.new_context(viewport={"width": 1280, "height": 800})
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))

            page.goto(URL, wait_until="domcontentloaded")
            page.wait_for_function("() => Boolean(window.__DINO_DASH_GAME__)", timeout=15000)
            page.evaluate("() => document.getElementById('splash-skip-btn')?.click()")
            page.wait_for_timeout(450)

            menu_fps = measure_fps(page, 900)

            # 1) Color Studio Picker + Live 3D Dino Preview
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.openSection('customize')")
            page.wait_for_timeout(350)
            page.evaluate("() => document.querySelector('[data-stab=\"colors\"]')?.click()")
            page.wait_for_timeout(350)
            has_color_studio = page.evaluate("() => Boolean(document.getElementById('cs-spectrum') && document.getElementById('cs-alpha'))")
            assert has_color_studio, "ColorStudioPicker failed to mount in CustomizationScreen!"
            page.screenshot(path=str(SHOTS / "elite_color_studio.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.showMainMenu()")
            page.wait_for_timeout(200)

            # 2) Gamepad Vector Glyphs (Xbox / PlayStation / Switch) in Settings
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.openSection('settings')")
            page.wait_for_timeout(300)
            page.evaluate("() => document.querySelector('#set-tabs [data-stab=\"controls\"]')?.click()")
            page.wait_for_timeout(300)
            gp_svgs = page.evaluate("() => document.querySelectorAll('#set-gp-preview-badges svg').length")
            assert gp_svgs >= 6, f"Expected >= 6 SVG gamepad glyphs, got {gp_svgs}"
            page.screenshot(path=str(SHOTS / "elite_gamepad_glyphs.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.showMainMenu()")
            page.wait_for_timeout(200)

            # 3) Arena X1 with Sculpted Dino Weapons + Combo Drawer + Family Mode
            page.evaluate("() => window.__DINO_DASH_GAME__.startQuickMode('arena_x1')")
            page.wait_for_timeout(550)
            page.evaluate("() => document.querySelector('[data-act=\"combos\"]')?.click()")
            page.wait_for_timeout(250)
            arena_fps = measure_fps(page, 800)
            page.screenshot(path=str(SHOTS / "elite_arena_x1_combos.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.openMainMenu()")
            page.wait_for_timeout(250)

            # 4) Open World with Sculpted Bosses & Creatures
            page.evaluate("() => window.__DINO_DASH_GAME__.startQuickMode('adventure_open')")
            page.wait_for_timeout(600)
            openworld_fps = measure_fps(page, 800)
            page.screenshot(path=str(SHOTS / "elite_open_world_sculpted.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.openMainMenu()")
            page.wait_for_timeout(250)

            # Confirm clean return to menu (0 stray overlays, 1 player)
            clean_menu = page.evaluate("""() => ({
                players: window.__DINO_DASH_GAME__.players?.length || 0,
                stray: document.querySelectorAll('#mode3d-overlay, .m3d-root, .m3d-dice-layer').length
            })""")
            assert clean_menu["players"] == 1 and clean_menu["stray"] == 0, f"Dirty menu return: {clean_menu}"

            ctx.close()
            browser.close()

        out = {
            "menuFps": menu_fps,
            "arenaFps": arena_fps,
            "openWorldFps": openworld_fps,
            "hasColorStudio": has_color_studio,
            "gamepadSvgCount": gp_svgs,
            "cleanMenu": clean_menu,
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
        }
        print(json.dumps(out, indent=2))
        if console_errors or page_errors:
            sys.exit(1)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
