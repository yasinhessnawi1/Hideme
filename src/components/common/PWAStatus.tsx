import React from 'react'
import {useInstallPrompt} from '../../hooks/useInstallPrompt'
import {useOnlineStatus} from '../../hooks/useOnlineStatus'

interface PWAStatusProps {
    className?: string
}

export const PWAStatus: React.FC<PWAStatusProps> = ({className}) => {
    const {isInstallable, handleInstallClick} = useInstallPrompt()
    const isOnline = useOnlineStatus()

    return (
        <div className={className} style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            {/* Online/Offline Status */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: isOnline ? '#4CAF50' : '#ff4444'
            }}>
                <span>{isOnline ? '🟢' : '🔴'}</span>
                {isOnline ? 'Online' : 'Offline'}
            </div>

            {/* Install Button */}
            {isInstallable && (
                <button
                    onClick={handleInstallClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                    }}
                >
                    📱 Install
                </button>
            )}

            {/* PWA Badge */}
            {window.matchMedia('(display-mode: standalone)').matches && (
                <div style={{
                    fontSize: '12px',
                    color: '#666',
                    backgroundColor: '#f0f0f0',
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}>
                    📱 PWA
                </div>
            )}
        </div>
    )
} 