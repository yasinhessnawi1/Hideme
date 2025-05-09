"use client"

import { motion } from "framer-motion"
import { FileText, Sparkles } from "lucide-react"
import { FloatingPaper } from "./FloatingPaper"
import "../../styles/modules/landing/Hero.css"
import {Button} from "../common/Button";
import React from "react";

export default function Hero() {
    return (
        <div className="hero">
            <div className="floating-papers">
                <FloatingPaper count={6} />
            </div>

            <div className="hero-content">
                <div className="hero-text">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="hero-title">
                            Transform Your Files Into
                            <span className="highlight"> Safe Ones</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="hero-description"
                    >
                        Upload your files  and let  AI and ML transform your file into a safe one for public use.
                    </motion.p>

                </div>
            </div>

            <div className="robo-animation">
            </div>
        </div>
    )
}

