import React, { useState } from 'react';
import '../styles/login/LoginPage.css';
import LoginForm from '../components/forms/LoginForm.jsx';

const LoginPage = () => {
  // State to toggle between Login and Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  // Fields for the form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="login-page">
      {/* Left section: contains the form and related text */}
      <div className="login-left">
        <div className="login-container">
          <h1 className="login-title">HIDE ME</h1>
          {/* Toggle subtitle based on isSignUp */}
          <p className="login-subtitle">
            {isSignUp ? 'Create an Account' : 'Login To Your Account'}
          </p>

          <LoginForm
            // Pass current mode & the setter so the child can toggle
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            // Pass form field states/handlers
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
        </div>

        {/* Add some top margin when in sign-up mode */}
        <p
          className="login-terms"
          style={{ marginTop: isSignUp ? '2rem' : '0' }}
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
