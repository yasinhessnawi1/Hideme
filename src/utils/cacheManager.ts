export const clearCaches = async (): Promise<void> => {
    if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        )
    }
}

export const getCacheSize = async (): Promise<number> => {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return estimate.usage || 0
    }
    return 0
} 