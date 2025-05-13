"use client"

import { motion } from "framer-motion"
import { FileText, Sparkles } from "lucide-react"
import { FloatingPaper } from "./FloatingPaper"
import "../../styles/modules/landing/Hero.css"
import {Button} from "../common/Button";
import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function Hero() {
    const { t } = useLanguage();
    
    return (
        <div className="hero">
            <div className="floating-papers">
                <FloatingPaper count={6} />
            </div>

            <div className="hero-content">
                <div className="hero-text">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="hero-title">
                            {t('landing', 'transformTitle')}
                            <span className="highlight"> {t('landing', 'safeOnes')}</span>
                        </h1>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="hero-description"
                    >
                        {t('landing', 'heroDescription')}
                    </motion.p>

                </div>
            </div>

            <div className="robo-animation">
            </div>
        </div>
    )
}

