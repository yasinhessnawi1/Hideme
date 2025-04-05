import React, {useEffect} from 'react'
import { InteractiveGridPattern } from '../components/LandingComponents/InteractiveGrid'
import Navbar from '../components/static/Navbar'
import Hero from '../components/LandingComponents/Hero'
import '../styles/modules/landing/LandingPage.css'
import {useNavigate} from "react-router-dom";
import {useUserContext} from "../contexts/UserContext";


const LandingPage = () => {
    return (
        <main className="landing-page">
            <InteractiveGridPattern className={"grid"}/>
            <div className="content">
                <Navbar />
                <Hero />
            </div>
        </main>
    )
}

export default LandingPage
