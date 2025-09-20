# HTMLParsingService API Documentation

## Overview

HTMLParsingService provides comprehensive HTML parsing and analysis capabilities, including DOM structure analysis, metadata extraction, link analysis, and image analysis. Built on Cheerio for robust HTML document parsing.

**Key Features:**
- HTML parsing with Cheerio integration
- Comprehensive content analysis (meta tags, headings, text, links, images)
- SEO and accessibility analysis
- Performance optimization options
- Built-in error handling and recovery

## Quick Start

```javascript path=null start=null
import HTMLParsingService from './backend/engines/shared/services/HTMLParsingService.js';

const htmlService = new HTMLParsingService();
await htmlService.initialize();

// Basic parsing
const result = htmlService.parseHTML('<h1>Hello World</h1>');

// Advanced analysis
const analysis = await htmlService.analyzeHTML(htmlString, {
  baseUrl: 'https://example.com',
  includeImages: true,
  includeLinks: true
});
```

## Core Methods

### `parseHTML(htmlString, options?)`

Parses HTML string and returns Cheerio object with basic document information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `htmlString` | `string` | Yes | HTML source code to parse |
| `options` | `ParseOptions` | No | Parsing configuration options |

#### ParseOptions

```typescript path=null start=null
interface ParseOptions {
  xmlMode?: boolean;                    // Enable XML mode (default: false)
  decodeEntities?: boolean;             // Decode HTML entities (default: true)
  lowerCaseAttributeNames?: boolean;    // Convert attribute names to lowercase (default: false)
  recognizeSelfClosing?: boolean;       // Recognize self-closing tags (default: true)
}
```

#### Return Value

```typescript path=null start=null
interface ParseResult {
  success: boolean;
  data?: {
    $: CheerioRoot;           // Cheerio DOM object
    document: DocumentInfo;   // Basic document information
    parseTime: number;        // Parse time in milliseconds
    elementCount: number;     // Total number of elements
    textLength: number;       // Total text content length
  };
  error?: string;             // Error message if parsing failed
}
```

#### Example

```javascript path=null start=null
const result = htmlService.parseHTML(`
  <html>
    <head><title>Test Page</title></head>
    <body>
      <h1>Hello World</h1>
      <p>This is a test page.</p>
    </body>
  </html>
`);

if (result.success) {
  const $ = result.data.$;
  console.log('Title:', $('title').text());
  console.log('Parse time:', result.data.parseTime + 'ms');
}
```

### `analyzeHTML(htmlString, options?)`

Performs comprehensive HTML analysis, extracting structured information about content, SEO, accessibility, and performance.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `htmlString` | `string` | Yes | HTML source code to analyze |
| `options` | `AnalysisOptions` | No | Analysis configuration options |

#### AnalysisOptions

```typescript path=null start=null
interface AnalysisOptions {
  baseUrl?: string;                     // Base URL for resolving relative links
  includeTextContent?: boolean;         // Include text content analysis (default: true)
  includeImages?: boolean;              // Include image analysis (default: true)
  includeLinks?: boolean;               // Include link analysis (default: true)
  includeForms?: boolean;               // Include form analysis (default: true)
  includeScripts?: boolean;             // Include script analysis (default: true)
  includeStyles?: boolean;              // Include style analysis (default: true)
  includeAccessibility?: boolean;       // Include accessibility analysis (default: true)
  analyzePerformance?: boolean;         // Include performance analysis (default: true)
}
```

#### Return Value

```typescript path=null start=null
interface AnalysisResult {
  success: boolean;
  data?: {
    document: DocumentInfo;           // Basic document information
    metaTags: MetaAnalysis;          // Meta tag analysis
    headingStructure: HeadingAnalysis; // Heading structure analysis
    textContent: TextAnalysis;       // Text content analysis
    links: LinkAnalysis;             // Link analysis
    images: ImageAnalysis;           // Image analysis
    forms: FormAnalysis;             // Form analysis
    scripts: ScriptAnalysis;         // Script analysis
    styles: StyleAnalysis;           // Style analysis
    accessibility: AccessibilityAnalysis; // Accessibility analysis
    performance: PerformanceAnalysis; // Performance analysis
  };
  error?: string;
}
```

#### Example

```javascript path=null start=null
const analysis = await htmlService.analyzeHTML(htmlString, {
  baseUrl: 'https://example.com',
  includeImages: true,
  includeLinks: true
});

if (analysis.success) {
  const { metaTags, headingStructure, images, links } = analysis.data;
  
  console.log('Page title:', metaTags.metaData.title);
  console.log('H1 headings:', headingStructure.h1Count);
  console.log('Total images:', images.totalCount);
  console.log('Total links:', links.totalCount);
}
```

