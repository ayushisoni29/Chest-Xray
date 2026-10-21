import os
import asyncio
from playwright.async_api import async_playwright

async def generate_pdf():
    html_path = os.path.abspath(r"D:\7TH SEM MAJOR F\Frontend chest x ray\thesis.html")
    pdf_path = os.path.abspath(r"D:\7TH SEM MAJOR F\Frontend chest x ray\thesis.pdf")
    
    file_url = f"file:///{html_path.replace(os.sep, '/')}"
    print(f"Navigating to {file_url}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel="msedge",
            headless=True
        )
        page = await browser.new_page()
        await page.goto(file_url, wait_until="networkidle")
        
        # Ensure all images are loaded
        await page.evaluate("""
            async () => {
                const selectors = Array.from(document.querySelectorAll('img'));
                await Promise.all(selectors.map(img => {
                    if (img.complete) return;
                    return new Promise((resolve, reject) => {
                        img.addEventListener('load', resolve);
                        img.addEventListener('error', resolve);
                    });
                }));
            }
        """)
        
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            margin={
                "top": "25mm",
                "bottom": "25mm",
                "left": "20mm",
                "right": "20mm"
            },
            display_header_footer=True,
            footer_template="""
                <div style="font-size: 9pt; width: 100%; text-align: right; color: #555; padding-right: 20mm; font-family: sans-serif;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                </div>
            """,
            header_template="<div></div>"
        )
        await browser.close()
        
    print(f"PDF generated successfully at {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path) / 1024:.2f} KB")

if __name__ == "__main__":
    asyncio.run(generate_pdf())
