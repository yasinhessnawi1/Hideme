import {useEffect, useState} from 'react'
import {Workbox} from 'workbox-window'

export const useServiceWorker = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [wb, setWb] = useState<Workbox | null>(null)

    useEffect(() => {
        // Only register service worker in production or when sw.js exists
        if ('serviceWorker' in navigator && import.meta.env.PROD) {
            const workbox = new Workbox('/sw.js')

            workbox.addEventListener('controlling', () => {
                window.location.reload()
            })

            workbox.addEventListener('waiting', () => {
                setUpdateAvailable(true)
            })

            workbox.register().catch((error) => {
                console.log('Service worker registration failed:', error)
            })

            setWb(workbox)
        } else if (import.meta.env.DEV) {
            console.log('Service worker registration skipped in development mode')
        }
    }, [])

    const skipWaiting = () => {
        if (wb) {
            wb.addEventListener('controlling', () => {
                window.location.reload()
            })
            wb.messageSkipWaiting()
        }
    }

    return {updateAvailable, skipWaiting}
} 