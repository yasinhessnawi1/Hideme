"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import "../../styles/FloatingPaper.css"

export function FloatingPaper({ count = 10 }) {
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

    useEffect(() => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        })

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    return (
        <div className="floating-paper-container">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="floating-paper"
                    initial={{
                        x: Math.random() * dimensions.width,
                        y: Math.random() * dimensions.height,
                    }}
                    animate={{
                        x: [Math.random() * dimensions.width, Math.random() * dimensions.width, Math.random() * dimensions.width],
                        y: [
                            Math.random() * dimensions.height,
                            Math.random() * dimensions.height,
                            Math.random() * dimensions.height,
                        ],
                        rotate: [0, 180, 360],
                    }}
                    transition={{
                        duration: 20 + Math.random() * 100,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                    }}
                >
                    <div className="paper-content">
                        <FileText className="paper-icon" />
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

