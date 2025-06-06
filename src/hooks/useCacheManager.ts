import {useEffect, useState} from 'react'
import {clearCaches, getCacheSize} from '../utils/cacheManager'

export const useCacheManager = () => {
    const [cacheSize, setCacheSize] = useState<number>(0)
    const [isClearing, setIsClearing] = useState(false)

    const updateCacheSize = async () => {
        const size = await getCacheSize()
        setCacheSize(size)
    }

    const clearAllCaches = async () => {
        setIsClearing(true)
        try {
            await clearCaches()
            await updateCacheSize()
        } catch (error) {
            console.error('Error clearing caches:', error)
        } finally {
            setIsClearing(false)
        }
    }

    const formatCacheSize = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    useEffect(() => {
        updateCacheSize()
    }, [])

    return {
        cacheSize,
        formattedCacheSize: formatCacheSize(cacheSize),
        isClearing,
        clearAllCaches,
        updateCacheSize
    }
} 