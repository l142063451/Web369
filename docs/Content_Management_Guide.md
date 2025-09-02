# Content Management System - User Guide

This guide explains how to use the Content Manager and Media Library in the Ummid Se Hari admin panel.

## Accessing the Content Management System

1. Navigate to `/admin` in your browser
2. Authenticate with admin credentials and complete 2FA if required
3. Use the sidebar navigation to access:
   - **Content Manager**: `/admin/content`
   - **Media Library**: `/admin/media`

## Content Manager

The Content Manager allows you to create, edit, and publish pages for the public website.

### Creating a New Page

1. Click **"New Page"** button
2. Fill in the page details:
   - **Title**: The page title (will auto-generate slug)
   - **Slug**: URL-friendly version (e.g., "about-us")
   - **SEO Title**: Title for search engines
   - **SEO Description**: Meta description for search results
3. Use the rich text editor to create your content
4. Click **"Save Page"** to create as draft

### Editing Content

The Tiptap rich text editor provides:

- **Text Formatting**: Bold, italic, headings (H2-H4)
- **Lists**: Bulleted and numbered lists
- **Quotes**: Blockquotes for highlighting content
- **Links**: Add hyperlinks to other pages or external sites
- **Images**: Insert images (use Media Library for uploads)
- **Tables**: Create and edit data tables
- **Undo/Redo**: Revert changes as needed

### Page Status Workflow

1. **Draft**: Initial state, not visible to public
2. **Staged**: Ready for review (future feature)
3. **Published**: Live on the public website

### Publishing Pages

1. Open a draft page in the content list
2. Click **"Publish"** to make it live
3. Page URL becomes accessible at `/{slug}`

### Page Management

- **Search**: Use the search bar to find pages by title or slug
- **Edit**: Click the edit icon to modify content
- **Preview**: Click the eye icon to see how it will look
- **Delete**: Click the trash icon (requires confirmation)

## Media Library

The Media Library handles all file uploads with security scanning.

### Supported File Types

**Images:**
- JPEG, PNG, GIF, WebP, SVG

**Documents:**
- PDF, DOC, DOCX, TXT, Markdown

**Data Files:**
- CSV, JSON, ZIP

### Uploading Files

1. Click **"Upload File"** button
2. Select file from your computer
3. Wait for upload and security scan to complete
4. File will show "Scanning..." status initially
5. Once scanned, status changes to "Safe" or "Quarantined"

### Security Scanning

All uploaded files are automatically scanned for viruses and malware:

- **✅ Safe**: File passed security scan, available for use
- **⏳ Scanning**: File is being processed
- **🛡️ Quarantined**: File failed security scan, not available

### Managing Media Files

**File Information:**
- Click on any file to view details in the sidebar
- View file size, dimensions, upload date
- Add alt text for accessibility
- Add captions for context

**File Operations:**
- **View**: Open file in new tab
- **Download**: Save file to your computer
- **Delete**: Remove file (only if not in use)

**Usage Protection:**
Files currently used in pages cannot be deleted. The system will show which pages are using the file.

## Content Security

### HTML Sanitization

All rich text content is automatically sanitized to prevent security issues:
- Only safe HTML tags are allowed
- Dangerous scripts are removed
- Links are validated

### File Security

Multiple layers protect against malicious files:
1. **File type validation**: Only allowed extensions
2. **Size limits**: Maximum 50MB per file
3. **MIME type checking**: Content matches extension
4. **Virus scanning**: ClamAV integration
5. **Quarantine system**: Infected files isolated

### Audit Logging

All content operations are logged for security:
- Page creation, updates, publishing, deletion
- File uploads, scans, and deletions
- User actions with timestamps
- Change tracking with before/after values

## Best Practices

### Content Creation
1. Use descriptive titles and slugs
2. Write SEO-friendly meta descriptions
3. Structure content with proper headings
4. Always add alt text to images
5. Preview content before publishing

### Media Management
1. Use descriptive filenames
2. Optimize images before upload
3. Add meaningful alt text and captions
4. Organize files logically
5. Remove unused files regularly

### Security
1. Only upload trusted files
2. Scan files from external sources
3. Review quarantined files carefully
4. Keep file sizes reasonable
5. Use appropriate file formats

## Troubleshooting

### Upload Issues
- **File too large**: Compress or use smaller files
- **Invalid file type**: Check supported formats
- **Scan failed**: Contact administrator

### Content Issues
- **Slug conflicts**: Use unique, descriptive slugs
- **Publishing errors**: Check all required fields
- **Formatting problems**: Use editor tools properly

### Access Issues
- **Permission denied**: Contact administrator for role assignment
- **2FA required**: Complete two-factor authentication setup

## Getting Help

For technical support or questions about the content management system, contact the system administrator or refer to the admin documentation.