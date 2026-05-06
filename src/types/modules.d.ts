declare module 'hpp' {
  import { Request, Response, NextFunction } from 'express';
  const hpp: (options?: { whitelist?: string[] }) => (req: Request, res: Response, next: NextFunction) => void;
  export default hpp;
}

declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: {
      size?: string | [number, number];
      margin?: number;
      margins?: { top: number; bottom: number; left: number; right: number };
      layout?: 'portrait' | 'landscape';
      info?: {
        Title?: string;
        Author?: string;
        Subject?: string;
        Keywords?: string;
      };
    });
    pipe(destination: NodeJS.WritableStream): this;
    on(event: 'pageAdded', callback: () => void): this;
    fontSize(size: number): this;
    text(text: string, options?: {
      align?: 'left' | 'center' | 'right' | 'justify';
      lineBreak?: boolean;
    }): this;
    moveDown(lines?: number): this;
    fillColor(color: string): this;
    font(fontName: string): this;
    end(): Promise<void>;
  }
  export default PDFDocument;
}