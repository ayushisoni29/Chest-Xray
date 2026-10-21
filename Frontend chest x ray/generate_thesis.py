import os

# Read from thesis.md directly or store updated markdown content
with open("thesis.md", "r", encoding="utf-8") as f:
    markdown_content = f.read()

with open("thesis.md", "w", encoding="utf-8") as f:
    f.write(markdown_content)

print("Markdown generated successfully.")
