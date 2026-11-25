#!/usr/bin/env python3
"""Renders the app icons (Home Screen and manifest) with a headless browser."""

from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / "web" / "icons"
SIZES = {"apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512}

HTML = """<!doctype html><html><body style="margin:0">
<div id="i" style="width:{s}px;height:{s}px;background:#2f6f5e;display:flex;align-items:center;justify-content:center">
<div style="width:{c}px;height:{c}px;border:{b}px solid #f7f5f0;border-radius:{r}px;box-sizing:border-box;display:flex;align-items:flex-end;justify-content:flex-end;padding:{p}px">
<div style="width:{d}px;height:{d}px;border-radius:50%;background:#f7f5f0"></div></div>
</div></body></html>"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.webkit.launch()
        page = browser.new_page()
        for name, size in SIZES.items():
            page.set_viewport_size({"width": size, "height": size})
            page.set_content(HTML.format(s=size, c=round(size * 0.5), b=max(2, round(size * 0.04)), r=round(size * 0.1), p=round(size * 0.05), d=round(size * 0.12)))
            page.locator("#i").screenshot(path=str(OUT / name))
        browser.close()
    print(f"wrote {len(SIZES)} icons to {OUT}")


if __name__ == "__main__":
    main()
