# Visual Automation Platform

A powerful visual workflow automation platform built with Next.js, React Flow, and AI integration. Create, execute, and manage complex automation workflows through an intuitive drag-and-drop interface.

![Visual Automation Platform](https://img.shields.io/badge/Next.js-15.4.4-black?style=flat-square&logo=next.js)
![React Flow](https://img.shields.io/badge/React%20Flow-11.11.4-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)

## 🌟 Features

### Core Functionality
- **Visual Workflow Builder**: Drag-and-drop interface for creating complex automation workflows
- **Node-Based Architecture**: Multiple node types for different operations
- **Real-time Execution**: Execute workflows with live status updates
- **Data Flow Management**: Automatic data passing between connected nodes
- **Template Variables**: Dynamic content injection using `{{variable}}` syntax

### Supported Node Types
- **Input Node**: Starting point for workflows with text or file inputs
- **File Upload Node**: Process multiple file types with text extraction
- **AI Prompt Node**: Integration with Google Gemini AI models
- **API Node**: HTTP requests to external services
- **Logic Node**: Conditional branching and decision making
- **Output Node**: Format and export workflow results

### File Processing Capabilities
- **Document Types**: PDF, DOC, DOCX, TXT, MD, RTF
- **Data Formats**: JSON, CSV, XML, HTML
- **Images**: JPG, PNG, GIF, BMP, WEBP (with OCR)
- **Text Extraction**: Multiple methods including OCR for images and scanned documents
- **Smart Processing**: Auto-detection of optimal extraction methods

### AI Integration
- **Google Gemini**: Multiple model support (Flash, Pro, 1.0)
- **Template Processing**: Dynamic prompt generation with workflow data
- **Response Handling**: Structured AI output processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Google Gemini API key
- Supabase account (for data persistence)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd automation
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Database Setup**
   Run the SQL script to create necessary tables:
   ```bash
   # Execute scripts/create-tables.sql in your Supabase SQL editor
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Creating Your First Workflow

1. **Add Nodes**: Use the toolbar to drag nodes onto the canvas
2. **Configure Nodes**: Click on nodes to configure their settings in the sidebar
3. **Connect Nodes**: Drag from output handles to input handles to create connections
4. **Set Up Data Flow**: Use template variables like `{{input_1.data}}` to pass data between nodes
5. **Execute**: Click the "Run" button to execute your workflow

### Example Workflow: Document Analysis

```
File Upload Node → AI Prompt Node → Output Node
```

1. **File Upload Node**: Upload a PDF document
2. **AI Prompt Node**: Configure prompt as "Analyze this document: {{fileUpload_1.data}}"
3. **Output Node**: Format the AI analysis as JSON
4. **Execute**: Run the workflow to get AI-powered document analysis

### Template Variables

Reference data from previous nodes using template syntax:

- `{{nodeId}}` - Entire output object
- `{{nodeId.data}}` - Specific data property
- `{{nodeId.property}}` - Any node property

**Examples**:
```javascript
// Input node data
"Process this text: {{input_1.data}}"

// File upload content
"Analyze the following document: {{fileUpload_1.processedText}}"

// API response
"Based on the API result {{api_1.data}}, generate a summary"

// Logic node results
"The condition result was: {{logic_1.result}}"
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **State Management**: Redux Toolkit with Redux Persist
- **UI Framework**: Tailwind CSS, Radix UI components
- **Workflow Engine**: React Flow for visual workflows
- **AI Integration**: Google Generative AI (Gemini)
- **File Processing**: Mammoth (DOCX), PDF-Parse, Tesseract.js (OCR)
- **Database**: Supabase (PostgreSQL with RLS)
- **Icons**: Lucide React

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── files/         # File upload endpoints
│   │   └── workflows/     # Workflow execution endpoints
│   └── demo/              # Demo pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── *-node.tsx        # Workflow node components
│   ├── workflow-editor.tsx # Main workflow canvas
│   └── workflow-sidebar.tsx # Node configuration sidebar
├── hooks/                 # Custom React hooks
├── store/                 # Redux store configuration
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
    ├── file-processor.ts  # File processing logic
    ├── gemini-api.ts      # AI integration
    └── workflow-context.ts # Workflow execution context
```

## 🔧 Configuration

### File Upload Settings
- **Max File Size**: 10MB per file
- **Max Files**: 10 files per upload
- **Storage**: Local `uploads/` directory
- **Supported Formats**: 15+ file types with intelligent processing

### AI Model Configuration
Supported Gemini models:
- `gemini-1.5-flash` (fast, efficient)
- `gemini-1.5-pro` (advanced reasoning)
- `gemini-1.0-pro` (stable version)

### Database Schema
The platform uses Supabase with the following main tables:
- `workflows` - Workflow definitions
- `workflow_executions` - Execution history
- `node_executions` - Detailed node execution logs
- `user_integrations` - User API keys and configurations

## 🚀 Demo Pages

### File Upload Demo (`/demo/file-upload`)
Standalone demonstration of file upload and processing capabilities.

### Workflow Integration Demo (`/demo/workflow-with-files`)
Complete workflow builder showcasing file processing integrated with AI and logic nodes.

## 📚 API Reference

### File Upload API
**POST** `/api/files/upload`

Upload and process files with text extraction.

**Request**:
```javascript
FormData {
  files: File[],              // Files to upload
  extractionMethod?: string,  // 'auto', 'plain', 'ocr', etc.
  outputFormat?: string       // 'text', 'summary', 'structured'
}
```

**Response**:
```javascript
{
  success: boolean,
  files: FileUploadResult[],
  combinedText: string,
  totalFiles: number,
  successfulUploads: number
}
```

### Workflow Execution API
**POST** `/api/workflows/nodes`

Execute a workflow with nodes and edges.

**Request**:
```javascript
{
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
}
```

**Response**:
```javascript
{
  success: boolean,
  result: WorkflowContext,
  executedNodes: number,
  error?: string
}
```

## 🛠️ Development

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

### Custom Node Development
To create custom node types:

1. Define the node configuration interface in `src/types/workflow.ts`
2. Create the node component in `src/components/your-node.tsx`
3. Add the node type to the workflow editor's node types
4. Implement execution logic in the workflow API

## 🔒 Security

### File Upload Security
- File type validation
- Size limits to prevent DoS
- Secure file storage
- Input sanitization

### API Security
- Environment variable protection
- Row Level Security (RLS) in Supabase
- Request validation
- Error handling without information leakage

## 🚨 Troubleshooting

### Common Issues

**Large files timing out**
- Reduce file size or increase server timeout
- Use streaming for very large files

**OCR not working**
- Check browser compatibility
- Ensure Tesseract.js is properly loaded

**AI requests failing**
- Verify GEMINI_API_KEY is set correctly
- Check API quota and billing status

**Workflow execution errors**
- Check browser console for detailed errors
- Verify node connections and configurations
- Ensure template variables reference existing nodes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **React Flow** for the excellent workflow visualization library
- **Google Generative AI** for powerful AI capabilities
- **Supabase** for backend infrastructure
- **Vercel** for deployment platform
- **Open Source Community** for various processing libraries

---

**Built with ❤️ using Next.js and modern web technologies**
