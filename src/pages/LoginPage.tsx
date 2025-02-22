import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log('Login attempt:', { email, password })
        // Redirect to home page
        navigate('/playground')
    }

    return (
        <div style={{ margin: '2rem auto', maxWidth: '400px' }}>
            <h1>Login</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label>
                    Email
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </label>

                <button type="submit" style={{ padding: '0.75rem', cursor: 'pointer' }}>
                    Log In
                </button>
            </form>
        </div>
    )
}

export default LoginPage