## Data Structures

### DocumentInfo

Basic document information extracted during parsing.

```typescript path=null start=null
interface DocumentInfo {
  doctype: string;           // DOCTYPE declaration
  htmlVersion: string;       // HTML version (e.g., "5", "4.01")
  lang: string;             // Language attribute from <html>
  charset: string;          // Character encoding
  elementCount: number;     // Total number of elements
  textLength: number;       // Total text content length
  parseTime: number;        // Parse time in milliseconds
}
```

### MetaAnalysis

Comprehensive meta tag analysis for SEO and social media.

```typescript path=null start=null
interface MetaAnalysis {
  metaData: {
    title: string;              // Page title
    description: string;        // Meta description
    keywords: string;           // Meta keywords
    author: string;             // Author meta tag
    viewport: string;           // Viewport configuration
    charset: string;            // Character encoding
    robots: string;             // Robot instructions
    canonical: string;          // Canonical URL
    ogTitle: string;            // OpenGraph title
    ogDescription: string;      // OpenGraph description
    ogImage: string;            // OpenGraph image
    twitterCard: string;        // Twitter card type
  };
  metaTags: MetaTag[];          // All meta tags with details
  totalCount: number;           // Total meta tag count
  seoRelevantCount: number;     // SEO-relevant tag count
  socialMediaTags: MetaTag[];   // Social media specific tags
  structuredData: StructuredData[]; // JSON-LD and microdata
}

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
  httpEquiv?: string;
}
```

### HeadingAnalysis

Analysis of heading structure and hierarchy for SEO and accessibility.

```typescript path=null start=null
interface HeadingAnalysis {
  headings: Heading[];          // All headings with details
  totalCount: number;           // Total heading count
  h1Count: number;             // H1 count
  h2Count: number;             // H2 count
  h3Count: number;             // H3 count
  h4Count: number;             // H4 count
  h5Count: number;             // H5 count
  h6Count: number;             // H6 count
  hasH1: boolean;              // Whether H1 exists
  hasMultipleH1: boolean;      // Whether multiple H1s exist
  hierarchy: {
    isProper: boolean;         // Whether hierarchy is proper
    issues: string[];          // Hierarchy issues
  };
}

interface Heading {
  level: number;               // Heading level (1-6)
  text: string;                // Heading text content
  id: string;                  // ID attribute
  classes: string[];           // CSS classes
  tag: string;                 // Tag name (h1, h2, etc.)
}
```

### TextAnalysis

Comprehensive text content analysis for readability and content quality.

```typescript path=null start=null
interface TextAnalysis {
  totalText: string;                      // All text content
  visibleText: string;                    // Visible text content only
  wordCount: number;                      // Total word count
  characterCount: number;                 // Total character count
  sentenceCount: number;                  // Total sentence count
  paragraphCount: number;                 // Total paragraph count
  averageWordsPerSentence: number;        // Average words per sentence
  averageSentencesPerParagraph: number;   // Average sentences per paragraph
  textToHtmlRatio: number;                // Text to HTML ratio
  language: string;                       // Detected language
}
```

### LinkAnalysis

Analysis of all links in the document for SEO and security.

```typescript path=null start=null
interface LinkAnalysis {
  links: Link[];                         // All links with details
  totalCount: number;                    // Total link count
  internal: number;                      // Internal link count
  external: number;                      // External link count
  email: number;                         // Email link count
  telephone: number;                     // Telephone link count
  nofollow: number;                      // Links with nofollow
  externalWithoutNoopener: number;       // External links missing noopener
  broken: Link[];                        // Potentially broken links
  duplicates: Link[];                    // Duplicate links
}

interface Link {
  href: string;                          // Link URL
  text: string;                          // Link text content
  title: string;                         // Title attribute
  rel: string;                           // Rel attribute
  target: string;                        // Target attribute
  isInternal: boolean;                   // Whether internal link
  isExternal: boolean;                   // Whether external link
  isEmail: boolean;                      // Whether email link
  isTel: boolean;                        // Whether telephone link
  hasNofollow: boolean;                  // Whether has nofollow attribute
}
```

### ImageAnalysis

Comprehensive image analysis for performance and accessibility.

