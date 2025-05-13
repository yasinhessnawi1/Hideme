import { useState, useCallback } from 'react';
import apiClient from '../../services/api-services/apiClient';
import { useAuth } from '../auth/useAuth';
import {RedactionMapping} from "../../types";

export interface DocumentHistoryItem {
  id: number;
  hashed_name: string;
  upload_timestamp: string;
  last_modified: string;
  entity_count?: number;
}

interface DocumentListResponse {
  success: boolean;
  data: DocumentHistoryItem[];
  total_count: number;
}

interface DocumentResponse {
  success: boolean;
  data: DocumentHistoryItem;
}
export  interface SingleDocumentResponse {
  success: boolean;
  data: SingleDocumentItem;
}

export  interface SingleDocumentItem {
  id: number;
  user_id: number;
  hashed_document_name: string;
  upload_timestamp: string;
  last_modified: string;
  redaction_schema: RedactionMapping;
}

interface RedactionSchema {
  pages: any[];
  [key: string]: any;
}

export const useDocumentHistory = () => {
  const [documents, setDocuments] = useState<DocumentHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Get all documents (with pagination)
  const getDocuments = useCallback(async (page: number = 1, pageSize: number = 10) => {
    if (!isAuthenticated) {
      setError('User must be authenticated to fetch documents');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<DocumentListResponse>(`/documents?page=${page}&pageSize=${pageSize}`);

      if (response.data.success) {
        setDocuments(response.data.data);
        setTotalCount(response.data.total_count);
        return response.data.data;
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while fetching documents';
      console.error('[useDocumentHistory] Error fetching documents:', errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Save a document with its redaction schema
  const saveDocument = useCallback(async (file: File, redactionSchema: RedactionSchema) => {
    if (!isAuthenticated) {
      setError('User must be authenticated to save documents');
      return null;
    }

    setLoading(true);
    setError(null);

    try {

      // Add metadata with original filename
      const payload = {
          filename: file.name,       redaction_schema: redactionSchema  // Send as object, not stringified
          };     // Send as JSON
          const response = await apiClient.post<DocumentResponse>('/documents', payload);
      // Add redaction schema

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Failed to save document');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while saving document';
      console.error('[useDocumentHistory] Error saving document:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Get document metadata by ID
  const getDocumentById = useCallback(async (id: number) => {
    if (!isAuthenticated) {
      setError('User must be authenticated to fetch document');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<SingleDocumentResponse>(`/documents/${id}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Failed to fetch document');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while fetching document';
      console.error('[useDocumentHistory] Error fetching document:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);



  // Delete document by ID
  const deleteDocument = useCallback(async (id: number) => {
    if (!isAuthenticated) {
      setError('User must be authenticated to delete document');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.delete(`/documents/${id}`);

      // Update the document list after deletion
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== id));

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while deleting document';
      console.error('[useDocumentHistory] Error deleting document:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);


  // Clear any errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    documents,
    totalCount,
    loading,
    error,
    getDocuments,
    saveDocument,
    getDocumentById,
    deleteDocument,
    clearError
  };
};
