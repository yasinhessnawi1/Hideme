import {renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it} from 'vitest'
import {useMobileDetection} from './useMobileDetection'

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
})

describe('useMobileDetection', () => {
    beforeEach(() => {
        // Reset window size before each test
        window.innerWidth = 1024
        // Mock user agent
        Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        })
    })

    it('should detect desktop device correctly', () => {
        const {result} = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(false)
        expect(result.current.isTablet).toBe(false)
        expect(result.current.isDesktop).toBe(true)
        expect(result.current.isTouchDevice).toBe(false)
    })

    it('should detect mobile device by user agent', () => {
        Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        })

        const {result} = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(true)
        expect(result.current.isTablet).toBe(false)
        expect(result.current.isDesktop).toBe(false)
        expect(result.current.isTouchDevice).toBe(true)
    })

    it('should detect mobile device by screen width', () => {
        window.innerWidth = 600

        const {result} = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(true)
        expect(result.current.isDesktop).toBe(false)
    })

    it('should detect tablet device', () => {
        Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        })

        const {result} = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(false)
        expect(result.current.isTablet).toBe(true)
        expect(result.current.isDesktop).toBe(false)
        expect(result.current.isTouchDevice).toBe(true)
    })

    it('should detect Android mobile device', () => {
        Object.defineProperty(navigator, 'userAgent', {
            writable: true,
            value: 'Mozilla/5.0 (Linux; Android 10; SM-G973F)',
        })

        const {result} = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(true)
        expect(result.current.isTablet).toBe(false)
        expect(result.current.isDesktop).toBe(false)
    })
}) 