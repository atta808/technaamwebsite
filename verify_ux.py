from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/roast")
    page.wait_for_timeout(1000)

    tech_input = page.locator("input[placeholder='Type and press Enter to add']").first

    tech_input.fill("Cursor")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)

    tech_input.fill("Next.js, Supabase, Firebase, Vercel")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)

    tech_input.fill("Google Cloud; React Native\nAWS")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)

    page.evaluate("window.scrollTo(0, 0)")
    page.screenshot(path="verification-ux.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/tmp/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
