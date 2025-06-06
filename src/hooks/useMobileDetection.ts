import {useEffect, useState} from 'react'

export const useMobileDetection = () => {
    const [isMobile, setIsMobile] = useState(false)
    const [isTablet, setIsTablet] = useState(false)

    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent.toLowerCase()
            const screenWidth = window.innerWidth
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

            // Mobile keywords (phones)
            const mobileKeywords = [
                'android', 'iphone', 'ipod', 'blackberry', 'windows phone',
                'mobile', 'webos', 'opera mini', 'palm', 'symbian'
            ]

            // Tablet keywords (larger touch devices)
            const tabletKeywords = ['ipad', 'tablet', 'kindle']

            // Check user agent patterns
            const isMobileUserAgent = mobileKeywords.some(keyword =>
                userAgent.includes(keyword)
            )

            const isTabletUserAgent = tabletKeywords.some(keyword =>
                userAgent.includes(keyword)
            )

            // Screen size is the primary determinant
            let finalIsMobile = false
            let finalIsTablet = false

            if (screenWidth <= 768) {
                // Small screens are always mobile, regardless of user agent
                finalIsMobile = true
                finalIsTablet = false
            } else if (screenWidth <= 1024) {
                // Medium screens: check for tablet-specific indicators
                if (isTabletUserAgent && hasTouch) {
                    finalIsTablet = true
                    finalIsMobile = false
                } else if (hasTouch) {
                    // Touch device in medium range without explicit tablet UA = mobile
                    finalIsMobile = true
                    finalIsTablet = false
                } else {
                    // No touch = desktop
                    finalIsMobile = false
                    finalIsTablet = false
                }
            } else {
                // Large screens are desktop
                finalIsMobile = false
                finalIsTablet = false
            }

            setIsMobile(finalIsMobile)
            setIsTablet(finalIsTablet)
        }

        // Check on initial load
        checkDevice()

        // Check on window resize
        window.addEventListener('resize', checkDevice)

        return () => {
            window.removeEventListener('resize', checkDevice)
        }
    }, [])

    const isDesktop = !isMobile && !isTablet

    return {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice: isMobile || isTablet
    }
} 