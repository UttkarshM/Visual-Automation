interface FileProcessResult {
  success: boolean;
  text: string;
  error?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    extractionMethod: string;
  };
}

export async function processFiles(
  files: File[],
  extractionMethod: string = 'auto'
): Promise<FileProcessResult[]> {
  const results: FileProcessResult[] = [];

  for (const file of files) {
    try {
      console.log(`Processing file: ${file.name} (${file.type})`);
      
      const result = await extractTextFromFile(file, extractionMethod);
      results.push({
        ...result,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || getFileTypeFromName(file.name),
          extractionMethod: result.success ? extractionMethod : 'failed'
        }
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      results.push({
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || getFileTypeFromName(file.name),
          extractionMethod: 'failed'
        }
      });
    }
  }

  return results;
}

async function extractTextFromFile(
  file: File,
  extractionMethod: string
): Promise<Omit<FileProcessResult, 'metadata'>> {
  const fileType = file.type || getFileTypeFromName(file.name);
  
  // Determine extraction method based on file type if auto is selected
  let method = extractionMethod;
  if (extractionMethod === 'auto') {
    method = determineExtractionMethod(fileType, file.name);
  }

  switch (method) {
    case 'plain':
      return await extractPlainText(file);
    case 'markdown':
      return await extractMarkdown(file);
    case 'ocr':
      return await extractWithOCR(file);
    default:
      return await extractPlainText(file);
  }
}

async function extractPlainText(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  try {
    const text = await file.text();
    return {
      success: true,
      text: text.trim()
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function extractMarkdown(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  try {
    const text = await file.text();
    // Basic markdown processing - remove markdown syntax for plain text
    const plainText = text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim();

    return {
      success: true,
      text: plainText
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      error: `Failed to extract markdown: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function extractWithOCR(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  const fileType = file.type || getFileTypeFromName(file.name);
  
  // Handle PDF files
  if (fileType === 'application/pdf') {
    return await extractFromPDF(file);
  }
  
  // Handle Word documents
  if (fileType.includes('word') || fileType.includes('document')) {
    return await extractFromWordDoc(file);
  }
  
  // Handle image files with OCR
  if (fileType.startsWith('image/')) {
    return await extractFromImage(file);
  }
  
  // Fallback to plain text extraction
  return await extractPlainText(file);
}

async function extractFromPDF(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  // PDF processing is only available server-side via the upload API
  return {
    success: false,
    text: '',
    error: 'PDF processing is only available through the file upload API. Please use the FileUpload component or API endpoint.'
  };
}

async function extractFromWordDoc(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  // Word document processing works on both client and server
  try {
    const fileType = file.type || getFileTypeFromName(file.name);
    
    // Handle .docx files with mammoth
    if (fileType.includes('openxml') || file.name.toLowerCase().endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.value && result.value.trim().length > 0) {
        return {
          success: true,
          text: result.value.trim()
        };
      } else {
        return {
          success: false,
          text: '',
          error: 'No text found in Word document.'
        };
      }
    }
    
    // Handle .doc files (older format)
    if (fileType.includes('msword') || file.name.toLowerCase().endsWith('.doc')) {
      return {
        success: false,
        text: '',
        error: 'Legacy .doc files are not supported. Please save as .docx or copy-paste the content.'
      };
    }
    
    return {
      success: false,
      text: '',
      error: 'Unsupported Word document format.'
    };
  } catch (error) {
    console.error('Word document extraction error:', error);
    return {
      success: false,
      text: '',
      error: `Word document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function extractFromImage(file: File): Promise<Omit<FileProcessResult, 'metadata'>> {
  try {
    // Import Tesseract.js dynamically
    const Tesseract = await import('tesseract.js');
    
    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);
    
    console.log(`Starting OCR for image: ${file.name}`);
    
    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker('eng');
    
    try {
      // Perform OCR on the image
      const { data: { text } } = await worker.recognize(imageUrl);
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
      await worker.terminate();
      
      if (text && text.trim().length > 0) {
        return {
          success: true,
          text: text.trim()
        };
      } else {
        return {
          success: false,
          text: '',
          error: 'No text found in the image.'
        };
      }
    } catch (ocrError) {
      // Clean up on error
      URL.revokeObjectURL(imageUrl);
      await worker.terminate();
      throw ocrError;
    }
  } catch (error) {
    console.error('Image OCR error:', error);
    return {
      success: false,
      text: '',
      error: `Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function getFileTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'json': 'application/json',
    'csv': 'text/csv',
    'html': 'text/html',
    'htm': 'text/html',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'rtf': 'application/rtf'
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

function determineExtractionMethod(fileType: string, fileName: string): string {
  // Text-based files
  if (fileType.startsWith('text/') || 
      fileType === 'application/json' ||
      fileType === 'application/xml') {
    return 'plain';
  }

  // Markdown files
  if (fileType === 'text/markdown' || 
      fileName.toLowerCase().endsWith('.md') || 
      fileName.toLowerCase().endsWith('.markdown')) {
    return 'markdown';
  }

  // Files that would need OCR
  if (fileType === 'application/pdf' ||
      fileType.startsWith('image/') ||
      fileType.includes('word') ||
      fileType.includes('office')) {
    return 'ocr';
  }

  // Default to plain text
  return 'plain';
}

export function combineFileResults(
  results: FileProcessResult[],
  outputFormat: string = 'text'
): string {
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    return 'No text could be extracted from the uploaded files.';
  }

  switch (outputFormat) {
    case 'structured':
      return JSON.stringify({
        totalFiles: results.length,
        successfulExtractions: successfulResults.length,
        files: results.map(r => ({
          fileName: r.metadata?.fileName,
          success: r.success,
          textLength: r.text.length,
          error: r.error
        })),
        extractedText: successfulResults.map(r => ({
          fileName: r.metadata?.fileName,
          text: r.text
        }))
      }, null, 2);

    case 'summary':
      const totalLength = successfulResults.reduce((sum, r) => sum + r.text.length, 0);
      const fileList = successfulResults.map(r => r.metadata?.fileName).join(', ');
      
      return `Extracted text from ${successfulResults.length} file(s): ${fileList}\n` +
             `Total characters: ${totalLength}\n\n` +
             `Combined text:\n${successfulResults.map(r => r.text).join('\n\n---\n\n')}`;

    case 'text':
    default:
      return successfulResults.map(r => r.text).join('\n\n');
  }
}

