import json, sys, time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4173/"
errors = []

def measure_fps(page, duration_ms=2500):
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
          resolve({{ frames: valid.length, avgFps: +(1000 / avgDt).toFixed(1) }});
        }} else {{
          requestAnimationFrame(step);
        }}
      }}
      requestAnimationFrame(step);
    }})""")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)

    # 1. Desktop flow: menu -> play -> move -> pause -> resume -> local 2P -> FPS
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"desktop pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"desktop console.error: {m.text}") if m.type == "error" else None)

    page.goto(URL, wait_until="domcontentloaded")
    page.wait_for_selector("#menu-play", timeout=15000)
    page.click("#menu-play")
    page.wait_for_timeout(600)

    page.wait_for_timeout(1200)
    for _ in range(5):
        if not page.evaluate("() => Boolean(window.__DINO_DASH_GAME__?.spotlightActive)"):
            break
        page.keyboard.press("Space")
        page.wait_for_timeout(250)
    page.evaluate("() => { const g = window.__DINO_DASH_GAME__; if (g?.events?.predators?.state === 'intro') g.events.predators.skipIntro(g._eventContext()); if (g?.spotlightActive) g._dismissSpotlight?.(); }")
    page.wait_for_timeout(150)
    if page.evaluate("() => Boolean(window.__DINO_DASH_GAME__?.spotlightActive)"):
        page.keyboard.press("Space")
        page.wait_for_timeout(150)

    # Move P1 left/jump
    before_x = page.evaluate("() => window.__DINO_DASH_GAME__?.players?.[0]?.x ?? 0")
    st_before = page.evaluate("() => ({s:window.__DINO_DASH_GAME__?.state, sp:window.__DINO_DASH_GAME__?.spotlightActive, l:window.__DINO_DASH_GAME__?.players?.[0]?.lane})")
    page.keyboard.down("KeyA"); page.wait_for_timeout(250); page.keyboard.up("KeyA")
    page.keyboard.press("Space"); page.wait_for_timeout(200)
    after_x = page.evaluate("() => window.__DINO_DASH_GAME__?.players?.[0]?.x ?? 0")
    st_after = page.evaluate("() => ({s:window.__DINO_DASH_GAME__?.state, sp:window.__DINO_DASH_GAME__?.spotlightActive, l:window.__DINO_DASH_GAME__?.players?.[0]?.lane, y:window.__DINO_DASH_GAME__?.players?.[0]?.y})")
    assert after_x != before_x, f"P1 did not move: before={before_x} ({st_before}), after={after_x} ({st_after})"

    # Pause & Resume
    page.keyboard.press("KeyP"); page.wait_for_timeout(250)
    paused_state = page.evaluate("() => window.__DINO_DASH_GAME__?.state")
    assert paused_state == 'paused', f"Game did not pause on KeyP: {paused_state}"
    page.keyboard.press("KeyP"); page.wait_for_timeout(250)
    resumed_state = page.evaluate("() => window.__DINO_DASH_GAME__?.state")
    assert resumed_state == 'playing', f"Game did not resume on KeyP: {resumed_state}"

    fps_desktop = measure_fps(page, 2500)
    assert fps_desktop["avgFps"] >= 50.0, f"Desktop FPS too low: {fps_desktop}"

    # Local 2P Coop same-keyboard check
    page.evaluate("() => { const g = window.__DINO_DASH_GAME__; g.setMode('coop'); g.startRun(false); if (g?.events?.predators?.state === 'intro') g.events.predators.skipIntro(g._eventContext()); if (g?.spotlightActive) g._dismissSpotlight?.(); }")
    page.wait_for_timeout(400)
    for _ in range(4):
        if not page.evaluate("() => Boolean(window.__DINO_DASH_GAME__?.spotlightActive)"):
            break
        page.keyboard.press("Space")
        page.wait_for_timeout(200)
    p2_info_before = page.evaluate("() => ({rt:window.__DINO_DASH_GAME__?.runTime, s:window.__DINO_DASH_GAME__?.state, sp:window.__DINO_DASH_GAME__?.spotlightActive, b:window.__DINO_DASH_GAME__?.input?.getBindings('p2'), pl:window.__DINO_DASH_GAME__?.players?.map(x=>({i:x.index,k:x.key,l:x.lane,d:x.dead,bot:x.isBot,x:x.x}))})")
    p2_before = p2_info_before["pl"][1]["l"] if len(p2_info_before["pl"]) > 1 else -1
    page.keyboard.down("KeyD"); page.keyboard.down("ArrowRight"); page.wait_for_timeout(300); page.keyboard.up("KeyD"); page.keyboard.up("ArrowRight")
    p2_info_after = page.evaluate("() => ({rt:window.__DINO_DASH_GAME__?.runTime, s:window.__DINO_DASH_GAME__?.state, sp:window.__DINO_DASH_GAME__?.spotlightActive, pl:window.__DINO_DASH_GAME__?.players?.map(x=>({i:x.index,k:x.key,l:x.lane,d:x.dead,x:x.x}))})")
    p2_after = p2_info_after["pl"][1]["l"] if len(p2_info_after["pl"]) > 1 else -1
    assert p2_before >= 0 and p2_after != p2_before, f"Local P2 did not move: {p2_info_before} -> {p2_info_after}; errors={errors}"

    ctx.close()

    # 2. Mobile landscape 844x390 check
    mctx = browser.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True)
    mpage = mctx.new_page()
    mpage.on("pageerror", lambda e: errors.append(f"mobile pageerror: {e}"))
    mpage.goto(URL, wait_until="domcontentloaded")
    mpage.wait_for_selector("#menu-play", timeout=15000)
    mpage.click("#menu-play")
    mpage.wait_for_timeout(800)
    fps_mobile = measure_fps(mpage, 2000)
    mctx.close()

    # 3. Model Gallery route (/?debug=models) check
    gpage = browser.new_page(viewport={"width": 1280, "height": 720})
    gpage.on("pageerror", lambda e: errors.append(f"gallery pageerror: {e}"))
    gpage.goto(URL + "?debug=models", wait_until="domcontentloaded")
    gpage.wait_for_timeout(800)
    gallery_open = gpage.evaluate("() => document.body.innerText.includes('Galeria') || document.querySelectorAll('canvas').length >= 1")
    assert gallery_open is True, "Model Gallery did not render on ?debug=models"
    gpage.close()
    browser.close()

assert len(errors) == 0, f"Runtime errors detected: {errors}"
print(json.dumps({"ok": True, "fps_desktop": fps_desktop, "fps_mobile": fps_mobile, "p1_x": [before_x, after_x], "p2_lane": [p2_before, p2_after]}))
