import os
import json
import random
from playwright.sync_api import sync_playwright

URL = os.environ.get("DINO_URL", "http://127.0.0.1:4173/")
SEED = int(os.environ.get("FUZZ_SEED", "20261118"))
rng = random.Random(SEED)

KEYS = ["KeyA", "KeyD", "KeyW", "KeyS", "KeyQ", "KeyV", "KeyX", "Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
VIEWPORTS = [
    {"width": 1280, "height": 720},
    {"width": 844, "height": 390},
    {"width": 360, "height": 740},
    {"width": 932, "height": 430},
    {"width": 1024, "height": 768},
]

errors = []


def check_invariants(page, label):
    state = page.evaluate("""() => {
      const g = window.__DINO_DASH_GAME__;
      if (!g) return { mounted: false };
      const p0 = g.players?.[0];
      return {
        mounted: true,
        state: g.state,
        score: g.score,
        speed: g.speed,
        p0_x: p0?.x ?? 0,
        p0_y: p0?.y ?? 0,
        p0_z: p0?.z ?? 0,
        p0_oxygen: p0?.oxygen ?? 100
      };
    }""")
    if not state.get("mounted"):
        return
    for field in ("score", "speed", "p0_x", "p0_y", "p0_z", "p0_oxygen"):
        val = state.get(field)
        assert isinstance(val, (int, float)) and val == val and abs(val) != float("inf"), (
            f"[{label}] Invalid numeric invariant {field}={val} in {state}"
        )


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 720})
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.error: {m.text}") if m.type == "error" else None)

        page.goto(URL, wait_until="domcontentloaded")
        page.wait_for_selector("#menu-play", timeout=15000)

        # Ensure debug panel is NOT mounted in production preview
        debug_present = page.evaluate("() => Boolean(document.querySelector('#debug-modal, .debug-modal'))")
        assert not debug_present, "Debug modal must NOT be present in production build"

        # Start solo run
        page.click("#menu-play")
        page.wait_for_timeout(500)
        page.evaluate("() => { const g = window.__DINO_DASH_GAME__; if (g?.spotlightActive) g._dismissSpotlight?.(); }")

        # 1. Monkey key fuzzing + rapid resize + pause/resume cycles
        for step in range(30):
            k = rng.choice(KEYS)
            page.keyboard.down(k)
            page.wait_for_timeout(rng.randint(30, 90))
            page.keyboard.up(k)

            if step % 7 == 0:
                vp = rng.choice(VIEWPORTS)
                page.set_viewport_size(vp)
                page.wait_for_timeout(80)

            if step % 10 == 0:
                page.keyboard.press("KeyP")
                page.wait_for_timeout(80)
                page.keyboard.press("KeyP")
                page.wait_for_timeout(80)

            check_invariants(page, f"fuzz-step-{step}")

        # 2. Visibilitychange simulation (tab hidden -> auto-pause)
        page.evaluate("""() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
        }""")
        page.wait_for_timeout(120)
        paused_on_hide = page.evaluate("() => window.__DINO_DASH_GAME__?.state")
        assert paused_on_hide in ("paused", "gameover", "menu"), f"Expected pause on visibilitychange hidden, got {paused_on_hide}"

        page.evaluate("""() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
          document.dispatchEvent(new Event('visibilitychange'));
        }""")
        page.keyboard.press("KeyP")
        page.wait_for_timeout(100)

        # 3. Mode switching fuzz (solo -> coop -> pvp -> zen -> solo)
        for mode in ("coop", "pvp", "zen", "solo"):
            page.evaluate(f"() => {{ const g = window.__DINO_DASH_GAME__; g.setMode('{mode}'); g.startRun(false); if (g?.spotlightActive) g._dismissSpotlight?.(); }}")
            page.wait_for_timeout(200)
            for _ in range(4):
                page.keyboard.press(rng.choice(KEYS))
                page.wait_for_timeout(40)
            check_invariants(page, f"mode-{mode}")

        ctx.close()
        browser.close()

    assert len(errors) == 0, f"RedTeam fuzz detected errors: {errors}"
    print(json.dumps({"ok": True, "seed": SEED, "steps": 30, "modes_tested": ["coop", "pvp", "zen", "solo"]}))


if __name__ == "__main__":
    main()
