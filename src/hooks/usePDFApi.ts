import {useState} from 'react';
import {RedactionMapping} from '../contexts/PDFContext';
import {
    detectAi,
    detectGliner,
    detectPresidio,
    extractText,
    normalizeRedactionMapping,
    redactPdf
} from '../services/backendApiService';
import {ExtracteText} from "../types/pdfTypes";

/**
 * Hook for calling backend PDF-related API endpoints.
 */
export const usePDFApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Calls the AI detection endpoint.
     * @param pdfFile PDF file to analyze.
     * @param requestedEntities Array of requested entity types.
     * @returns Parsed redaction mapping JSON.
     */
    const runDetectAi = async (pdfFile: File, requestedEntities: string[]): Promise<RedactionMapping> => {
        setLoading(true);
        setError(null);
        try {
            const result = await detectAi(pdfFile, requestedEntities);
            return normalizeRedactionMapping(result);
        } catch (err: any) {
            setError(err.message || 'Error detecting AI entities');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calls the ML detection endpoint.
     * @param pdfFile PDF file to analyze.
     * @param requestedEntities Array of requested entity types.
     * @returns Parsed redaction mapping JSON.
     */
    const runDetectPresidio = async (pdfFile: File, requestedEntities: string[]): Promise<RedactionMapping> => {
        setLoading(true);
        setError(null);
        try {
            const result = await detectPresidio(pdfFile, requestedEntities);
            return normalizeRedactionMapping(result);
        } catch (err: any) {
            setError(err.message || 'Error detecting ML entities');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calls the ML detection endpoint.
     * @param pdfFile PDF file to analyze.
     * @param requestedEntities Array of requested entity types.
     * @returns Parsed redaction mapping JSON.
     */
    const runExtractText = async (pdfFile: File): Promise<ExtracteText> => {
        setLoading(true);
        setError(null);
        try {
            return await extractText(pdfFile);
        } catch (err: any) {
            setError(err.message || 'Error extraction text');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calls the redaction endpoint.
     * @param pdfFile Original PDF file.
     * @param redactionMapping Mapping data for redactions.
     * @returns A Blob representing the redacted PDF.
     */
    const runRedactPdf = async (pdfFile: File, redactionMapping: RedactionMapping): Promise<Blob> => {
        setLoading(true);
        setError(null);
        try {
            const redactedPdfBlob = await redactPdf(pdfFile, redactionMapping);
            return redactedPdfBlob;
        } catch (err: any) {
            setError(err.message || 'Error redacting PDF');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Calls the ML detection endpoint.
     * @param pdfFile PDF file to analyze.
     * @param requestedEntities Array of requested entity types.
     * @returns Parsed redaction mapping JSON.
     */
    const runDetectGliner = async (pdfFile: File, requestedEntities: string[]): Promise<RedactionMapping> => {
        setLoading(true);
        setError(null);
        try {
            const result = await detectGliner(pdfFile, requestedEntities);
            return normalizeRedactionMapping(result);
        } catch (err: any) {
            setError(err.message || 'Error detecting ML entities');
            throw err;
        } finally {
            setLoading(false);
        }
    };
    return {
        loading,
        error,
        runDetectAi,
        runDetectMl: runDetectPresidio,
        runRedactPdf,
        runExtractText,
        runDetectGliner
    };
};
