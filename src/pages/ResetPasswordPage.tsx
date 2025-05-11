import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { useLoading } from '../contexts/LoadingContext';
import LoadingWrapper from '../components/common/LoadingWrapper';
import Navbar from '../components/static/Navbar';
import authService from '../services/authService';
import '../styles/modules/login/LoginPage.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const { notify } = useNotification();
  const { isLoading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    if (!token) {
      notify({
        message: 'Invalid or missing reset token. Please request a new password reset link.',
        type: 'error',
        duration: 5000
      });
      navigate('/forgot-password');
    }
  }, [token, notify, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newPassword.trim() || !confirmPassword.trim()) {
      notify({
        message: 'Both fields are required',
        type: 'error',
        duration: 3000
      });
      return;
    }
    
    if (newPassword.length < 8) {
      notify({
        message: 'Password must be at least 8 characters long',
        type: 'error',
        duration: 3000
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify({
        message: 'Passwords do not match',
        type: 'error',
        duration: 3000
      });
      return;
    }

    try {
      startLoading('resetPassword');
      await authService.resetPassword(token!, newPassword, confirmPassword);
      setResetComplete(true);
      notify({
        message: 'Password has been successfully reset',
        type: 'success',
        duration: 5000
      });
    } catch (error: any) {
      notify({
        message: error.message || 'Failed to reset password. The link may have expired.',
        type: 'error',
        duration: 5000
      });
    } finally {
      stopLoading('resetPassword');
    }
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  return (
    <>
      <Navbar />
      <div className="login-page">
        <div className="login-left">
          <div className="login-container">
            <h1 className="login-title">HIDE ME</h1>
            <p className="login-subtitle">Set New Password</p>

            {!resetComplete ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={isLoading('resetPassword')}
                >
                  <LoadingWrapper 
                    isLoading={isLoading('resetPassword')} 
                    overlay={true} 
                    fallback={''}>
                    {isLoading('resetPassword') ? 'Resetting...' : 'Reset Password'}
                  </LoadingWrapper>
                </button>
              </form>
            ) : (
              <div className="reset-confirmation">
                <div className="success-message">
                  <p>Password Reset Complete!</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your password has been successfully reset.
                  </p>
                </div>
                <Link to="/login" className="login-button mt-4" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Log In with New Password
                </Link>
              </div>
            )}
            
            <p className="signup-prompt enhanced-toggle">
              Need another reset link? <Link to="/forgot-password">Request again</Link>
            </p>
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

export default ResetPasswordPage; 