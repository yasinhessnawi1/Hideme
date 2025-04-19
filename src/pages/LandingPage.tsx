import React from 'react'
import Navbar from '../components/static/Navbar'
import Hero from '../components/LandingComponents/Hero'
import '../styles/modules/landing/LandingPage.css'


const LandingPage = () => {
    return (
        <main className="landing-page">
            <div className="content">
                <Navbar />
                <Hero />
            </div>
        </main>
    )
}

export default LandingPage
