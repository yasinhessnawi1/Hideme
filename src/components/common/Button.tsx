import React, { type ComponentPropsWithoutRef } from "react"
import { useLanguage } from '../../contexts/LanguageContext';

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
            background = "var(--background)",
            className,
            children,
            ...props
        },
        ref,
    ) => {
        const { t } = useLanguage();
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
                aria-label={props["aria-label"] || t('common', 'button')}
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

