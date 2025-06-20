import {useEffect, useState} from 'react'
import {BeforeInstallPromptEvent} from '../types/pwa'

export const useInstallPrompt = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstallable, setIsInstallable] = useState(false)

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
            e.preventDefault()
            setInstallPrompt(e)
            setIsInstallable(true)
            console.log('PWA install prompt is available')
        }

        const handleAppInstalled = () => {
            setIsInstallable(false)
            setInstallPrompt(null)
            console.log('PWA has been installed')
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
        window.addEventListener('appinstalled', handleAppInstalled)

        // In development, log that install prompts won't work
        if (import.meta.env.DEV) {
            console.log('PWA install prompts only work in production builds served over HTTPS')
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!installPrompt) {
            console.log('Install prompt not available')
            return
        }

        try {
            await installPrompt.prompt()
            const {outcome} = await installPrompt.userChoice

            if (outcome === 'accepted') {
                setIsInstallable(false)
                setInstallPrompt(null)
                console.log('User accepted the install prompt')
            } else {
                console.log('User dismissed the install prompt')
            }
        } catch (error) {
            console.error('Error during install prompt:', error)
        }
    }

    return {isInstallable, handleInstallClick}
} 