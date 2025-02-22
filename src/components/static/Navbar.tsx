"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import "../../styles/Navbar.css"
import ThemeToggler from "../common/ThemeToggler"
import { Button } from "../common/Button"

interface NavbarProps {
    theme: string
    toggleTheme: () => void
}

export default function Navbar({ theme, toggleTheme }: Readonly<NavbarProps>) {
    const navigate = useNavigate()

    return (
        <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className="navbar">
            <Link to="/" className="logo">
                <span className="logo-text">HIDE ME</span>
            </Link>

            <div className="nav-links">
                <NavLink to="/features">Features</NavLink>
                <NavLink to="/how-it-works">How it Works</NavLink>
                <NavLink to="/About">About</NavLink>
            </div>

            <div className="auth-buttons">
                <Button
                    className="Sign-in-button"
                    shimmerColor="#ffffff"
                    borderRadius="100px"
                    shimmerDuration="5s"
                    background="rgb(116,142,155)"
                    onClick={() => navigate("/login")}
                >
                    <span>Sign In</span>
                </Button>

                <Button
                    className="Sign-in-button"
                    shimmerColor="#ffffff"
                    borderRadius="100px"
                    shimmerDuration="5s"
                    background="rgb(18,143,217)"
                >
                    <span>Get Started</span>
                </Button>

                <ThemeToggler
                    isDarkMode={theme === 'dark'}
                    toggleTheme={toggleTheme}
                />
            </div>

            <button className="menu-button">
                <Menu className="menu-icon" />
            </button>
        </motion.nav>
    )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <Link to={to} className="nav-link">
            {children}
        </Link>
    )
}
