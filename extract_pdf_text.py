#!/usr/bin/env python3
import sys
import json
import requests
import fitz  # PyMuPDF
import io

def extract_text_from_pdf(pdf_input):
    try:
        # Check if it's a URL or local file path
        if pdf_input.startswith('http://') or pdf_input.startswith('https://'):
            # Download PDF from URL
            response = requests.get(pdf_input, timeout=30)
            response.raise_for_status()
            
            # Open PDF with PyMuPDF from stream
            pdf_document = fitz.open(stream=response.content, filetype="pdf")
        else:
            # Open local file
            pdf_document = fitz.open(pdf_input)
        
        text = ""
        
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text += page.get_text()
            text += "\n\n"  # Add page break
        
        pdf_document.close()
        return text
    except Exception as e:
        return f"Error extracting text: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python3 extract_pdf_text.py <pdf_url>"}))
        sys.exit(1)
    
    pdf_url = sys.argv[1]
    text = extract_text_from_pdf(pdf_url)
    print(json.dumps({"text": text}))
