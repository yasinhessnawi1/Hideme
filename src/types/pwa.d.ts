declare global {
    interface Navigator {
        serviceWorker: ServiceWorkerContainer
    }

    interface Window {
        workbox: any
    }
}

export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>

    prompt(): Promise<void>
} 