```typescript path=null start=null
interface ImageAnalysis {
  images: Image[];                       // All images with details
  totalCount: number;                    // Total image count
  withAlt: number;                       // Images with alt text
  withoutAlt: number;                    // Images without alt text
  withDimensions: number;                // Images with width/height
  lazyLoaded: number;                    // Lazy-loaded images
  responsive: number;                    // Responsive images (with srcset)
  formats: { [format: string]: number }; // Format distribution
  avgFileSize: number;                   // Average estimated file size
  issues: string[];                      // Image issues list
}

interface Image {
  src: string;                           // Image source URL
  alt: string;                           // Alt attribute
  title: string;                         // Title attribute
  width: string;                         // Width attribute
  height: string;                        // Height attribute
  loading: string;                       // Loading attribute (lazy, eager)
  srcset: string;                        // Responsive image set
  sizes: string;                         // Sizes attribute
  isLazy: boolean;                       // Whether lazy loaded
  hasAlt: boolean;                       // Whether has alt attribute
  format: string;                        // Image format (jpg, png, webp, etc.)
}
```
## Analysis Methods

These methods can be called independently to perform specific analysis tasks.

### `extractMetaTags($)`

Extracts and analyzes meta tags from a Cheerio object.

```typescript path=null start=null
extractMetaTags($: CheerioRoot): MetaAnalysis
```

### `analyzeHeadingStructure($)`

Analyzes heading structure and hierarchy.

```typescript path=null start=null
analyzeHeadingStructure($: CheerioRoot): HeadingAnalysis
```

### `extractTextContent($)`

Extracts and analyzes text content.

```typescript path=null start=null
extractTextContent($: CheerioRoot): TextAnalysis
```

### `analyzeLinks($, baseUrl?)`

Analyzes all links in the document.

```typescript path=null start=null
analyzeLinks($: CheerioRoot, baseUrl?: string): LinkAnalysis
```

### `analyzeImages($, baseUrl?)`

Analyzes all images in the document.

```typescript path=null start=null
analyzeImages($: CheerioRoot, baseUrl?: string): ImageAnalysis
```

## Utility Methods

### `isValidHTML(htmlString)`

Validates HTML string structure.

```typescript path=null start=null
isValidHTML(htmlString: string): boolean
```

### `sanitizeHTML(htmlString, options?)`

Sanitizes HTML by removing dangerous content.

```typescript path=null start=null
sanitizeHTML(htmlString: string, options?: SanitizeOptions): string
```

### `extractText($, selector)`

Extracts text content from specific CSS selector.

```typescript path=null start=null
extractText($: CheerioRoot, selector: string): string
```
**返回值:** `string` - 提取的文本

## Error Handling

The service includes comprehensive error handling and recovery mechanisms.

```javascript path=null start=null
try {
  const result = await htmlService.analyzeHTML(invalidHTML);
  if (!result.success) {
    console.error('Analysis failed:', result.error);
    return;
  }
  // Process successful result
  console.log('Analysis completed:', result.data);
} catch (error) {
  if (error.code === ErrorCode.PARSING_INVALID_HTML) {
    console.error('Invalid HTML structure:', error.message);
  } else if (error.code === ErrorCode.DEPENDENCY_MISSING) {
    console.error('Missing dependency:', error.message);
  }
}
```

### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 6000 | `PARSING_FAILED` | General parsing failure |
| 6001 | `PARSING_INVALID_HTML` | Invalid HTML format |
| 6004 | `PARSING_ENCODING_ERROR` | Character encoding error |
| 3000 | `DEPENDENCY_MISSING` | Missing required dependency (e.g., cheerio) |

## Performance Optimization

### Large Document Handling

```javascript path=null start=null
// For large HTML documents, limit analysis scope
const result = await htmlService.analyzeHTML(largeHTML, {
  includeScripts: false,      // Skip script analysis
  includeStyles: false,       // Skip style analysis
  includePerformance: false,  // Skip performance analysis
  includeForms: false         // Skip form analysis
});
```

### Batch Processing

```javascript path=null start=null
// Process multiple documents concurrently
const htmlDocuments = [html1, html2, html3];
const results = await Promise.all(
  htmlDocuments.map(html => 
    htmlService.analyzeHTML(html, { includeImages: true })
  )
);

// Process results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Document ${index + 1}: ${result.data.metaTags.metaData.title}`);
  }
});
```

### Performance Metrics

| Document Size | Parse Time | Memory Usage |
|---------------|------------|-------------|
| Small (<10KB) | ~5ms | ~2-3x HTML size |
| Medium (10-100KB) | ~15-50ms | ~2-3x HTML size |
| Large (>100KB) | ~50-200ms | ~2-4x HTML size |

## Usage Examples

### Basic HTML Parsing

```javascript path=null start=null
const htmlService = new HTMLParsingService();
await htmlService.initialize();

