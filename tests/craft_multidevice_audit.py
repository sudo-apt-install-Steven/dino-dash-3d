import os
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

os.makedirs('docs/craft-audit', exist_ok=True)
srv = subprocess.Popen(
    ['npx', 'vite', 'preview', '--port', '4188', '--host', '127.0.0.1'],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    shell=True,
)
time.sleep(2.4)

errors = []
results = {}

try:
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel='chrome', headless=True)
        except Exception:
            browser = p.chromium.launch(channel='msedge', headless=True)
        viewports = [
            ('desktop_1280x800', 1280, 800),
            ('tablet_820x1180', 820, 1180),
            ('tablet_1024x768', 1024, 768),
            ('mobile_390x844', 390, 844),
        ]
        for name, w, h in viewports:
            ctx = browser.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page()
            pg.on('pageerror', lambda e, n=name: errors.append(f'{n}: {e}'))
            pg.on('console', lambda m, n=name: errors.append(f'{n} console.error: {m.text}') if m.type == 'error' else None)
            pg.goto('http://127.0.0.1:4188/', wait_until='domcontentloaded')
            pg.wait_for_selector('#menu-play', timeout=15000)
            pg.evaluate('document.getElementById("dino-loading-splash")?.remove()')
            pg.wait_for_timeout(450)
            info = pg.evaluate('''() => {
                const panel = document.querySelector('.main-menu-panel');
                const mapVal = document.querySelector('[data-nav="maps"] .loadout-chip-val, [data-nav="maps"] .loadout-chip-value');
                return {
                    hasVertScroll: panel ? panel.scrollHeight > panel.clientHeight + 4 : false,
                    scrollH: panel ? panel.scrollHeight : 0,
                    clientH: panel ? panel.clientHeight : 0,
                    horizOverflow: document.documentElement.scrollWidth - window.innerWidth,
                    svgIconsCount: document.querySelectorAll('svg.dd-ico').length,
                    mapValColor: mapVal ? getComputedStyle(mapVal).color : null,
                };
            }''')
            results[name] = info
            pg.screenshot(path=f'docs/craft-audit/{name}.png')
            ctx.close()
        browser.close()
finally:
    srv.terminate()

print('CRAFT_MULTIDEVICE_RESULTS:', results)
print('ERRORS:', errors)
if errors:
    sys.exit(1)
for k, v in results.items():
    assert v['horizOverflow'] <= 0, f'{k} has horizontal overflow: {v}'
    assert v['svgIconsCount'] >= 15, f'{k} missing custom SVG icons: {v}'
print('CRAFT_MULTIDEVICE_AUDIT_PASS')
