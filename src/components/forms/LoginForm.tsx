/**
 * LoginForm.tsx
 * -------------------------------------
 * A dual-purpose authentication component that handles both user login and registration.
 *
 * This component is designed to be reused in different authentication contexts and
 * intelligently adapts its display based on whether the user is signing up or logging in.
 *
 */

import React, {JSX} from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Props interface for the LoginForm component.
 * The parent component is responsible for maintaining all form state,
 * allowing it to access and process form values if needed.
 */
interface LoginFormProps {
  /** Indicates if the user is in Sign-Up mode (true) or Login mode (false). */
  isSignUp: boolean;
  /** Toggles between Sign-Up/Login mode. */
  setIsSignUp: React.Dispatch<React.SetStateAction<boolean>>;
  /** Full name for Sign-Up. */
  username: string;
  /** Setter for fullName state. */
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  /** Email address for Login or Sign-Up. */
  email: string;
  /** Setter for email state. */
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  /** Password for Login or Sign-Up. */
  password: string;
  /** Setter for password state. */
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  /** Confirm Password for Sign-Up - used to verify password matches. */
  confirmPassword: string;
  /** Setter for confirmPassword state. */
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * LoginForm component – Renders a form for either Login or Sign-Up based on `isSignUp`.
 * Handles form validation, submission, and error display.
 * Uses the UserContext for authentication operations.
 *
 * @param {LoginFormProps} props - The properties for LoginForm component.
 * @returns {JSX.Element} The rendered form element.
 */
const LoginForm: React.FC<LoginFormProps> = ({
                                               isSignUp,
                                               setIsSignUp,
                                               username,
                                               setUsername,
                                               email,
                                               setEmail,
                                               password,
                                               setPassword,
                                               confirmPassword,
                                               setConfirmPassword,
                                             }: LoginFormProps): JSX.Element => {
  // Hook to navigate programmatically after successful authentication
  const navigate = useNavigate();

  // Get authentication methods and state from UserContext
  const { login, register, isLoading, clearError } = useUserContext();
  const { notify } = useNotification();
  const { t } = useLanguage();
  // Local form error state separate from the global auth context errors
  const { startLoading, stopLoading, isLoading: isGlobalLoading } = useLoading();

  /**
   * Handles form submission for both Login and Sign-Up modes.
   * Performs client-side validation before submitting to the API.
   * On success, redirects to the playground page.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || isGlobalLoading()) return; // Prevent multiple submissions while loading
    // Clear any previous errors from both local state and context
    clearError();

    try {
      startLoading('login.submit');
      if (isSignUp) {
        // ---------- SIGN UP VALIDATION ----------

        // Check if passwords match
        if (password !== confirmPassword) {
          notify({
            type: 'error',
            message: t('auth', 'passwordsDoNotMatch'),
            position: 'top-right'
          });
          return;
        }

        // Validate required fields
        if (!username.trim()) {
          notify({
            type: 'error',
            message: t('auth', 'usernameRequired'),
            position: 'top-right'
          });
          return;
        }

        if (!email.trim()) {
          notify({
            type: 'error',
            message: t('auth', 'emailRequired'),
            position: 'top-right'
          });
          return;
        }

        // Validate password strength
        if (password.length < 8) {
          notify({
            type: 'error',
            message: t('auth', 'passwordTooShort'),
            position: 'top-right'
          });
          return;
        }

        // Register the new user with the provided details
        await register(username, email, password, confirmPassword);
        stopLoading('login.submit');
      } else {
        // ---------- LOGIN VALIDATION ----------

        // Validate required fields
        if (!email.trim().isWellFormed()) {
          notify({
            type: 'error',
            message: t('auth', 'emailRequired'),
            position: 'top-right'
          });
          return;
        }

        if (!password.trim()) {
          notify({
            type: 'error',
            message: t('auth', 'passwordRequired'),
            position: 'top-right'
          });
          return;
        }

        // Attempt to log in the user with credentials
        await login(email, password);
        stopLoading('login.submit');
      }

      // If we reach this point, authentication was successful
      // Redirect to playground after successful submission
      navigate('/playground');
      notify({
        type: 'success',
        message: t('auth', 'loginSuccess'),
        position: 'top-right'
      });
    } catch (err: any) {
      stopLoading('login.submit');
      notify({
        type: 'error',
        message: t('auth', 'loginFailed') + ' ' + err.message,
        position: 'top-right'
      });
    }
  };

  /**
   * Toggles between Sign-Up and Login modes.
   * Clears any displayed errors when switching modes.
   *
   * @param {React.MouseEvent<HTMLAnchorElement, MouseEvent>} e - The click event on the toggle link.
   */
  const handleToggleSignUp = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    clearError(); // Clear any errors when switching modes
    setIsSignUp(!isSignUp);
  };


  return (
      <>
        <form className="login-form" onSubmit={handleSubmit} aria-label={t('auth', isSignUp ? 'signUpForm' : 'loginForm')}>
          {/* Full Name field (only displayed for Sign-Up) */}
          {isSignUp && (
              <div className="form-group">
                <label htmlFor="username" className="login-label">
                  {t('auth', 'username')}
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('auth', 'usernamePlaceholder')}
                  className="login-input"
                  required
                />
              </div>
          )}
          <div className="form-group">
            <label htmlFor="email" className="login-label">
              {t('auth', 'email')}
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={isSignUp ? t('auth', 'emailPlaceholder') : t('auth', 'enterEmailOrUsername')}
              className="login-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="login-label">
              {t('auth', 'password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth', 'passwordPlaceholder')}
              className="login-input"
              required
            />
            {/* "Forgot password" link is only shown in login mode */}
            {!isSignUp && (
              <Link className="forgot-password" to="/forgot-password">
                {t('auth', 'forgotPassword')}
              </Link>
            )}
          </div>
          {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword" className="login-label">
                  {t('auth', 'confirmPassword')}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('auth', 'confirmPasswordPlaceholder')}
                  className="login-input"
                  required
                />
              </div>
          )}
          <button type="submit" className="login-button">
            {t('auth', isSignUp ? 'signUp' : 'login')}
          </button>
          <p className="signup-prompt enhanced-toggle">
            {t('auth', isSignUp ? 'alreadyHaveAccount' : 'noAccount')}
            {' '}
            <Link to="#" onClick={handleToggleSignUp} className="login-toggle-link">
              {t('auth', isSignUp ? 'loginHere' : 'signUpHere')}
            </Link>
          </p>
        </form>
      </>
  );
};

export default LoginForm;
