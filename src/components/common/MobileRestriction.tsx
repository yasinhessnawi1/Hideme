import React from 'react'
import {useMobileDetection} from '../../hooks/useMobileDetection'

interface MobileRestrictionProps {
    feature?: string
    children: React.ReactNode
}

export const MobileRestriction: React.FC<MobileRestrictionProps> = ({
                                                                        feature = "PDF editing features",
                                                                        children
                                                                    }) => {
    const {isMobile} = useMobileDetection()

    if (!isMobile) {
        return <>{children}</>
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            textAlign: 'center'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxWidth: '400px',
                width: '100%'
            }}>
                {/* Icon */}
                <div style={{
                    fontSize: '64px',
                    marginBottom: '20px'
                }}>
                    💻
                </div>

                {/* Title */}
                <h2 style={{
                    color: '#333',
                    marginBottom: '16px',
                    fontSize: '24px',
                    fontWeight: '600'
                }}>
                    Desktop Required
                </h2>

                {/* Description */}
                <p style={{
                    color: '#666',
                    marginBottom: '24px',
                    fontSize: '16px',
                    lineHeight: '1.5'
                }}>
                    {feature} are optimized for desktop use and require a larger screen for the best experience.
                </p>

                {/* Instructions */}
                <div style={{
                    backgroundColor: '#e7f3ff',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    <p style={{
                        color: '#0066cc',
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        📌 Please access this feature from:
                    </p>
                    <ul style={{
                        color: '#0066cc',
                        margin: '8px 0 0 0',
                        paddingLeft: '20px',
                        fontSize: '14px',
                        textAlign: 'left'
                    }}>
                        <li>💻 Desktop computer</li>
                        <li>💻 Laptop</li>
                        <li>📱 Tablet in landscape mode</li>
                    </ul>
                </div>

                {/* Additional info */}
                <p style={{
                    color: '#888',
                    fontSize: '12px',
                    margin: 0,
                    fontStyle: 'italic'
                }}>
                    We're working on mobile support for future updates!
                </p>

                {/* Go back button */}
                <button
                    onClick={() => window.history.back()}
                    style={{
                        marginTop: '20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#0056b3'
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#007bff'
                    }}
                >
                    ← Go Back
                </button>
            </div>
        </div>
    )
} 