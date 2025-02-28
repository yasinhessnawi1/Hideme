import React from 'react';

const LoginForm = ({
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSignUp) {
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      console.log('Sign-up attempt:', { email, password, confirmPassword });
    } else {
      console.log('Login attempt:', { email, password });
    }

    // Redirect logic here...
  };

  const handleToggleSignUp = (e) => {
    e.preventDefault();
    setIsSignUp(!isSignUp);
  };

  return (
    <>
      <form className="login-form" onSubmit={handleSubmit}>
        {/* Email field */}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password field */}
        <div className="form-group">
          <div className="form-group-header">
            <label htmlFor="password">Password</label>
            {!isSignUp && (
              <a
                href="#"
                className="forgot-password"
                onClick={(e) => e.preventDefault()}
              >
                Forgot your password?
              </a>
            )}
          </div>
          <input
            type="password"
            id="password"
            placeholder="Enter Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Confirm Password field (only for sign-up) */}
        {isSignUp && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm Your Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="login-button">
          {isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>

      <div className="divider">
        <span>Or continue with</span>
      </div>

      <div className="social-buttons">
        {/* Apple */}
        <button
          type="button"
          className="social-button"
          aria-label="Continue with Apple"
        >
          <svg
            className="social-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.0375 12.5091C17.0125 9.50906 19.5 8.01406 19.5891 7.96406C18.2641 6.04906 16.2141 5.78906 15.4891 5.75906C13.7391 5.58406 12.0391 6.82406 11.1516 6.82406C10.2516 6.82406 8.85156 5.78906 7.37656 5.81906C5.45156 5.84906 3.67656 6.94406 2.71406 8.63906C0.739063 12.0841 2.20406 17.1591 4.12406 19.9091C5.06156 21.2591 6.15656 22.7841 7.60156 22.7391C9.00656 22.6891 9.54656 21.8591 11.2341 21.8591C12.9141 21.8591 13.4141 22.7391 14.8841 22.7091C16.3991 22.6891 17.3491 21.3241 18.2641 19.9616C19.3441 18.4066 19.7891 16.8841 19.8141 16.8091C19.7766 16.7966 17.0641 15.7591 17.0375 12.5091Z" />
            <path d="M14.7516 4.24656C15.5266 3.29906 16.0641 2.00906 15.9141 0.709061C14.8141 0.754061 13.4891 1.47656 12.6891 2.39906C11.9641 3.22406 11.3141 4.54906 11.4891 5.81406C12.7016 5.89906 13.9516 5.19406 14.7516 4.24656Z" />
          </svg>
        </button>
        {/* Google */}
        <button
          type="button"
          className="social-button"
          aria-label="Continue with Google"
        >
          <svg
            className="social-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </button>
        {/* Meta/Infinity (Optional) */}
        <button
          type="button"
          className="social-button"
          aria-label="Continue with Meta"
        >
          <svg
            className="social-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* Toggle prompt: changes based on the mode */}
      <p className="signup-prompt">
        {isSignUp ? 'Have an account? ' : "Don't have an account? "}
        <a href="#" onClick={handleToggleSignUp}>
          {isSignUp ? 'Log in' : 'Sign up'}
        </a>
      </p>
    </>
  );
};

export default LoginForm;
