import React from 'react'
import {useServiceWorker} from '../../hooks/useServiceWorker'

export const PWAUpdateNotification: React.FC = () => {
    const {updateAvailable, skipWaiting} = useServiceWorker()

    if (!updateAvailable) return null

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '300px'
        }}>
            <div>
                <p style={{margin: 0, fontWeight: '500'}}>App Update Available!</p>
                <p style={{margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9}}>
                    A new version is ready to install.
                </p>
            </div>
            <button
                onClick={skipWaiting}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                Update
            </button>
        </div>
    )
} 