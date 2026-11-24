"""Suíte E2E + QA Visual + Galeria de Acessórios + FPS para Parte 1 (Regra T + 1.1..1.8)."""
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS_DIR = ROOT / "docs" / "agentes" / "relatorios" / "screenshots"
SHOTS_DIR.mkdir(parents=True, exist_ok=True)
PORT = 4179
URL = f"http://localhost:{PORT}/"


def start_preview():
    import urllib.request
    proc = subprocess.Popen(
        ["node", str(ROOT / "node_modules" / "vite" / "bin" / "vite.js"), "preview", "--port", str(PORT), "--strictPort"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 15
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"vite preview exited early with {proc.poll()}")
        try:
            with urllib.request.urlopen(f"http://localhost:{PORT}/", timeout=1) as r:
                if r.status == 200:
                    return proc
        except Exception:
            pass
        time.sleep(0.3)
    proc.terminate()
    raise RuntimeError("vite preview timed out")


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
    raise RuntimeError("No Playwright browser available")


def measure_fps(page, ms=1000):
    return page.evaluate(
        """(dur) => new Promise((resolve) => {
            let frames = 0;
            const t0 = performance.now();
            const step = (now) => {
                frames++;
                if (now - t0 >= dur) resolve(Math.round((frames * 1000 / Math.max(1, now - t0)) * 10) / 10);
                else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        })""",
        ms,
    )


def main():
    proc = start_preview()
    print("[QA] Vite preview iniciado na porta", PORT, flush=True)
    console_errors = []
    page_errors = []
    try:
        with sync_playwright() as p:
            browser = launch_browser(p)
            print("[QA] Browser iniciado com sucesso", flush=True)
            ctx = browser.new_context(viewport={"width": 1280, "height": 800})
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: page_errors.append(str(e)))

            print("[QA] Acessando URL...", flush=True)
            page.goto(URL, wait_until="domcontentloaded")
            print("[QA] Aguardando objeto game...", flush=True)
            page.wait_for_function("() => Boolean(window.__DINO_DASH_GAME__)", timeout=15000)
            page.evaluate("() => document.getElementById('splash-skip-btn')?.click()")
            page.wait_for_timeout(450)
            print("[QA] Tela principal carregada", flush=True)

            print("[QA] Verificando scrollbars e nickname...", flush=True)
            # 1.1 Scrollbar CSS check
            scroll_check = page.evaluate("""() => {
                const cs = getComputedStyle(document.documentElement);
                return { width: cs.scrollbarWidth, color: cs.scrollbarColor };
            }""")

            # 1.4 Random fun default nick (never 'steven teste')
            nick_check = page.evaluate("""() => {
                const raw = JSON.parse(localStorage.getItem('dino_dash_3d_save_v4') || '{}');
                return {
                    profNick: raw?.profile?.nickname || '',
                    hasStevenTeste: /steven\\s*teste/i.test(document.body.innerText)
                };
            }""")
            assert not nick_check["hasStevenTeste"], "Found leftover 'steven teste' in UI!"

            print("[QA] Medindo FPS desktop...", flush=True)
            desktop_fps = measure_fps(page, 1000)

            print("[QA] Testando ciclo 1.2 & 1.3 de entrada/saída RPG e Arena X1...", flush=True)
            # 1.2 & 1.3 Enter & exit RPG and Arena X1 5x back-to-back without reload!
            mode_loop = page.evaluate("""async () => {
                const g = window.__DINO_DASH_GAME__;
                const out = [];
                for (let i = 0; i < 5; i++) {
                    g.startQuickMode('dungeon_rpg');
                    await new Promise((r) => setTimeout(r, 180));
                    g.openMainMenu();
                    await new Promise((r) => setTimeout(r, 80));
                    const strayRpg = document.querySelectorAll('#mode3d-overlay, .m3d-root, .m3d-dice-layer').length;

                    g.startQuickMode('arena_x1');
                    await new Promise((r) => setTimeout(r, 180));
                    g.openMainMenu();
                    await new Promise((r) => setTimeout(r, 80));
                    const strayArena = document.querySelectorAll('#mode3d-overlay, .m3d-root, .m3d-dice-layer').length;
                    out.push({
                        iter: i + 1,
                        strayRpg,
                        strayArena,
                        pCount: g.players?.length || 0,
                        modeId: g.modeId,
                        state: g.state,
                        hasGhostP2Text: /Jogador 2/i.test(document.body.innerText)
                    });
                }
                return out;
            }""")
            for c in mode_loop:
                assert c["strayRpg"] == 0 and c["strayArena"] == 0, f"Stray overlays: {c}"
                assert c["pCount"] == 1 and not c["hasGhostP2Text"], f"Ghost P2 detected: {c}"
                assert c["state"] == "menu", f"Not back in menu: {c}"

            # 1.5 Profile / Auth Modal check
            print("[QA] Verificando modal de perfil e autenticação 1.5...", flush=True)
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.openSection('profile', { initialTab: 'account' })")
            page.wait_for_timeout(400)
            auth_ui = page.evaluate("""() => ({
                hasLoginId: Boolean(document.getElementById('auth-login-id')),
                hasRecoverTab: Boolean(document.querySelector('[data-asub="recover"]')),
                hasGoogleBtn: Boolean(document.getElementById('auth-oauth-google')),
                hasDiscordBtn: Boolean(document.getElementById('auth-oauth-discord'))
            })""")
            assert all(auth_ui.values()), f"Missing Auth UI controls: {auth_ui}"
            page.screenshot(path=str(SHOTS_DIR / "parte-1-perfil-auth.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.showMainMenu()")
            page.wait_for_timeout(200)

            # 1.7 Real 3D Biome Thumbnails in Maps Modal
            print("[QA] Verificando miniaturas 3D reais dos biomas 1.7...", flush=True)
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.openSection('maps')")
            page.wait_for_timeout(550)
            biome_thumbs = page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll('img.biome-thumb-3d'));
                return {
                    count: imgs.length,
                    loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/')).length
                };
            }""")
            assert biome_thumbs["count"] >= 5 and biome_thumbs["loaded"] == biome_thumbs["count"], f"Biome thumbs failed: {biome_thumbs}"
            page.screenshot(path=str(SHOTS_DIR / "parte-1-biomas.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.showMainMenu()")
            page.wait_for_timeout(200)

            # 1.6 Accessories visual proof (spike_collar + backpack on T-Rex / Triceratops in Customizer)
            print("[QA] Verificando pontos de ancoragem e acessórios 1.6...", flush=True)
            page.evaluate("""() => {
                const g = window.__DINO_DASH_GAME__;
                const raw = JSON.parse(localStorage.getItem('dino_dash_3d_save_v4') || '{}');
                if (raw?.customization?.p1?.presets?.[0]) {
                    raw.customization.p1.presets[0].accessories = ['crown', 'spike_collar', 'backpack'];
                    raw.customization.p1.presets[0].accessory = 'backpack';
                    localStorage.setItem('dino_dash_3d_save_v4', JSON.stringify(raw));
                }
                g.ui.openSection('customize');
            }""")
            page.wait_for_timeout(550)
            page.screenshot(path=str(SHOTS_DIR / "parte-1-acessorios.png"))
            page.evaluate("() => window.__DINO_DASH_GAME__.ui.showMainMenu()")
            page.wait_for_timeout(200)

            # Mobile check (360x740)
            print("[QA] Verificando modo mobile (360x740)...", flush=True)
            mob_ctx = browser.new_context(viewport={"width": 360, "height": 740}, is_mobile=True, has_touch=True)
            mob_page = mob_ctx.new_page()
            mob_page.on("console", lambda m: console_errors.append(f"[mob] {m.text}") if m.type == "error" else None)
            mob_page.on("pageerror", lambda e: page_errors.append(f"[mob] {e}"))
            mob_page.goto(URL, wait_until="domcontentloaded")
            mob_page.wait_for_function("() => Boolean(window.__DINO_DASH_GAME__)", timeout=15000)
            mob_page.evaluate("() => document.getElementById('splash-skip-btn')?.click()")
            mob_page.wait_for_timeout(450)
            mobile_fps = measure_fps(mob_page, 1000)
            mob_page.screenshot(path=str(SHOTS_DIR / "parte-1-mobile.png"))
            mob_ctx.close()
            ctx.close()
            browser.close()

        summary = {
            "scrollCheck": scroll_check,
            "nickCheck": nick_check,
            "desktopFps": desktop_fps,
            "mobileFps": mobile_fps,
            "modeLoopIterations": len(mode_loop),
            "authUi": auth_ui,
            "biomeThumbs": biome_thumbs,
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
        }
        print(json.dumps(summary, indent=2, ensure_ascii=False))
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
