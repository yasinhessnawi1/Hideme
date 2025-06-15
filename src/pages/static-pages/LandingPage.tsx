import React from 'react'
import Navbar from '../../components/static/Navbar'
import Hero from '../../components/static/Hero'
import FeaturesPreview from '../../components/static/FeaturesPreview'
import Footer from '../../components/static/Footer'


const LandingPage = () => {
    return (
        <main className="landing-page">
            <div className="content">
                <Navbar />
                <Hero />
            </div>
            <FeaturesPreview />
            <Footer />
        </main>
    )
}

export default LandingPage
