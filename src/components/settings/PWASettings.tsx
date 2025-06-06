import React from 'react'
import {useInstallPrompt} from '../../hooks/useInstallPrompt'
import {useOnlineStatus} from '../../hooks/useOnlineStatus'
import {useCacheManager} from '../../hooks/useCacheManager'

export const PWASettings: React.FC = () => {
    const {isInstallable, handleInstallClick} = useInstallPrompt()
    const isOnline = useOnlineStatus()
    const {formattedCacheSize, isClearing, clearAllCaches} = useCacheManager()

    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches

    return (
        <div style={{padding: '20px', maxWidth: '600px'}}>
            <h3 style={{marginBottom: '20px', fontSize: '18px', fontWeight: '600'}}>
                Progressive Web App Settings
            </h3>

            {/* Installation Status */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <h4 style={{margin: '0 0 8px 0', fontSize: '16px'}}>Installation</h4>
                {isPWAMode ? (
                    <div style={{color: '#28a745', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span>✅</span>
                        App is installed and running as PWA
                    </div>
                ) : isInstallable ? (
                    <div>
                        <p style={{margin: '0 0 12px 0', color: '#6c757d'}}>
                            You can install this app for a better experience
                        </p>
                        <button
                            onClick={handleInstallClick}
                            style={{
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📱 Install App
                        </button>
                    </div>
                ) : (
                    <div style={{color: '#6c757d'}}>
                        App installation not available in this browser
                    </div>
                )}
            </div>

            {/* Online Status */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <h4 style={{margin: '0 0 8px 0', fontSize: '16px'}}>Connection Status</h4>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: isOnline ? '#28a745' : '#dc3545'
                }}>
                    <span>{isOnline ? '🟢' : '🔴'}</span>
                    {isOnline ? 'Online' : 'Offline'}
                </div>
                {!isOnline && (
                    <p style={{margin: '8px 0 0 0', fontSize: '14px', color: '#6c757d'}}>
                        Some features may be limited while offline
                    </p>
                )}
            </div>

            {/* Cache Management */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px'
            }}>
                <h4 style={{margin: '0 0 8px 0', fontSize: '16px'}}>Storage & Cache</h4>
                <p style={{margin: '0 0 12px 0', fontSize: '14px', color: '#6c757d'}}>
                    Cache size: {formattedCacheSize}
                </p>
                <button
                    onClick={clearAllCaches}
                    disabled={isClearing}
                    style={{
                        backgroundColor: isClearing ? '#6c757d' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 16px',
                        cursor: isClearing ? 'not-allowed' : 'pointer',
                        fontSize: '14px'
                    }}
                >
                    {isClearing ? 'Clearing...' : '🗑️ Clear Cache'}
                </button>
                <p style={{margin: '8px 0 0 0', fontSize: '12px', color: '#6c757d'}}>
                    This will remove cached files and may require re-downloading content
                </p>
            </div>

            {/* PWA Features Info */}
            <div style={{
                backgroundColor: '#e7f3ff',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '16px'
            }}>
                <h4 style={{margin: '0 0 8px 0', fontSize: '16px'}}>PWA Features</h4>
                <ul style={{margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#495057'}}>
                    <li>Works offline with cached content</li>
                    <li>Automatic updates in the background</li>
                    <li>Fast loading with cached resources</li>
                    <li>Native app-like experience</li>
                    <li>Reduced data usage</li>
                </ul>
            </div>
        </div>
    )
} 