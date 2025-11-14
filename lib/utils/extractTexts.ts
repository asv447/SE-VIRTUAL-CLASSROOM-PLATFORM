import mammoth from "mammoth";
import * as pdf from 'pdf-parse';
export async function extractTextFromFile(file) {
  // Get file extension from name
  const fileName = file.name || "";
  const ext = fileName.split(".").pop().toLowerCase();

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (ext === "pdf") {
    // Extract text from PDF
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new Error("Failed to extract text from PDF: " + err.message);
    }
  } else if (ext === "docx" || ext === "doc") {
    // Extract text from Word document
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      throw new Error("Failed to extract text from Word file: " + err.message);
    }
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or Word document.");
  }
}
