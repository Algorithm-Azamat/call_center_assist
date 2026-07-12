/**
 * Parse PDF file and extract raw text.
 * Uses pdf.js loaded as a web worker.
 */
export async function parsePDF(base64Data: string): Promise<string> {
  // Dynamic import to keep bundle lean
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source (served from extension assets)
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    'assets/pdf.worker.min.mjs'
  );

  // Convert base64 to Uint8Array
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}
