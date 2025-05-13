import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingWrapper from '../../components/common/LoadingWrapper';
import Navbar from '../../components/static/Navbar';
import authService from '../../services/database-backend-services/authService';
import '../../styles/modules/login/LoginPage.css';
import { useLanguage } from '../../contexts/LanguageContext';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { notify } = useNotification();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      notify({
        message: t('resetPassword', 'pleaseEnterEmailAddress'),
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
        message: t('resetPassword', 'resetLinkSent'),
        type: 'success',
        duration: 5000
      });
    } catch (error: any) {
      notify({
        message: error.message || t('resetPassword', 'failedToSendResetLink'),
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
            <h1 className="login-title">{t('resetPassword', 'title')}</h1>
            <p className="login-subtitle">{t('resetPassword', 'resetYourPassword')}</p>

            {!submitted ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">{t('resetPassword', 'emailAddress')}</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('resetPassword', 'enterYourEmailAddress')}
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
                    {isLoading('forgotPassword') ? t('resetPassword', 'sending') : t('resetPassword', 'sendResetLink')}
                  </LoadingWrapper>
                </button>

                <p className="signup-prompt enhanced-toggle">
                  {t('resetPassword', 'rememberPassword')} <Link to="/login">{t('resetPassword', 'logIn')}</Link>
                </p>
              </form>
            ) : (
              <div className="reset-confirmation">
                <div className="success-message">
                  <p>{t('resetPassword', 'checkYourEmail')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('resetPassword', 'weveSentAPasswordResetLinkTo')} <strong>{email}</strong>.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('resetPassword', 'linkWillExpireIn').replace('{minutes}', String(15))}
                  </p>
                </div>
                <button className="login-button mt-4" onClick={() => setSubmitted(false)}>
                  {t('resetPassword', 'backToResetPassword')}
                </button>
                <p className="signup-prompt enhanced-toggle mt-2">
                  {t('resetPassword', 'rememberPassword')} <Link to="/login">{t('resetPassword', 'logIn')}</Link>
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
