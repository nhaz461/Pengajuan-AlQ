import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const reportExportService = {
  // Capture HTML element to high-res canvas
  async captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
    return await html2canvas(element, {
      scale: 2, // High resolution (2x for retina & sharp printing)
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
  },

  // 1. Salin sebagai Gambar (Direct Image to Clipboard for WhatsApp)
  async copyImageToClipboard(element: HTMLElement): Promise<{ success: boolean; fallbackTriggered?: boolean; message: string }> {
    try {
      const canvas = await this.captureElement(element);

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
      });

      if (!blob) {
        throw new Error('Gagal mengonversi elemen laporan ke file gambar.');
      }

      // Check if Clipboard API supports writing images
      if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        return {
          success: true,
          message: 'Laporan berhasil disalin ke clipboard! Anda dapat langsung menempelkannya (Ctrl+V / Paste) di WhatsApp atau Telegram.'
        };
      } else {
        // Fallback: download PNG automatically if clipboard image is not supported by browser
        this.downloadCanvasAsPng(canvas, `Laporan_${Date.now()}.png`);
        return {
          success: true,
          fallbackTriggered: true,
          message: 'Clipboard gambar tidak didukung browser ini. Laporan otomatis diunduh sebagai gambar PNG.'
        };
      }
    } catch (err: any) {
      console.error('Error copying image:', err);
      // Attempt fallback download on error
      try {
        const canvas = await this.captureElement(element);
        this.downloadCanvasAsPng(canvas, `Laporan_${Date.now()}.png`);
        return {
          success: true,
          fallbackTriggered: true,
          message: 'Clipboard tidak diizinkan. Laporan otomatis diunduh sebagai gambar PNG.'
        };
      } catch (e: any) {
        return {
          success: false,
          message: `Gagal memproses gambar: ${err.message}`
        };
      }
    }
  },

  // 2. Unduh PNG
  async downloadPng(element: HTMLElement, filename: string): Promise<void> {
    const canvas = await this.captureElement(element);
    this.downloadCanvasAsPng(canvas, filename);
  },

  downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  },

  // 3. Unduh PDF
  async downloadPdf(element: HTMLElement, filename: string): Promise<void> {
    const canvas = await this.captureElement(element);
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  },

  // 4. Cetak (Print Dialog)
  printReport(): void {
    window.print();
  }
};
