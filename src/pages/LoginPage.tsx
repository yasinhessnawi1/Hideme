import React, { useState, useEffect } from 'react';
import '../styles/modules/login/LoginPage.css';
import LoginForm from '../components/forms/LoginForm';
// @ts-ignore
import personalSettingsSVG from '../assets/undraw_personal-settings_8xv3.svg';
import { useSearchParams, useLocation } from 'react-router-dom';
import Navbar from "../components/static/Navbar";

interface LoginPageProps {
  initialSignUp?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ initialSignUp = false }) => {
  // Get URL parameters
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // State to toggle between login and sign-up modes
  const [isSignUp, setIsSignUp] = useState<boolean>(initialSignUp);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Check for signUp parameter in URL or state passed via navigation
  useEffect(() => {
    // Check URL parameter
    const signUpParam = searchParams.get('signup');

    // Check location state if using React Router's state
    const locationState = location.state as { isSignUp?: boolean } | null;

    if (signUpParam === 'true' || locationState?.isSignUp || initialSignUp) {
      setIsSignUp(true);
    }
  }, [searchParams, location, initialSignUp]);

  return (
      <>

      <Navbar />
      <div className="login-page">

        {/* Left section: contains the form and related text */}
        <div className="login-left">
          <div className="login-container">
            <h1 className="login-title">HIDE ME</h1>
            {/* Subtitle changes based on mode */}
            <p className="login-subtitle">
              {isSignUp ? 'Create an Account' : 'Login To Your Account'}
            </p>

            <LoginForm
                isSignUp={isSignUp}
                setIsSignUp={setIsSignUp}
                username={username}
                setUsername={setUsername}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
            />
          </div>
        </div>

        {/* Right section: image */}
        <div className="login-right">
          <img
            src={personalSettingsSVG}
            alt="Personal settings illustration"
            className="login-image"
            draggable={false}
          />
        </div>
      </div>
      </>
  );
};

export default LoginPage;
