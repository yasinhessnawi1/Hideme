import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useLoading } from '../contexts/LoadingContext';
import LoadingWrapper from '../components/common/LoadingWrapper';
import Navbar from '../components/static/Navbar';
import authService from '../services/authService';
import '../styles/modules/login/LoginPage.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { notify } = useNotification();
  const { isLoading, startLoading, stopLoading } = useLoading();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      notify({
        message: 'Please enter your email address',
        type: 'error',
        duration: 3000
      });
      return;
    }

    try {
      startLoading('forgotPassword');
      await authService.forgotPassword(email);
      setSubmitted(true);
      notify({
        message: 'If an account exists with that email, you will receive a password reset link shortly.',
        type: 'success',
        duration: 5000
      });
    } catch (error: any) {
      notify({
        message: error.message || 'Failed to send reset link. Please try again.',
        type: 'error',
        duration: 3000
      });
    } finally {
      stopLoading('forgotPassword');
    }
  };

  return (
    <>
      <Navbar />
      <div className="login-page">
        <div className="login-left">
          <div className="login-container">
            <h1 className="login-title">HIDE ME</h1>
            <p className="login-subtitle">Reset Your Password</p>

            {!submitted ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={isLoading('forgotPassword')}
                >
                  <LoadingWrapper 
                    isLoading={isLoading('forgotPassword')} 
                    overlay={true} 
                    fallback={''}>
                    {isLoading('forgotPassword') ? 'Sending...' : 'Send Reset Link'}
                  </LoadingWrapper>
                </button>

                <p className="signup-prompt enhanced-toggle">
                  Remember your password? <Link to="/login">Log in</Link>
                </p>
              </form>
            ) : (
              <div className="reset-confirmation">
                <div className="success-message">
                  <p>Check your email!</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The link will expire in 15 minutes.
                  </p>
                </div>
                <button className="login-button mt-4" onClick={() => setSubmitted(false)}>
                  Back to Reset Password
                </button>
                <p className="signup-prompt enhanced-toggle mt-2">
                  Remember your password? <Link to="/login">Log in</Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="login-right">
          <img
            src="/src/assets/undraw_personal_settings_8xv3.svg"
            alt="Password reset illustration"
            className="login-image"
            draggable={false}
          />
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage; 