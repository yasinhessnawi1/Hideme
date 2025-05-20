// NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Base notification types
export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

// Toast notification interface
export interface ToastNotification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number; // Duration in ms, defaults to 5000
    position?: NotificationPosition;
    count?: number;
}

// Confirmation types
export type ConfirmationType = 'delete' | 'info' | 'error' | 'warning' | 'confirm';

// Confirmation action buttons
export interface ConfirmationButton {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'link';
    onClick: () => void;
}

// Confirmation interface
export interface Confirmation {
    id: string;
    type: ConfirmationType;
    title: string;
    message: string;
    confirmButton?: ConfirmationButton;
    cancelButton?: ConfirmationButton;
    additionalButtons?: ConfirmationButton[];
    onClose?: () => void;
    // For confirmWithText
    inputLabel?: string;
    inputPlaceholder?: string;
    inputDefaultValue?: string;
    inputType?: string;
    onInputChange?: (value: string) => void;
}

interface NotificationContextType {
    // Toast notifications
    toasts: ToastNotification[];
    notify: (options: {
        type: NotificationType;
        message: string;
        duration?: number;
        position?: NotificationPosition;
    }) => string; // Returns notification ID
    removeToast: (id: string) => void;
    clearToasts: () => void;

    // Confirmations
    confirmation: Confirmation | null;
    confirm: (options: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[];
    }) => Promise<boolean>;
    confirmWithText: (options: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[];
        inputLabel?: string;
        inputPlaceholder?: string;
        inputDefaultValue?: string;
        inputType?: string;
    }) => Promise<string>;
    closeConfirmation: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Utility to create a stable hash from a string
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useLanguage();
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
    const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const confirmResolvers = useRef<Map<string, { resolve: (value: any) => void }>>(new Map());
    const recentNotifications = useRef<Map<string, { id: string; timestamp: number }>>(new Map());
    const DEDUPE_WINDOW_MS = 3000; // Deduplicate identical notifications within 3 seconds

    // Toast methods
    const removeToast = useCallback((id: string) => {
        setToasts(prev => {
            const toast = prev.find(t => t.id === id);
            
            if (!toast) return prev;
            
            if (toast.count && toast.count > 1) {
                // If count > 1, just decrement the count
                return prev.map(t => t.id === id ? { ...t, count: t.count! - 1 } : t);
            } else {
                // When removing the toast completely, clean up the timeout
                if (toastTimeouts.current.has(id)) {
                    clearTimeout(toastTimeouts.current.get(id));
                    toastTimeouts.current.delete(id);
                }
                
                // Find and remove any signatures pointing to this id
                Array.from(recentNotifications.current.entries()).forEach(([key, data]) => {
                    if (data.id === id) {
                        recentNotifications.current.delete(key);
                    }
                });
                
                return prev.filter(t => t.id !== id);
            }
        });
    }, []);

    const notify = useCallback(({
        type,
        message,
        duration = 5000,
        position = 'top-right'
    }: {
        type: NotificationType;
        message: string;
        duration?: number;
        position?: NotificationPosition;
    }) => {
        // Create a stable signature for this notification
        const signature = hashString(`${type}:${message}:${position}`);
        const now = Date.now();
        
        // Clean up old notification records first (those older than the dedupe window)
        Array.from(recentNotifications.current.entries()).forEach(([key, data]) => {
            if (now - data.timestamp > DEDUPE_WINDOW_MS) {
                recentNotifications.current.delete(key);
            }
        });
        
        // Check if we have a recent identical notification
        if (recentNotifications.current.has(signature)) {
            const existingData = recentNotifications.current.get(signature)!;
            const existingId = existingData.id;
            
            // Update the timestamp to extend the deduplication window
            recentNotifications.current.set(signature, {
                id: existingId,
                timestamp: now
            });
            
            // Increment the count of the existing notification
            setToasts(prev => 
                prev.map(toast => 
                    toast.id === existingId
                        ? { ...toast, count: (toast.count || 1) + 1 }
                        : toast
                )
            );
            
            return existingId;
        } else {
            // Create a new notification with a unique ID
            const newId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Add it to our tracking map
            recentNotifications.current.set(signature, {
                id: newId,
                timestamp: now
            });
            
            // Add the new toast to state
            setToasts(prev => [
                ...prev, 
                { id: newId, type, message, duration, position, count: 1 }
            ]);
            
            // Set auto-removal timeout
            if (duration !== Infinity && duration > 0) {
                const timeout = setTimeout(() => {
                    removeToast(newId);
                }, duration);
                
                toastTimeouts.current.set(newId, timeout);
            }
            
            return newId;
        }
    }, []);

    const clearToasts = useCallback(() => {
        // Clear the toast state
        setToasts([]);
        
        // Clear all timeouts
        toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
        toastTimeouts.current.clear();
        
        // Clear notification tracking
        recentNotifications.current.clear();
    }, []);

    // Confirmation methods
    const closeConfirmation = useCallback(() => {
        if (confirmation && confirmation.id && confirmResolvers.current.has(confirmation.id)) {
            // Resolve with false when closed without explicit confirmation
            confirmResolvers.current.get(confirmation.id)?.resolve(false);
            confirmResolvers.current.delete(confirmation.id);
        }

        setConfirmation(null);

        // Call onClose callback if provided
        confirmation?.onClose?.();
    }, [confirmation]);

    const confirm = useCallback(({
                                     type,
                                     title,
                                     message,
                                     confirmButton,
                                     cancelButton,
                                     additionalButtons = []
                                 }: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[];
    }) => {
        return new Promise<boolean>((resolve) => {
            const id = `confirmation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

            // Store the resolver so we can call it when a button is clicked
            confirmResolvers.current.set(id, { resolve });

            // Default confirm button based on type
            const defaultConfirmButton: ConfirmationButton = {
                label: t('common', 'confirm'),
                variant: 'primary',
                onClick: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve(true);
                        confirmResolvers.current.delete(id);
                    }
                    setConfirmation(null);
                }
            };

            // Customize button based on confirmation type
            if (type === 'delete') {
                defaultConfirmButton.label = t('common', 'delete');
                defaultConfirmButton.variant = 'danger';
            } else if (type === 'warning') {
                defaultConfirmButton.label = t('common', 'continue');
                defaultConfirmButton.variant = 'warning';
            }

            // Default cancel button
            const defaultCancelButton: ConfirmationButton = {
                label: t('common', 'cancel'),
                variant: 'secondary',
                onClick: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve(false);
                        confirmResolvers.current.delete(id);
                    }
                    setConfirmation(null);
                }
            };

            // Create the confirmation with merged defaults and user options
            const newConfirmation: Confirmation = {
                id,
                type,
                title,
                message,
                confirmButton: confirmButton
                    ? { ...defaultConfirmButton, ...confirmButton }
                    : defaultConfirmButton,
                cancelButton: cancelButton === undefined
                    ? defaultCancelButton
                    : cancelButton === null
                        ? undefined
                        : { ...defaultCancelButton, ...cancelButton },
                additionalButtons,
                onClose: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve(false);
                        confirmResolvers.current.delete(id);
                    }
                }
            };

            setConfirmation(newConfirmation);
        });
    }, [t, removeToast]);

    const confirmWithText = useCallback(({
        type,
        title,
        message,
        confirmButton,
        cancelButton,
        additionalButtons = [],
        inputLabel = t('common', 'input'),
        inputPlaceholder = '',
        inputDefaultValue = '',
        inputType = 'text'
    }: {
        type: ConfirmationType;
        title: string;
        message: string;
        confirmButton?: Partial<ConfirmationButton>;
        cancelButton?: Partial<ConfirmationButton>;
        additionalButtons?: ConfirmationButton[];
        inputLabel?: string;
        inputPlaceholder?: string;
        inputDefaultValue?: string;
        inputType?: string;
    }) => {
        return new Promise<string>((resolve) => {
            const id = `confirmation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            let inputValue = inputDefaultValue;

            // Store the resolver so we can call it when a button is clicked
            confirmResolvers.current.set(id, { resolve });

            // Default confirm button
            const defaultConfirmButton: ConfirmationButton = {
                label: t('common', 'confirm'),
                variant: 'primary',
                onClick: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve(inputValue);
                        confirmResolvers.current.delete(id);
                    }
                    setConfirmation(null);
                }
            };

            // Default cancel button
            const defaultCancelButton: ConfirmationButton = {
                label: t('common', 'cancel'),
                variant: 'secondary',
                onClick: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve("");
                        confirmResolvers.current.delete(id);
                    }
                    setConfirmation(null);
                }
            };

            // Create the confirmation with merged defaults and user options
            const newConfirmation: Confirmation = {
                id,
                type,
                title,
                message,
                confirmButton: confirmButton
                    ? { ...defaultConfirmButton, ...confirmButton }
                    : defaultConfirmButton,
                cancelButton: cancelButton === undefined
                    ? defaultCancelButton
                    : cancelButton === null
                        ? undefined
                        : { ...defaultCancelButton, ...cancelButton },
                additionalButtons,
                inputLabel,
                inputPlaceholder,
                inputDefaultValue,
                inputType,
                onInputChange: (val: string) => {
                    inputValue = val;
                },
                onClose: () => {
                    if (confirmResolvers.current.has(id)) {
                        confirmResolvers.current.get(id)?.resolve("");
                        confirmResolvers.current.delete(id);
                    }
                }
            };

            setConfirmation(newConfirmation);
        });
    }, [t]);

    const value = {
        toasts,
        notify,
        removeToast,
        clearToasts,

        confirmation,
        confirm,
        confirmWithText,
        closeConfirmation
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
