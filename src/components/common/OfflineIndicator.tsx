import React from 'react'
import {useOnlineStatus} from '../../hooks/useOnlineStatus'

export const OfflineIndicator: React.FC = () => {
    const isOnline = useOnlineStatus()

    if (isOnline) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            backgroundColor: '#ff4444',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
        }}>
            <span style={{fontSize: '16px'}}>📵</span>
            You're offline
        </div>
    )
} 