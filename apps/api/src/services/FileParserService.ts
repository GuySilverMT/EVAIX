export type PdfParser = (content: Buffer) => Promise<{ text: string }>;

export class FileParserService {
  private pdfParse: PdfParser | null = null;
  private mammoth: typeof import('mammoth') | null = null;

  public async parseFile(fileExtension: string, content: Buffer, textExtensions: string[]): Promise<string> {
    if (textExtensions.includes(fileExtension)) {
      return content.toString('utf-8');
    }

    switch (fileExtension) {
      case '.pdf':
        if (!this.pdfParse) {
          const mod = await import('pdf-parse') as { default?: PdfParser } | PdfParser;
          this.pdfParse = (mod as { default?: PdfParser }).default || (mod as PdfParser);
        }
        if (this.pdfParse) {
          const data = await this.pdfParse(content);
          return data.text;
        }
        return '';
      case '.docx':
        if (!this.mammoth) {
          const mod = await import('mammoth');
          this.mammoth = mod.default || mod;
        }
        if (this.mammoth) {
          const result = await this.mammoth.extractRawText({ buffer: content });
          return result.value;
        }
        return '';
      case '.png':
        // TODO: Implement PNG parsing using a multimodal LLM
        console.log('PNG parsing not yet implemented.');
        return 'PNG content placeholder';
      default:
        throw new Error(`Unsupported file type for parsing: ${fileExtension}`);
    }
  }
}

export const fileParserService = new FileParserService();
