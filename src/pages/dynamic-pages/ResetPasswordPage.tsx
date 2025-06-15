import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingWrapper from '../../components/common/LoadingWrapper';
import Navbar from '../../components/static/Navbar';
import authService from '../../services/database-backend-services/authService';
import { useLanguage } from '../../contexts/LanguageContext';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const { notify } = useNotification();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { t } = useLanguage();

  useEffect(() => {
    if (!token) {
      notify({
        message: t('resetPassword', 'invalidOrMissingToken'),
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
        message: t('resetPassword', 'bothFieldsRequired'),
        type: 'error',
        duration: 3000
      });
      return;
    }

    if (newPassword.length < 8) {
      notify({
        message: t('resetPassword', 'passwordTooShort'),
        type: 'error',
        duration: 3000
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      notify({
        message: t('resetPassword', 'passwordsDoNotMatch'),
        type: 'error',
        duration: 3000
      });
      return;
    }

    try {
      startLoading('resetPassword');
      await authService.resetPassword(token!, newPassword);
      setResetComplete(true);
      notify({
        message: t('resetPassword', 'passwordResetSuccess'),
        type: 'success',
        duration: 5000
      });
    } catch (error: any) {
      notify({
        message: error.message || t('resetPassword', 'resetFailed'),
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
            <h1 className="login-title">{t('resetPassword', 'title')}</h1>
            <p className="login-subtitle">{t('resetPassword', 'subtitle')}</p>

            {!resetComplete ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="newPassword">{t('resetPassword', 'newPasswordLabel')}</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('resetPassword', 'newPasswordPlaceholder')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('resetPassword', 'confirmPasswordLabel')}</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('resetPassword', 'confirmPasswordPlaceholder')}
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
                    {isLoading('resetPassword') ? t('resetPassword', 'resetting') : t('resetPassword', 'resetPassword')}
                  </LoadingWrapper>
                </button>
              </form>
            ) : (
              <div className="reset-confirmation">
                <div className="success-message">
                  <p>{t('resetPassword', 'resetCompleteMessage')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('resetPassword', 'resetCompleteSubmessage')}
                  </p>
                </div>
                <Link to="/login" className="login-button mt-4" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  {t('resetPassword', 'logInWithNewPassword')}
                </Link>
              </div>
            )}

            <p className="signup-prompt enhanced-toggle">
              {t('resetPassword', 'needAnotherResetLink')} <Link to="/forgot-password">{t('resetPassword', 'requestAgain')}</Link>
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
