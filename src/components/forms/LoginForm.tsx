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
import LoadingWrapper from "../common/LoadingWrapper";
import { useNotification } from '../../contexts/NotificationContext';

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
  const {notify} = useNotification();
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
            message: 'Passwords do not match!',
            position: 'top-right'
          });
          return;
        }

        // Validate required fields
        if (!username.trim()) {
            notify({
              type: 'error',
              message: 'Username is required',
              position: 'top-right'
            });
          return;
        }

        if (!email.trim()) {
          notify({
            type: 'error',
            message: 'Email is required',
            position: 'top-right'
          });
          return;
        }

        // Validate password strength
        if (password.length < 8) {
          notify({
            type: 'error',
            message: 'Password must be at least 8 characters long',
            position: 'top-right'
          });
          return;
        }

        // Register the new user with the provided details
        // The register function will automatically log the user in on success
        await register(username, email, password, confirmPassword);
        stopLoading('login.submit');
      } else {
        // ---------- LOGIN VALIDATION ----------

        // Validate required fields
        if (!email.trim().isWellFormed()) {
          notify({
            type: 'error',
            message: 'Email is required',
            position: 'top-right'
          });
          return;
        }

        if (!password.trim()) {
          notify({
            type: 'error',
            message: 'Password is required',
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
        message: 'Login successful!',
        position: 'top-right'
      });
    } catch (err: any) {
      stopLoading('login.submit');
      notify({
        type: 'error',
        message: 'Login failed! ' + err.message,
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
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Full Name field (only displayed for Sign-Up) */}
          {isSignUp && (
              <>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                      type="text"
                      id="username"
                      name="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                      type="email"
                      id="email"
                      placeholder="Enter Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                  />
                </div>
              </>
          )}

          {!isSignUp && (
            <div className="form-group">
                <label htmlFor="text">Email</label>
                <input
                  type="text"
                  id="text"
                  placeholder="Enter Your Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
              />
          </div>
          )}

          {/* Password field (always displayed) */}
          <div className="form-group">
            <div className="form-group-header">
              <label htmlFor="password">Password</label>
              {/* "Forgot password" link is only shown in login mode */}
              {!isSignUp && (
                  <Link
                      to="/forgot-password"
                      className="forgot-password"
                  >
                    Forgot your password?
                  </Link>
              )}
            </div>
            <input
                type="password"
                id="password"
                placeholder="Enter Your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
          </div>

          {/* Confirm Password field (only for Sign-Up) */}
          {isSignUp && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    placeholder="Confirm Your Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
              </div>
          )}

          {/* Submit button - text changes based on mode and loading state */}
          <button
              type="submit"
              className="login-button"
              disabled={isLoading}
          >
            <LoadingWrapper isLoading={isLoading || isGlobalLoading('login.submit')} overlay={true} fallback={''}
                            >
              {isLoading || isGlobalLoading('login.submit') ? 'Logging in...' : (isSignUp ? 'Sign Up' : 'Login')}
            </LoadingWrapper>
          </button>
        </form>

        {/* Toggle prompt to switch between login and signup modes */}
        <p className="signup-prompt enhanced-toggle">
          {isSignUp ? 'Have an account? ' : "Don't have an account? "}
          <a href="#" onClick={handleToggleSignUp}>
            {isSignUp ? 'Log in' : 'Sign up'}
          </a>
        </p>
      </>
  );
};

export default LoginForm;
