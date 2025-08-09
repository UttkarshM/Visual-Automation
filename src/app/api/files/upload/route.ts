import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.pdf', '.doc', '.docx', '.rtf', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'text/html',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/rtf',
  'application/xml',
  'text/xml',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp'
]

interface FileUploadResult {
  success: boolean
  fileName: string
  filePath?: string
  fileSize: number
  mimeType: string
  error?: string
  processedText?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const extractionMethod = formData.get('extractionMethod') as string || 'auto'
    const outputFormat = formData.get('outputFormat') as string || 'text'
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate files
    const validationErrors: string[] = []
    files.forEach((file, index) => {
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`File ${index + 1} (${file.name}) exceeds maximum size of 10MB`)
      }
      
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        validationErrors.push(`File ${index + 1} (${file.name}) has unsupported extension: ${extension}`)
      }
      
      if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        validationErrors.push(`File ${index + 1} (${file.name}) has unsupported MIME type: ${file.type}`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "File validation failed", details: validationErrors },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Process each file
    const results: FileUploadResult[] = []
    
    for (const file of files) {
      try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2)
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        const uniqueFileName = `${timestamp}_${randomId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = join(uploadDir, uniqueFileName)

        // Save file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        // Process file content based on extraction method
        let processedText = ''
        try {
          processedText = await extractTextFromFile(file, extractionMethod)
        } catch (extractionError) {
          console.warn(`Text extraction failed for ${file.name}:`, extractionError)
        }

        results.push({
          success: true,
          fileName: file.name,
          filePath: `/uploads/${uniqueFileName}`,
          fileSize: file.size,
          mimeType: file.type || getMimeTypeFromExtension(extension),
          processedText
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        results.push({
          success: false,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    // Format the combined output
    const combinedText = formatCombinedOutput(results, outputFormat)

    return NextResponse.json({
      success: true,
      files: results,
      combinedText,
      totalFiles: files.length,
      successfulUploads: results.filter(r => r.success).length
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: "Internal server error during file upload" },
      { status: 500 }
    )
  }
}

async function extractTextFromFile(file: File, extractionMethod: string): Promise<string> {
  const fileType = file.type || getMimeTypeFromExtension('.' + file.name.split('.').pop()?.toLowerCase())
  
  // Determine extraction method
  let method = extractionMethod
  if (extractionMethod === 'auto') {
    method = determineExtractionMethod(fileType, file.name)
  }

  switch (method) {
    case 'plain':
      return await extractPlainText(file)
    case 'markdown':
      return await extractMarkdown(file)
    case 'json':
      return await extractJSON(file)
    case 'csv':
      return await extractCSV(file)
    case 'html':
      return await extractHTML(file)
    case 'pdf':
      return await extractPDF(file)
    case 'docx':
      return await extractWordDoc(file)
    case 'ocr':
      return await extractWithOCR(file)
    default:
      return await extractPlainText(file)
  }
}

async function extractPlainText(file: File): Promise<string> {
  const text = await file.text()
  return text.trim()
}

async function extractMarkdown(file: File): Promise<string> {
  const text = await file.text()
  // Basic markdown processing - remove markdown syntax for plain text
  return text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
    .replace(/`(.*?)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .trim()
}

async function extractJSON(file: File): Promise<string> {
  const text = await file.text()
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return text.trim()
  }
}

async function extractCSV(file: File): Promise<string> {
  const text = await file.text()
  // Basic CSV formatting - convert to readable format
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
}

