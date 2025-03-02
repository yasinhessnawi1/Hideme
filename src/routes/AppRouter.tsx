import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import PDFViewerPage from "../pages/PDFViewerPage";
import NotFound from "./NotFound";
import toolbar from "../components/pdf/Toolbar";

interface AppRouterProps {
    theme: string
    toggleTheme: () => void
}

const AppRouter: React.FC<AppRouterProps> = ({ theme, toggleTheme }) => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage initialSignUp={true} />} />
            <Route path="/playground" element={<PDFViewerPage  theme={theme} toggleTheme={toggleTheme}/>} />
            <Route path="*" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
        </Routes>
    )
}

export default AppRouter
