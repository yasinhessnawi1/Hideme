// NotificationRenderer.tsx
import React, { useEffect, useState } from 'react';
import { useNotification, ToastNotification, NotificationPosition } from '../../contexts/NotificationContext';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import '../../styles/components/Notifications.css';

// Animation component for smooth transitions
const AnimatedToast: React.FC<{
    toast: ToastNotification;
    onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
    const [isLeaving, setIsLeaving] = useState(false);

    const handleRemove = () => {
        setIsLeaving(true);
        // Wait for animation to complete before actually removing
        setTimeout(() => {
            onRemove(toast.id);
        }, 300);
    };

    return (
        <div
            className={`toast toast-${toast.type} ${isLeaving ? 'toast-exit' : 'toast-enter'}`}
        >
            <div className="toast-icon">
                {toast.type === 'success' && <CheckCircle size={18} />}
                {toast.type === 'error' && <AlertTriangle size={18} />}
                {toast.type === 'info' && <Info size={18} />}
                {toast.type === 'warning' && <AlertTriangle size={18} />}
            </div>
            <div className="toast-content">{toast.message}</div>
            <button
                className="toast-close"
                onClick={handleRemove}
                aria-label="Close notification"
            >
                <X size={14} />
            </button>
        </div>
    );
};

// Main component that renders all toasts
export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useNotification();

    // Group toasts by position
    const toastsByPosition = toasts.reduce((acc, toast) => {
        const position = toast.position || 'top-right';
        if (!acc[position]) {
            acc[position] = [];
        }
        acc[position].push(toast);
        return acc;
    }, {} as Record<NotificationPosition, ToastNotification[]>);

    // Render toast groups by position
    return (
        <>
            {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
                <div key={position} className={`toast-container toast-${position}`}>
                    {positionToasts.map(toast => (
                        <AnimatedToast
                            key={toast.id}
                            toast={toast}
                            onRemove={removeToast}
                        />
                    ))}
                </div>
            ))}
        </>
    );
};

// Component to render the confirmation dialog
export const ConfirmationDialog: React.FC = () => {
    const { confirmation, closeConfirmation } = useNotification();

    // No confirmation to show
    if (!confirmation) return null;

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeConfirmation();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeConfirmation]);

    return (
        <div className="confirmation-overlay" onClick={closeConfirmation}>
            <div
                className={`confirmation-dialog confirmation-${confirmation.type}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="confirmation-header">
                    <h3 className="confirmation-title">{confirmation.title}</h3>
                    <button
                        className="confirmation-close"
                        onClick={closeConfirmation}
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="confirmation-content">
                    <p>{confirmation.message}</p>
                </div>

                <div className="confirmation-actions">
                    {/* Additional buttons (if any) */}
                    {confirmation.additionalButtons?.map((button, index) => (
                        <button
                            key={`additional-${index}`}
                            className={`confirmation-button confirmation-button-${button.variant || 'secondary'}`}
                            onClick={() => {
                                button.onClick();
                                closeConfirmation();
                            }}
                        >
                            {button.label}
                        </button>
                    ))}

                    {/* Cancel button */}
                    {confirmation.cancelButton && (
                        <button
                            className={`confirmation-button confirmation-button-${confirmation.cancelButton.variant || 'secondary'}`}
                            onClick={confirmation.cancelButton.onClick}
                        >
                            {confirmation.cancelButton.label}
                        </button>
                    )}

                    {/* Confirm button */}
                    {confirmation.confirmButton && (
                        <button
                            className={`confirmation-button confirmation-button-${confirmation.confirmButton.variant || 'primary'}`}
                            onClick={confirmation.confirmButton.onClick}
                            autoFocus
                        >
                            {confirmation.confirmButton.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Combined component for easier usage
export const NotificationRenderer: React.FC = () => {
    return (
        <>
            <ToastContainer />
            <ConfirmationDialog />
        </>
    );
};
