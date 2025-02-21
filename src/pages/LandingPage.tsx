import React from 'react'
import { InteractiveGridPattern } from '../components/static/InteractiveGrid'
import Navbar from '../components/static/Navbar'
import Hero from '../components/static/Hero'
import '../styles/LandingPage.css'

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
