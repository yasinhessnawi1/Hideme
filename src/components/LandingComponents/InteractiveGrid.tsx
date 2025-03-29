"use client"

import type React from "react"
import { useState } from "react"
import "../../styles/modules/landing/InteractiveGrid.css"

interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
    width?: number
    height?: number
    squares?: [number, number]
    className?: string
    squaresClassName?: string
}

export function InteractiveGridPattern({
                                           width = 40,
                                           height = 40,
                                           squares = [100, 100],
                                           className,
                                           squaresClassName,
                                           ...props
                                       }: Readonly<InteractiveGridPatternProps>) {
    const [horizontal, vertical] = squares
    const [hoveredSquare, setHoveredSquare] = useState<number | null>(null)

    return (
        <svg
            width={width * horizontal}
            height={height * vertical}
            className={`interactive-grid ${className || ""}`}
            {...props}
        >
            {Array.from({ length: horizontal * vertical }).map((_, index) => {
                const x = (index % horizontal) * width
                const y = Math.floor(index / horizontal) * height
                return (
                    <rect
                        key={index}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        className={`grid-square ${hoveredSquare === index ? "hovered" : ""} ${squaresClassName || ""}`}
                        onMouseEnter={() => setHoveredSquare(index)}
                        onMouseLeave={() => setHoveredSquare(null)}
                    />
                )
            })}
        </svg>
    )
}

