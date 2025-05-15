import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import pdfUtilityService from '../store/PDFUtilityStore';

// Mock PDF-lib
vi.mock('pdf-lib', async () => {
    const PDFDocument = {
        create: vi.fn().mockResolvedValue({
            copyPages: vi.fn().mockResolvedValue([{}, {}, {}]),
            getPageIndices: vi.fn().mockReturnValue([0, 1, 2]),
            addPage: vi.fn(),
            save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
        }),
        load: vi.fn().mockResolvedValue({
            copyPages: vi.fn().mockResolvedValue([{}, {}, {}]),
            getPageIndices: vi.fn().mockReturnValue([0, 1, 2]),
            addPage: vi.fn(),
            save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
        })
    };

    return { PDFDocument };
});

// Mock JSZip
vi.mock('jszip', async () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            file: vi.fn(),
            generateAsync: vi.fn().mockResolvedValue(new Blob(['mock-zip-content'], { type: 'application/zip' }))
        }))
    };
});

describe('PDFUtilityStore', () => {
    // Mock browser APIs
    let createObjectURLMock: any;
    let revokeObjectURLMock: any;
    let appendChildMock: any;
    let removeChildMock: any;
    let createElementMock: any;
    let clickMock: any;
    let openMock: any;
    let addEventListener: any;

    beforeEach(() => {
        // Setup mocks for URL API
        createObjectURLMock = vi.fn().mockReturnValue('mock-url');
        revokeObjectURLMock = vi.fn();
        URL.createObjectURL = createObjectURLMock;
        URL.revokeObjectURL = revokeObjectURLMock;

        // Setup mocks for DOM manipulation
        clickMock = vi.fn();
        createElementMock = vi.fn().mockReturnValue({
            click: clickMock,
            download: '',
            href: '',
            addEventListener: vi.fn((event, handler) => {
                if (event === 'load') {
                    // Immediately call the handler
                    setTimeout(handler, 10);
                }
            })
        });
        appendChildMock = vi.fn();
        removeChildMock = vi.fn();
        document.createElement = createElementMock;
        document.body.appendChild = appendChildMock;
        document.body.removeChild = removeChildMock;

        // Setup mock for window.open
        openMock = vi.fn().mockReturnValue({
            print: vi.fn(),
            addEventListener: vi.fn((event, handler) => {
                if (event === 'load') {
                    // Immediately call the handler
                    setTimeout(handler, 10);
                }
            })
        });
        window.open = openMock;

        // Clear all mock calls between tests
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ==========================================
    // DOWNLOAD PDF TESTS
    // ==========================================
    describe('downloadPDF', () => {

        test('should use the file name for download if available', async () => {
            // Create test file with a specific name
            const file = new File(['test content'], 'important-document.pdf', { type: 'application/pdf' });

            await pdfUtilityService.downloadPDF(file);

            // Verify the created link has the correct filename
            expect(createElementMock).toHaveBeenCalledWith('a');
            expect(createElementMock.mock.results[0].value.download).toBe('important-document.pdf');
        });

        test('should handle errors gracefully', async () => {
            // Mock URL.createObjectURL to throw an error
            URL.createObjectURL = vi.fn().mockImplementation(() => {
                throw new Error('Mock URL creation error');
            });

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

            const result = await pdfUtilityService.downloadPDF(file);

            // Should return false on error
            expect(result).toBe(false);
        });

        test('should return false if no file is provided', async () => {
            const result = await pdfUtilityService.downloadPDF(null as any);

            expect(result).toBe(false);
            // No API calls should be made
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // DOWNLOAD MULTIPLE PDFs TESTS
    // ==========================================
    describe('downloadMultiplePDFs', () => {
        test('should download a single file directly if only one file provided', async () => {
            // Create a test file
            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

            // Mock downloadPDF to ensure it's called correctly
            const downloadPDFSpy = vi.spyOn(pdfUtilityService, 'downloadPDF')
                .mockResolvedValue(true);

            const result = await pdfUtilityService.downloadMultiplePDFs([file]);

            // Should use downloadPDF for a single file
            expect(result).toBe(true);
            expect(downloadPDFSpy).toHaveBeenCalledWith(file);
        });
        test('should handle errors in ZIP creation', async () => {
            // Force JSZip to fail
            vi.mock('jszip', async () => {
                return {
                    default: vi.fn().mockImplementation(() => {
                        throw new Error('Mock JSZip error');
                    })
                };
            });

            const files = [
                new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            // Temporarily disable console.error for this test
            const originalError = console.error;
            console.error = vi.fn();

            const result = await pdfUtilityService.downloadMultiplePDFs(files);

            // Should return false on error
            expect(result).toBe(false);

            // Restore console.error
            console.error = originalError;
        });

        test('should return false for empty file array', async () => {
            const result = await pdfUtilityService.downloadMultiplePDFs([]);

            expect(result).toBe(false);
            // No operations should be performed
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // PRINT PDF TESTS
    // ==========================================
    describe('printPDF', () => {

        test('should handle window open failure', async () => {
            // Mock window.open to return null (as if blocked by popup blocker)
            window.open = vi.fn().mockReturnValue(null);

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

            // Execute the method
            const result = await pdfUtilityService.printPDF(file);

            // Should return false when window.open fails
            expect(result).toBe(false);

            // Should still create and revoke the URL
            expect(createObjectURLMock).toHaveBeenCalledWith(file);
            expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
        });

        test('should handle errors gracefully', async () => {
            // Mock URL.createObjectURL to throw an error
            URL.createObjectURL = vi.fn().mockImplementation(() => {
                throw new Error('Mock URL creation error');
            });

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

            const result = await pdfUtilityService.printPDF(file);

            // Should return false on error
            expect(result).toBe(false);
        });

        test('should return false if no file is provided', async () => {
            const result = await pdfUtilityService.printPDF(null as any);

            expect(result).toBe(false);
            // No operations should be performed
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // PRINT MULTIPLE PDFs TESTS
    // ==========================================
    describe('printMultiplePDFs', () => {
        test('should print a single file directly if only one file provided', async () => {
            // Create a test file
            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

            // Mock printPDF to ensure it's called correctly
            const printPDFSpy = vi.spyOn(pdfUtilityService, 'printPDF')
                .mockResolvedValue(true);

            const result = await pdfUtilityService.printMultiplePDFs([file]);

            // Should use printPDF for a single file
            expect(result).toBe(true);
            expect(printPDFSpy).toHaveBeenCalledWith(file);
        });


        test('should handle errors in PDF merging', async () => {
            // Force pdf-lib to fail
            const originalImport = vi.importActual;
            vi.mock('pdf-lib', async () => {
                return {
                    PDFDocument: {
                        create: vi.fn().mockRejectedValue(new Error('Mock PDF creation error')),
                        load: vi.fn().mockRejectedValue(new Error('Mock PDF loading error'))
                    }
                };
            });


            const files = [
                new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['content 2'], 'file2.pdf', { type: 'application/pdf' })
            ];

            // Temporarily disable console.error for this test
            const originalError = console.error;
            console.error = vi.fn();

            const result = await pdfUtilityService.printMultiplePDFs(files);

            // Should return false on error
            expect(result).toBe(false);

            // Restore console.error
            console.error = originalError;
        });

        test('should return false for empty file array', async () => {
            const result = await pdfUtilityService.printMultiplePDFs([]);

            expect(result).toBe(false);
            // No operations should be performed
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // SCALE HIGHLIGHTS TESTS
    // ==========================================
    describe('scaleHighlights', () => {
        test('should dispatch an event with the zoom level', () => {
            // Mock the window.dispatchEvent
            const dispatchEventMock = vi.fn();
            window.dispatchEvent = dispatchEventMock;

            // Call the method
            pdfUtilityService.scaleHighlights(1.5);

            // Verify the event dispatch
            expect(dispatchEventMock).toHaveBeenCalledTimes(1);

            // Check that it's a CustomEvent with the correct name
            const event = dispatchEventMock.mock.calls[0][0];
            expect(event).toBeInstanceOf(CustomEvent);
            expect(event.type).toBe('highlight-scale-change');

            // Check that it contains the zoom level
            expect(event.detail).toEqual({ zoomLevel: 1.5 });
        });

        test('should handle various zoom levels', () => {
            // Mock the window.dispatchEvent
            const dispatchEventMock = vi.fn();
            window.dispatchEvent = dispatchEventMock;

            // Test with different zoom levels
            const zoomLevels = [0.5, 1.0, 2.0, 3.5];

            for (const zoomLevel of zoomLevels) {
                // Call the method with this zoom level
                pdfUtilityService.scaleHighlights(zoomLevel);

                // Get the latest event
                const event = dispatchEventMock.mock.calls[dispatchEventMock.mock.calls.length - 1][0];

                // Verify the zoom level in the event
                expect(event.detail.zoomLevel).toBe(zoomLevel);
            }

            // Should have dispatched an event for each zoom level
            expect(dispatchEventMock).toHaveBeenCalledTimes(zoomLevels.length);
        });
    });
});