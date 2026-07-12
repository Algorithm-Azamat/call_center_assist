/**
 * Parse DOCX file and extract raw text using mammoth.
 */
export async function parseDOCX(base64Data: string): Promise<string> {
  const mammoth = await import('mammoth');

  // Convert base64 to ArrayBuffer
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const arrayBuffer = bytes.buffer;

  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
