import os
import markdown2

md_path = r"D:\7TH SEM MAJOR F\Frontend chest x ray\thesis.md"
html_path = r"D:\7TH SEM MAJOR F\Frontend chest x ray\thesis.html"

with open(md_path, "r", encoding="utf-8") as f:
    text = f.read()

# Custom styles for academic thesis PDF
css = """
<style>
@page {
    size: A4;
    margin: 25mm 20mm 25mm 25mm;
}
body {
    font-family: 'Times New Roman', Times, serif, 'Calibri';
    font-size: 11.5pt;
    line-height: 1.6;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 0;
}
h1, h2, h3, h4 {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #0f2b48;
    page-break-after: avoid;
}
h1 {
    font-size: 20pt;
    border-bottom: 2px solid #0f2b48;
    padding-bottom: 6px;
    margin-top: 30pt;
    page-break-before: always;
}
h1:first-of-type {
    page-break-before: avoid;
    margin-top: 0;
}
h2 {
    font-size: 15pt;
    margin-top: 20pt;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
}
h3 {
    font-size: 12.5pt;
    margin-top: 14pt;
}
p {
    text-align: justify;
    margin-bottom: 10pt;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 14pt 0;
    font-size: 10pt;
    page-break-inside: avoid;
}
th, td {
    border: 1px solid #94a3b8;
    padding: 6px 10px;
    text-align: left;
}
th {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #0f2b48;
}
code {
    background: #f1f5f9;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: Consolas, monospace;
    font-size: 9.5pt;
}
pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 9pt;
    page-break-inside: avoid;
}
blockquote {
    border-left: 4px solid #0f2b48;
    margin: 12pt 0;
    padding-left: 12pt;
    color: #334155;
    font-style: italic;
}
img {
    max-width: 92%;
    max-height: 420px;
    display: block;
    margin: 12pt auto;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.08);
    page-break-inside: avoid;
}
hr {
    border: 0;
    border-top: 1px solid #cbd5e1;
    margin: 20pt 0;
}
ul, ol {
    margin-bottom: 10pt;
    padding-left: 20pt;
}
li {
    margin-bottom: 4pt;
}
</style>
"""

html_body = markdown2.markdown(text, extras=["tables", "fenced-code-blocks", "header-ids"])
full_html = f"<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Chest X-Ray Multi-Disease Detection & Grad-CAM Explainability System - Major Project Thesis</title>\n{css}\n</head>\n<body>\n{html_body}\n</body>\n</html>"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

print("Generated HTML successfully, size:", len(full_html))
