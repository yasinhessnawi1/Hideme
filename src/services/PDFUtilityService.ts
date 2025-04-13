/**
 * PDFUtilityService provides centralized utility functions for PDF operations.
 * This service handles common operations like file management, printing, and zoom handling.
 */

import { getFileKey } from '../contexts/PDFViewerContext';

/**
 * Class that provides utility functions for PDF operations
 */
class PDFUtilityService {
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

  /**
   * Apply settings from user preferences to entity detection
   * @param userSettings The user's settings
   * @param currentSettings The current entity detection settings
   * @returns Updated settings
   */
  applyEntityDetectionSettings(userSettings: any, currentSettings: any): any {
    if (!userSettings) return currentSettings;
    
    const updatedSettings = {
      ...currentSettings,
      // Apply entity selection settings if available
      ...(userSettings.selectedMlEntities && { selectedMlEntities: userSettings.selectedMlEntities }),
      ...(userSettings.selectedAiEntities && { selectedAiEntities: userSettings.selectedAiEntities }),
      ...(userSettings.selectedGlinerEntities && { selectedGlinerEntities: userSettings.selectedGlinerEntities }),
      
      // Apply color settings if available
      ...(userSettings.presidioColor && { presidioColor: userSettings.presidioColor }),
      ...(userSettings.glinerColor && { glinerColor: userSettings.glinerColor }),
      ...(userSettings.geminiColor && { geminiColor: userSettings.geminiColor }),
    };
    
    // Dispatch an event to broadcast these settings to listening components
    window.dispatchEvent(new CustomEvent('settings-changed', {
      detail: {
        type: 'entity',
        settings: updatedSettings,
        source: 'pdfUtilityService'
      }
    }));
    
    return updatedSettings;
  }

  /**
   * Apply settings from user preferences to search functionality
   * @param userSettings The user's search settings
   * @param currentSettings The current search settings
   * @returns Updated settings
   */
  applySearchSettings(userSettings: any, currentSettings: any): any {
    if (!userSettings) return currentSettings;
    
    const updatedSettings = {
      ...currentSettings,
      // Apply search settings if available
      ...(userSettings.isAiSearch !== undefined && { isAiSearch: userSettings.isAiSearch }),
      ...(userSettings.isCaseSensitive !== undefined && { isCaseSensitive: userSettings.isCaseSensitive }),
      ...(userSettings.defaultSearchTerms && { defaultSearchTerms: userSettings.defaultSearchTerms }),
      ...(userSettings.highlightColor && { highlightColor: userSettings.highlightColor }),
    };
    
    // Dispatch an event to broadcast these settings to listening components
    window.dispatchEvent(new CustomEvent('settings-changed', {
      detail: {
        type: 'search',
        settings: updatedSettings,
        source: 'pdfUtilityService'
      }
    }));
    
    return updatedSettings;
  }
  
  /**
   * Trigger entity detection with current settings
   * This acts as a shortcut button for the entity detection process
   * @param files Array of files to process
   * @param settings The entity detection settings to use
   * @returns Promise that resolves to true if successful
   */
  async triggerEntityDetection(files: File[], settings: any): Promise<boolean> {
    try {
      // Dispatch an event to trigger entity detection
      window.dispatchEvent(new CustomEvent('trigger-entity-detection', {
        detail: {
          files,
          settings,
          source: 'pdfUtilityService'
        }
      }));
      return true;
    } catch (error) {
      console.error('Error triggering entity detection:', error);
      return false;
    }
  }
  
  /**
   * Trigger search with current settings
   * This acts as a shortcut button for the search process
   * @param searchText The text to search for
   * @param settings The search settings to use
   * @returns Promise that resolves to true if successful
   */
  async triggerSearch(searchText: string, settings: any): Promise<boolean> {
    try {
      // Dispatch an event to trigger search
      window.dispatchEvent(new CustomEvent('trigger-search', {
        detail: {
          searchText,
          settings,
          source: 'pdfUtilityService'
        }
      }));
      return true;
    } catch (error) {
      console.error('Error triggering search:', error);
      return false;
    }
  }
  
  /**
   * Trigger redaction with current settings
   * This acts as a shortcut button for the redaction process
   * @param files Array of files to process
   * @returns Promise that resolves to true if successful
   */
  async triggerRedaction(files: File[]): Promise<boolean> {
    try {
      // Dispatch an event to trigger redaction
      window.dispatchEvent(new CustomEvent('activate-redaction-panel', {
        detail: {
          files,
          source: 'pdfUtilityService'
        }
      }));
      return true;
    } catch (error) {
      console.error('Error triggering redaction:', error);
      return false;
    }
  }
  
  /**
   * Ensure highlights are properly persisted when deleted
   * @param highlightId ID of the highlight to delete
   * @param fileKey Optional file key the highlight belongs to
   * @returns Promise resolving to true if successful
   */
  async deleteHighlight(highlightId: string, fileKey?: string): Promise<boolean> {
    try {
      // First try to load the highlight utils via dynamic import
      const { cleanupFileHighlights } = await import('../utils/highlightUtils');
      
      // Dispatch an event to notify all components about the highlight deletion
      window.dispatchEvent(new CustomEvent('highlight-deleted', {
        detail: {
          highlightId,
          fileKey,
          source: 'pdfUtilityService'
        }
      }));
      
      if (fileKey) {
        // If we have a fileKey, trigger a targeted cleanup just for this highlight
        await import('../utils/HighlightManager').then(({ highlightManager }) => {
          // Remove from the highlight manager which handles all storage types
          highlightManager.removeHighlightData(highlightId);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting highlight:', error);
      return false;
    }
  }
}

// Create singleton instance
const pdfUtilityService = new PDFUtilityService();
export default pdfUtilityService;