async function extractHTML(file: File): Promise<string> {
  const text = await file.text()
  // Basic HTML text extraction - remove tags
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function extractPDF(file: File): Promise<string> {
  try {
    // Import pdf-parse dynamically
    const pdfParse = await import('pdf-parse')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const data = await pdfParse.default(buffer)
    
    if (data.text && data.text.trim().length > 0) {
      return data.text.trim()
    } else {
      return 'No text found in PDF. This might be a scanned document.'
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    return `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function extractWordDoc(file: File): Promise<string> {
  try {
    const fileType = file.type || getMimeTypeFromExtension('.' + file.name.split('.').pop()?.toLowerCase())
    
    // Only handle .docx files (not legacy .doc)
    if (fileType.includes('openxml') || file.name.toLowerCase().endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      const result = await mammoth.extractRawText({ buffer })
      
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim()
      } else {
        return 'No text found in Word document.'
      }
    } else {
      return 'Legacy .doc files are not supported. Please save as .docx.'
    }
  } catch (error) {
    console.error('Word document extraction error:', error)
    return `Word document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function extractWithOCR(file: File): Promise<string> {
  try {
    const fileType = file.type || getMimeTypeFromExtension('.' + file.name.split('.').pop()?.toLowerCase())
    
    // Handle different file types that might need OCR
    if (fileType === 'application/pdf') {
      return await extractPDF(file)
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return await extractWordDoc(file)
    } else if (fileType.startsWith('image/')) {
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js')
      
      // Create object URL for the image
      const imageUrl = URL.createObjectURL(file)
      
      console.log(`Starting OCR for image: ${file.name}`)
      
      // Initialize Tesseract worker
      const worker = await Tesseract.createWorker('eng')
      
      try {
        // Perform OCR on the image
        const { data: { text } } = await worker.recognize(imageUrl)
        
        // Clean up
        URL.revokeObjectURL(imageUrl)
        await worker.terminate()
        
        if (text && text.trim().length > 0) {
          return text.trim()
        } else {
          return 'No text found in the image.'
        }
      } catch (ocrError) {
        // Clean up on error
        URL.revokeObjectURL(imageUrl)
        await worker.terminate()
        throw ocrError
      }
    } else {
      // Fallback to plain text
      return await extractPlainText(file)
    }
  } catch (error) {
    console.error('OCR extraction error:', error)
    return `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

function determineExtractionMethod(fileType: string, fileName: string): string {
  // Text-based files
  if (fileType.startsWith('text/plain')) return 'plain'
  if (fileType === 'text/markdown' || fileName.toLowerCase().endsWith('.md')) return 'markdown'
  if (fileType === 'application/json' || fileName.toLowerCase().endsWith('.json')) return 'json'
  if (fileType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) return 'csv'
  if (fileType === 'text/html' || fileName.toLowerCase().endsWith('.html')) return 'html'
  
  // PDF files
  if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) return 'pdf'
  
  // Word documents
  if (fileType.includes('word') || fileType.includes('document') || 
      fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) {
    return 'docx'
  }
  
  // Image files (will use OCR)
  if (fileType.startsWith('image/') || 
      fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
    return 'ocr'
  }
  
  // Default to plain text
  return 'plain'
}

function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.rtf': 'application/rtf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp'
  }
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

function formatCombinedOutput(results: FileUploadResult[], outputFormat: string): string {
  const successfulResults = results.filter(r => r.success && r.processedText)
  
  if (successfulResults.length === 0) {
    return 'No text could be extracted from the uploaded files.'
  }

  switch (outputFormat) {
    case 'structured':
      return JSON.stringify({
        totalFiles: results.length,
        successfulExtractions: successfulResults.length,
        files: results.map(r => ({
          fileName: r.fileName,
          success: r.success,
          fileSize: r.fileSize,
          mimeType: r.mimeType,
          textLength: r.processedText?.length || 0,
          error: r.error
        })),
        extractedText: successfulResults.map(r => ({
          fileName: r.fileName,
          text: r.processedText
        }))
      }, null, 2)

    case 'summary':
      const totalLength = successfulResults.reduce((sum, r) => sum + (r.processedText?.length || 0), 0)
      const fileList = successfulResults.map(r => r.fileName).join(', ')
      
      return `Extracted text from ${successfulResults.length} file(s): ${fileList}\n` +
             `Total characters: ${totalLength}\n\n` +
             `Combined text:\n${successfulResults.map(r => r.processedText).join('\n\n---\n\n')}`

    case 'text':
    default:
      return successfulResults.map(r => r.processedText).join('\n\n')
  }
}

