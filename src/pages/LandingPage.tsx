import React from 'react'
import { InteractiveGridPattern } from '../components/LandingComponents/InteractiveGrid'
import Navbar from '../components/static/Navbar'
import Hero from '../components/LandingComponents/Hero'
import '../styles/modules/landing/LandingPage.css'

interface LandingPageProps {
    theme: string
    toggleTheme: () => void
}

const LandingPage: React.FC<LandingPageProps> = ({ theme, toggleTheme }) => {
    return (
        <main className="landing-page">
            <InteractiveGridPattern className={"grid"}/>
            <div className="content">
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <Hero />
            </div>
        </main>
    )
}

export default LandingPage
