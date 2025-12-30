import { GoogleGenAI, Type } from "@google/genai";
import { Book, ProcessingStatus } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert base64 to Uint8Array for pdf.js
const base64ToUint8Array = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const convertPdfToBook = async (
  base64Pdf: string, 
  onProgress: (status: ProcessingStatus) => void
): Promise<Book> => {
  const ai = getAiClient();
  
  onProgress({ step: "Inicializando motor de lectura...", progress: 0 });

  // Schema definition for structured output
  const bookSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the book or document" },
      author: { type: Type.STRING, description: "The author of the document" },
      language: { type: Type.STRING, description: "The primary language of the content (e.g., 'es', 'en')" },
      summary: { type: Type.STRING, description: "A brief summary of the content" },
      chapters: {
        type: Type.ARRAY,
        description: "List of chapters or logical sections",
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Chapter title" },
            content: { type: Type.STRING, description: "Full markdown formatted content of the chapter. Use proper headings, paragraphs, and lists." }
          },
          required: ["title", "content"]
        }
      }
    },
    required: ["title", "author", "summary", "chapters"]
  };

  try {
    // 1. Load and parse PDF
    onProgress({ step: "Cargando documento PDF...", progress: 5 });
    
    const pdfData = base64ToUint8Array(base64Pdf);
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let fullText = "";
    
    // 2. Extract text page by page
    for (let i = 1; i <= numPages; i++) {
      // Calculate progress from 10% to 80% during reading
      const progress = 10 + Math.floor((i / numPages) * 70);
      onProgress({ 
        step: `Leyendo página ${i} de ${numPages}...`, 
        progress 
      });
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- PAGE ${i} START ---\n${pageText}\n--- PAGE ${i} END ---\n`;
    }

    if (fullText.length < 50) {
      throw new Error("No se pudo extraer texto. El PDF podría ser una imagen escaneada.");
    }

    // 3. Send to Gemini
    onProgress({ step: "Analizando estructura y generando libro...", progress: 85 });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          {
            text: `Here is the raw text extracted from a PDF document (with page markers). 
            Please convert this into a structured E-Book.
            
            RAW TEXT CONTENT:
            ${fullText}
            
            Instructions:
            1. Extract the Title and Author (infer from context if not explicit).
            2. Identify logical breaks (chapters, sections) and separate the content accordingly.
            3. Ignore page markers (--- PAGE X ---) when forming chapters, merge text seamlessly.
            4. Retain all meaningful text content.
            5. Format the 'content' field using Markdown (e.g., **bold**, *italics*, # Headers).
            6. Ensure the output language matches the document language.
            7. Return the result strictly as JSON conforming to the schema.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: bookSchema,
        systemInstruction: "You are an expert digital publisher. Your goal is to convert raw PDF text into beautifully structured, readable E-Books in JSON format."
      }
    });
    
    onProgress({ step: "Finalizando...", progress: 100 });
    
    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    const bookData = JSON.parse(text) as Book;
    return bookData;

  } catch (error) {
    console.error("Error converting PDF:", error);
    throw error;
  }
};