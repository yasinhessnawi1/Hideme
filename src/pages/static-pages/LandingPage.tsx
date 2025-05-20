import React from 'react'
import Navbar from '../../components/static/Navbar'
import Hero from '../../components/static/Hero'
import Footer from '../../components/static/Footer'
import '../../styles/modules/landing/LandingPage.css'


const LandingPage = () => {
    return (
        <main className="landing-page">
            <div className="content">
                <Navbar />
                <Hero />
            </div>
            <Footer />
        </main>
    )
}

export default LandingPage
