"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, LogOut, Settings } from 'lucide-react'
import "../../styles/components/Navbar.css"
import { Button } from "../common/Button"
import { useUserContext } from '../../contexts/UserContext'



export default function Navbar() {
    const navigate = useNavigate()
    const { user, isAuthenticated, logout } = useUserContext()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleLogout = async () => {
        try {
            await logout()
            navigate('/')
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }
    let localUser;
    const getUserFromLocalStorage = () => {
        const userData = localStorage.getItem('user_data')
        if (userData) {
            return JSON.parse(userData).data
        }
        return null
    }

    return (
        <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className="navbar">
            <Link to="/" className="logo">
                <span className="logo-text">HIDE ME</span>
            </Link>

            <div className="nav-links" >
                <NavLink to={"/features"}>Features</NavLink>
                <NavLink to="/how-to">How it Works</NavLink>
                <NavLink to="/about">About</NavLink>
                {isAuthenticated && user ? (
                    <NavLink to="/playground">Playground</NavLink>
                ) : null}
            </div>

            <div className="auth-buttons">
                {isAuthenticated && user ? (
                    <div className="user-menu" ref={dropdownRef}>
                        <button
                            className="user-button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="true"
                        >
                            <div className="user-avatar">
                                <svg viewBox="0 0 1024 1024" className="user-icon-svg" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M691.573 338.89c-1.282 109.275-89.055 197.047-198.33 198.331-109.292 1.282-197.065-90.984-198.325-198.331-0.809-68.918-107.758-68.998-106.948 0 1.968 167.591 137.681 303.31 305.272 305.278C660.85 646.136 796.587 503.52 798.521 338.89c0.811-68.998-106.136-68.918-106.948 0z" fill="#4b9b54"></path>
                                    <path d="M294.918 325.158c1.283-109.272 89.051-197.047 198.325-198.33 109.292-1.283 197.068 90.983 198.33 198.33 0.812 68.919 107.759 68.998 106.948 0C796.555 157.567 660.839 21.842 493.243 19.88c-167.604-1.963-303.341 140.65-305.272 305.278-0.811 68.998 106.139 68.919 106.947 0z" fill="#5fc461"></path>
                                    <path d="M222.324 959.994c0.65-74.688 29.145-144.534 80.868-197.979 53.219-54.995 126.117-84.134 201.904-84.794 74.199-0.646 145.202 29.791 197.979 80.867 54.995 53.219 84.13 126.119 84.79 201.905 0.603 68.932 107.549 68.99 106.947 0-1.857-213.527-176.184-387.865-389.716-389.721-213.551-1.854-387.885 178.986-389.721 389.721-0.601 68.991 106.349 68.933 106.949 0.001z" fill="#4ee47b"></path>
                                </svg>
                            </div>
                            <span className="user-name">{user.username  || getUserFromLocalStorage()?.username || 'user'}</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="user-dropdown" style={{ zIndex: 1000 }}>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setIsDropdownOpen(false)
                                        navigate('/user/settings')
                                    }}
                                >
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setIsDropdownOpen(false)
                                        handleLogout()
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
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
                            onClick={() => navigate("/signup")}
                        >
                            <span>Get Started</span>
                        </Button>
                    </>
                )}

            </div>

            <button className="menu-button">
                <Menu className="menu-icon" />
            </button>
        </motion.nav>
    )
}

function NavLink({ to, children }: Readonly<{ to: string; children: React.ReactNode }>) {
    return (
        <Link to={to} className="nav-link">
            {children}
        </Link>
    )
}
