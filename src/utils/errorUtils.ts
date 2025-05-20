// Error mapping utility for backend-to-frontend error messages

const backendErrorMap: Record<string, string> = {
    // Python/JS/General errors
    "ValueError": "Invalid value provided",
    "TypeError": "Incorrect data type",
    "KeyError": "Required key not found",
    "IndexError": "Index out of range",
    "FileNotFoundError": "Required file not found",
    "PermissionError": "Permission denied",
    "IOError": "I/O operation failed",
    "OSError": "Operating system error",
    "ConnectionError": "Connection failed",
    "TimeoutError": "Operation timed out",
    "json.JSONDecodeError": "Invalid JSON format",
    "ZeroDivisionError": "Division by zero error",
    "AttributeError": "Missing required attribute",
    "ImportError": "Required module not available",
    "ModuleNotFoundError": "Required module not found",
    "MemoryError": "Insufficient memory to complete operation",
    "RuntimeError": "Runtime execution error",
    "asyncio.TimeoutError": "Asynchronous operation timed out",
    "UnicodeDecodeError": "Character encoding error",
    "UnicodeEncodeError": "Character encoding error",
    "NotImplementedError": "Feature not implemented",
    "Exception": "An error occurred",
    // Go/backend error strings
    "resource not found": "The requested resource could not be found",
    "unauthorized access": "Authentication required",
    "forbidden access": "You don't have permission to access this resource",
    "invalid request": "Invalid request",
    "internal server error": "An internal server error occurred",
    "validation error": "Input validation failed",
    "duplicate resource": "A resource with the same unique identifier already exists",
    "invalid credentials": "Invalid username or password",
    "expired token": "Authentication token has expired",
    "invalid token": "Invalid token",
    // HTTP/response codes
    "bad_request": "Invalid request",
    "unauthorized": "Authentication required",
    "forbidden": "You don't have permission to access this resource",
    "not_found": "The requested resource could not be found",
    "method_not_allowed": "This method is not allowed for this resource",
    "conflict": "A resource with the same unique identifier already exists",
    "internal_error": "An internal server error occurred",
    "validation_error": "Input validation failed",
    "invalid_credentials": "Invalid username or password",
    "token_expired": "Authentication token has expired",
    "token_invalid": "Invalid token",
    "duplicate_resource": "A resource with the same unique identifier already exists",
    "authentication_failed": "Authentication failed",
    "Login failed. Request failed with status code 401": "Your Credentials are invalid",
    "Login failed. Request failed with status code 409": "Your Credentials are invalid",
};

/**
 * Maps a backend error (string or error object) to a user-friendly message.
 * Falls back to the original error message if no mapping is found.
 */
export function mapBackendErrorToMessage(error: any): string {
    console.log('[errorUtils] Received error:', error);

    // Prefer userMessage if present
    if (error?.userMessage) {
        console.log('[errorUtils] Using userMessage:', error.userMessage);
        return error.userMessage;
    }
    // Axios error: check response.data.userMessage or response.data.message
    if (error?.response?.data) {
        if (error.response.data.userMessage) {
            console.log('[errorUtils] Using response.data.userMessage:', error.response.data.userMessage);
            return error.response.data.userMessage;
        }
        if (error.response.data.message) {
            console.log('[errorUtils] Using response.data.message:', error.response.data.message);
            return error.response.data.message;
        }
    }

    if (!error) {
        console.log('[errorUtils] No error provided, returning default message.');
        return "An unknown error occurred";
    }
    // If error is an object with a code, try mapping by code first
    if (typeof error === "object" && error.code) {
        console.log('[errorUtils] Error has code:', error.code);
        if (backendErrorMap[error.code]) {
            console.log('[errorUtils] Found mapping for code:', error.code);
            // If there are details (e.g., validation errors), append them
            if (error.details && typeof error.details === 'object') {
                const details = Object.values(error.details).join(' ');
                console.log('[errorUtils] Error details:', details);
                return backendErrorMap[error.code] + (details ? `: ${details}` : '');
            }
            return backendErrorMap[error.code];
        }
        // If not found, try mapping by message
        if (error.message && backendErrorMap[error.message]) {
            console.log('[errorUtils] Found mapping for message:', error.message);
            return backendErrorMap[error.message];
        }
        // Otherwise, show the backend's message (and details if present)
        let msg = error.message || JSON.stringify(error);
        if (error.details && typeof error.details === 'object') {
            const details = Object.values(error.details).join(' ');
            msg += details ? `: ${details}` : '';
            console.log('[errorUtils] Appending details to message:', details);
        }
        console.log('[errorUtils] Returning fallback message:', msg);
        return msg;
    }
    // If error is a string, try mapping by string or substring
    let errStr = typeof error === "string" ? error : (error.message || JSON.stringify(error));
    for (const key of Object.keys(backendErrorMap)) {
        if (errStr === key || errStr.includes(key)) {
            console.log('[errorUtils] Found mapping for string or substring:', key);
            return backendErrorMap[key];
        }
    }
    console.log('[errorUtils] No mapping found, returning error string:', errStr);
    return errStr;
} 