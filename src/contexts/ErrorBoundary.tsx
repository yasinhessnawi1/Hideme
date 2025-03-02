import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';

interface ErrorBoundaryProps {
    children: ReactNode;
    redirectPath?: string;
    showHomeLink?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    redirect: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            redirect: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.setState({ errorInfo });

        // Optionally send to your error logging service
        // logErrorToService(error, errorInfo);

        // Set redirect to true after a delay to allow user to see the error
        if (this.props.redirectPath) {
            setTimeout(() => {
                this.setState({ redirect: true });
            }, 5000); // Redirect after 5 seconds
        }
    }

    handleRedirect = (): void => {
        this.setState({ redirect: true });
    };

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            redirect: false
        });
    };

    render(): ReactNode {
        const { redirectPath = '/', showHomeLink = true } = this.props;
        const { hasError, error, redirect } = this.state;

        if (redirect) {
            return <Navigate to={redirectPath} replace />;
        }

        if (hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-content">
                        <h1>Something went wrong</h1>
                        <p>We apologize for the inconvenience. An error has occurred in the application.</p>

                        {error && (
                            <div className="error-details">
                                <p><strong>Error:</strong> {error.toString()}</p>
                            </div>
                        )}

                        <div className="error-actions">
                            {showHomeLink && (
                                <Link to="/" className="home-link" onClick={this.handleReset}>
                                    Return to Home Page
                                </Link>
                            )}

                            <button onClick={this.handleRedirect} className="redirect-button">
                                Redirect Now
                            </button>

                            <button onClick={() => window.location.reload()} className="reload-button">
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
