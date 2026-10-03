from fpdf import FPDF
import markdown2
import re

md_text = open("thesis.md", "r", encoding="utf-8").read()
md_text = md_text.replace("<br>", ", ")

html_text = markdown2.markdown(md_text, extras=["tables"])

class PDF(FPDF):
    pass

pdf = PDF()
pdf.add_page()
pdf.write_html(html_text)
pdf.output("thesis.pdf")
print("PDF generated!")
