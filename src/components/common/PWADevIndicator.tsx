import React from 'react'

export const PWADevIndicator: React.FC = () => {
    // Only show in development mode
    if (import.meta.env.PROD) return null

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            backgroundColor: '#ffc107',
            color: '#212529',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            lineHeight: '1.4'
        }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                <span>⚠️</span>
                <strong>Development Mode</strong>
            </div>
            <div style={{fontSize: '12px', opacity: 0.9}}>
                PWA features require production build.<br/>
                Run <code style={{background: '#fff', padding: '2px 4px', borderRadius: '3px'}}>npm run build && npm run
                preview</code> to test.
            </div>
        </div>
    )
} 