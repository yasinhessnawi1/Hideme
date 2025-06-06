import React from 'react'
import {useInstallPrompt} from '../../hooks/useInstallPrompt'

export const InstallButton: React.FC = () => {
    const {isInstallable, handleInstallClick} = useInstallPrompt()

    if (!isInstallable) return null

    return (
        <button
            onClick={handleInstallClick}
            className="install-button"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#0056b3'
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#007bff'
            }}
        >
            📱 Install App
        </button>
    )
} 