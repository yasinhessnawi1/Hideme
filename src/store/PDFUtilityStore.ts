
/**
 * Class that provides utility functions for PDF operations
 */
class PDFUtilityStore {
  /**
   * Download a PDF file to the user's device
   * @param file The PDF file to download
   * @returns Promise that resolves to true if successful
   */
  async downloadPDF(file: File): Promise<boolean> {
    if (!file) return false;

    try {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return false;
    }
  }

  /**
   * Download multiple PDF files as a ZIP archive
   * @param files Array of PDF files to download
   * @returns Promise that resolves to true if successful
   */
  async downloadMultiplePDFs(files: File[]): Promise<boolean> {
    if (!files.length) return false;

    try {
      // If only one file, use simple download
      if (files.length === 1) {
        return this.downloadPDF(files[0]);
      }

      // For multiple files, create a ZIP archive
      try {
        // Dynamic import of JSZip
        const JSZip = await import('jszip').then(module => module.default);
        const zip = new JSZip();

        // Add each file to the zip
        files.forEach(file => {
          zip.file(file.name, file);
        });

        // Generate the zip file
        const content = await zip.generateAsync({type: 'blob'});

        // Create download link
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "pdf_files.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Cleanup URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return true;
      } catch (error) {
        console.error('Error creating ZIP file:', error);
        return false;
      }
    } catch (error) {
      console.error('Error downloading PDFs:', error);
      return false;
    }
  }

  /**
   * Print a PDF file
   * @param file The PDF file to print
   * @returns A promise that resolves when the print operation is complete
   */
  async printPDF(file: File): Promise<boolean> {
    if (!file) return false;

    try {
      const url = URL.createObjectURL(file);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        return new Promise<boolean>((resolve) => {
          printWindow.addEventListener('load', () => {
            printWindow.print();
            // Cleanup URL after printing
            setTimeout(() => {
              URL.revokeObjectURL(url);
              resolve(true);
            }, 1000);
          });

          // Fallback if load event doesn't fire
          setTimeout(() => {
            URL.revokeObjectURL(url);
            resolve(false);
          }, 10000);
        });
      } else {
        URL.revokeObjectURL(url);
        console.error('Print window could not be opened. Check popup blocker settings.');
        return false;
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      return false;
    }
  }

  /**
   * Print multiple PDF files by merging them first
   * @param files Array of PDF files to print
   * @returns A promise that resolves when the print operation is complete
   */
  async printMultiplePDFs(files: File[]): Promise<boolean> {
    if (!files.length) return false;

    try {
      // If only one file, use simple print method
      if (files.length === 1) {
        return this.printPDF(files[0]);
      }

      // For multiple files, merge them before printing
      // Dynamic import of pdf-lib
      const { PDFDocument } = await import('pdf-lib');

      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each file
      for (const file of files) {
        // Convert File to ArrayBuffer
        const fileArrayBuffer = await file.arrayBuffer();

        // Load the PDF
        const pdf = await PDFDocument.load(fileArrayBuffer);

        // Get all pages
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

        // Add pages to the merged PDF
        pages.forEach(page => mergedPdf.addPage(page));
      }

      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save();

      // Convert to Blob and create URL
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Open in new window and print
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        return new Promise<boolean>((resolve) => {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up after printing
            setTimeout(() => {
              URL.revokeObjectURL(url);
              resolve(true);
            }, 1000);
          };

          // Fallback if load event doesn't fire
          setTimeout(() => {
            URL.revokeObjectURL(url);
            resolve(false);
          }, 10000);
        });
      } else {
        URL.revokeObjectURL(url);
        console.error('Print window could not be opened. Check popup blocker settings.');
        return false;
      }
    } catch (error) {
      console.error('Error printing multiple PDFs:', error);
      return false;
    }
  }

  /**
   * Scale highlights based on the current zoom level
   * @param zoomLevel The current zoom level
   */
  scaleHighlights(zoomLevel: number): void {
    // Dispatch an event that highlight components can listen for
    window.dispatchEvent(new CustomEvent('highlight-scale-change', {
      detail: { zoomLevel }
    }));
  }
}

// Create singleton instance
const pdfUtilityService = new PDFUtilityStore();
export default pdfUtilityService;
