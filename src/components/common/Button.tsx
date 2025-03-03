import React, { type ComponentPropsWithoutRef } from "react"
import "../../styles/components/Button.css"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    shimmerColor?: string
    shimmerSize?: string
    borderRadius?: string
    shimmerDuration?: string
    background?: string
    className?: string
    children?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            shimmerColor = "#ffffff",
            shimmerSize = "0.05em",
            shimmerDuration = "3s",
            borderRadius = "100px",
            background = "rgba(0, 0, 0, 1)",
            className,
            children,
            ...props
        },
        ref,
    ) => {
        return (
            <button
                style={
                    {
                        "--shimmer-color": shimmerColor,
                        "--radius": borderRadius,
                        "--speed": shimmerDuration,
                        "--cut": shimmerSize,
                        "--bg": background,
                    } as React.CSSProperties
                }
                className={`shimmer-button ${className || ""}`}
                ref={ref}
                {...props}
            >
                <div className="shimmer-button__spark-container">
                    <div className="shimmer-button__spark" />
                </div>
                {children}
                <div className="shimmer-button__highlight" />
                <div className="shimmer-button__backdrop" />
            </button>
        )
    },
)

Button.displayName = "Button"

