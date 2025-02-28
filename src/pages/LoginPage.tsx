import React, { useState } from 'react';
import '../styles/login/LoginPage.css';
import LoginForm from '../components/forms/LoginForm';

const LoginPage: React.FC = () => {
  // State to toggle between login and sign-up modes
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  // Form field states
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
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
          />
        </div>

        {/* Add extra margin-top when in sign-up mode */}
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
