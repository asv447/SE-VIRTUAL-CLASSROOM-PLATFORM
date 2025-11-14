import * as pdf from 'pdf-parse';

export async function extractPDFText(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text || "";
  } catch (err) {
    console.error("❌ Error extracting PDF text:", err);
    return "";
  }
}
