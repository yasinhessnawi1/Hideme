/**
 * LoginPage.tsx
 * -------------------------------------
 * Renders the main layout for the login or sign-up page,
 * containing the LoginForm component and any additional text or images.
 * 
 * The page toggles between Login and Sign-Up modes based on `isSignUp` state.
 * Additional fields (Full Name, Confirm Password) appear in Sign-Up mode.
 * 
 * The top margin is adjusted using inline style on .login-terms 
 * or other methods in the CSS to maintain consistent spacing.
 */

import React, { useState } from 'react';
import '../styles/login/LoginPage.css';
import LoginForm from '../components/forms/LoginForm';

/**
 * LoginPage component – Displays a two-column layout with a form on the left
 * and an image on the right. Toggles between Login and Sign-Up modes.
 * 
 * @returns {JSX.Element} The LoginPage layout.
 */
const LoginPage: React.FC = () => {
  // State to toggle between login and sign-up modes
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  return (
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
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
        </div>

        {/* Add extra margin-top when in sign-up mode if needed */}
        <p
          className="login-terms"
          style={{ marginTop: isSignUp ? '-3rem' : '0' }}
        >
          By clicking continue, you agree to our{' '}
          <a href="#">Terms of Service</a> and{' '}
          <a href="#">Privacy Policy</a>.
        </p>
      </div>

      {/* Right section: image */}
      <div className="login-right">
        <img
          src="src/assets/loginImage.png"
          alt="Login"
          className="login-image"
        />
      </div>
    </div>
  );
};

export default LoginPage;