const html = '<div><h1>Welcome</h1><p>Hello World</p></div>';
const parseResult = htmlService.parseHTML(html);

if (parseResult.success) {
  const $ = parseResult.data.$;
  console.log('Title:', $('h1').text());
  console.log('Content:', $('p').text());
  console.log('Parse time:', parseResult.data.parseTime + 'ms');
}
```

### SEO Analysis

```javascript path=null start=null
const analysis = await htmlService.analyzeHTML(htmlString, {
  baseUrl: 'https://example.com',
  includeImages: true,
  includeLinks: true
});

if (!analysis.success) {
  console.error('Analysis failed:', analysis.error);
  return;
}

const { metaTags, headingStructure, images } = analysis.data;
const seoIssues = [];

// Check essential SEO elements
if (!metaTags.metaData.title) seoIssues.push('Missing page title');
if (!metaTags.metaData.description) seoIssues.push('Missing meta description');
if (headingStructure.h1Count === 0) seoIssues.push('Missing H1 tag');
if (headingStructure.h1Count > 1) seoIssues.push('Multiple H1 tags');
if (images.withoutAlt > 0) seoIssues.push(`${images.withoutAlt} images missing alt text`);

console.log('SEO Issues:', seoIssues.length ? seoIssues : 'No issues found');
```

### Content Quality Assessment

```javascript path=null start=null
const analysis = await htmlService.analyzeHTML(htmlString);
const { textContent, headingStructure } = analysis.data;

const qualityScore = {
  wordCount: textContent.wordCount,
  readability: textContent.averageWordsPerSentence < 20 ? 'Good' : 'Needs improvement',
  contentDensity: textContent.textToHtmlRatio,
  structure: headingStructure.hierarchy.isProper ? 'Well structured' : 'Poor structure'
};

console.log('Content Quality:', qualityScore);
```

### Link Audit

```javascript path=null start=null
const analysis = await htmlService.analyzeHTML(htmlString, {
  baseUrl: 'https://mysite.com',
  includeLinks: true
});

const { links } = analysis.data;

console.log('Link Audit Results:');
console.log(`├─ Total links: ${links.totalCount}`);
console.log(`├─ Internal: ${links.internal}`);
console.log(`├─ External: ${links.external}`);
console.log(`└─ Security issues: ${links.externalWithoutNoopener}`);

// List problematic external links
if (links.externalWithoutNoopener > 0) {
  const unsafeLinks = links.links
    .filter(link => link.isExternal && !link.rel.includes('noopener'))
    .map(link => link.href);
  console.log('External links without noopener:', unsafeLinks);
}
```

## Best Practices

### 1. Always Initialize
```javascript path=null start=null
const htmlService = new HTMLParsingService();
const isReady = await htmlService.initialize();
if (!isReady) {
  throw new Error('HTMLParsingService initialization failed');
}
```

### 2. Handle Errors Gracefully
```javascript path=null start=null
try {
  const result = await htmlService.analyzeHTML(html);
  return result.success ? result.data : null;
} catch (error) {
  console.error('HTML analysis error:', error.message);
  return null;
}
```

### 3. Optimize for Large Documents
```javascript path=null start=null
// For documents >100KB, be selective
const options = {
  includeScripts: false,
  includeStyles: false,
  analyzePerformance: false
};
```

### 4. Use Base URLs for Accurate Link Analysis
```javascript path=null start=null
const analysis = await htmlService.analyzeHTML(html, {
  baseUrl: 'https://example.com',  // Essential for relative URLs
  includeLinks: true
});
```

### 5. Memory Management
```javascript path=null start=null
// Process large batches in chunks
const chunkSize = 10;
for (let i = 0; i < documents.length; i += chunkSize) {
  const chunk = documents.slice(i, i + chunkSize);
  const results = await Promise.all(
    chunk.map(doc => htmlService.analyzeHTML(doc))
  );
  // Process results immediately to free memory
  await processResults(results);
}
```

## Related Documentation

- [BaseService](./BaseService.md) - Base service functionality
- [ContentAnalysisService](./ContentAnalysisService.md) - Content analysis service
- [Error Handling Guide](../errors/ErrorHandling.md) - Error handling patterns
- [Performance Guidelines](../performance/Optimization.md) - Performance optimization tips
