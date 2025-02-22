import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import PlaygroundPage from "../pages/PlaygroundPage";

interface AppRouterProps {
    theme: string
    toggleTheme: () => void
}

const AppRouter: React.FC<AppRouterProps> = ({ theme, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/playground" element={<PlaygroundPage  theme={theme} toggleTheme={toggleTheme}/>} />

            {/* Add more routes as needed */}
        </Routes>
    )
}

export default AppRouter
