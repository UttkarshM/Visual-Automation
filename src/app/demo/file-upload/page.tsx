"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Copy, Download } from 'lucide-react'
import type { FileUploadResponse } from '@/hooks/useFileUpload'

export default function FileUploadDemo() {
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUploadComplete = (result: FileUploadResponse) => {
    setUploadResult(result)
    setError(null)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setUploadResult(null)
  }

  const copyToClipboard = () => {
    if (uploadResult?.combinedText) {
      navigator.clipboard.writeText(uploadResult.combinedText)
    }
  }

  const downloadAsFile = () => {
    if (!uploadResult?.combinedText) return
    
    const blob = new Blob([uploadResult.combinedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'extracted_text.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">File Upload Demo</h1>
          <p className="text-gray-600 mt-2">
            Upload and process multiple file types with automatic text extraction
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>File Upload</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onError={handleError}
                maxFiles={10}
              />

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Success Message */}
              {uploadResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700">
                    Successfully processed {uploadResult.successfulUploads} of {uploadResult.totalFiles} files
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
            </CardHeader>
            <CardContent>
              {uploadResult ? (
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex items-center space-x-1"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadAsFile}
                      className="flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Combined Text Output</Label>
                    <Textarea
                      value={uploadResult.combinedText}
                      readOnly
                      className="mt-2 min-h-[300px] text-sm"
                      placeholder="No text extracted yet..."
                    />
                  </div>

                  {/* File Details */}
                  <div>
                    <Label className="text-sm font-medium">File Processing Details</Label>
                    <div className="mt-2 space-y-2">
                      {uploadResult.files.map((file, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-sm border ${
                            file.success 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          <div className="font-medium">{file.fileName}</div>
                          <div className="text-xs">
                            {file.success ? (
                              <>
                                Size: {(file.fileSize / 1024).toFixed(1)} KB | 
                                Type: {file.mimeType} | 
                                Extracted: {file.processedText?.length || 0} characters
                              </>
                            ) : (
                              <>Error: {file.error}</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Upload files to see extracted text here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature List */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Supported File Types</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Text files (.txt, .md, .rtf)</li>
                  <li>• Documents (.pdf, .doc, .docx)</li>
                  <li>• Data files (.json, .csv, .xml)</li>
                  <li>• Web files (.html, .htm)</li>
                  <li>• Images (.jpg, .png, .gif, .bmp, .webp)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Key Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Drag and drop upload</li>
                  <li>• Progress tracking</li>
                  <li>• File validation</li>
                  <li>• Multiple extraction methods</li>
                  <li>• Flexible output formats</li>
                  <li>• Error handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

