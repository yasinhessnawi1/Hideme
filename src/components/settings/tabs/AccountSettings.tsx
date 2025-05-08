import React, {useEffect, useState} from "react";
import {AlertCircle, Loader2, Save} from "lucide-react";
import useUserProfile from "../../../hooks/auth/useUserProfile";
import {useLoading} from "../../../contexts/LoadingContext"; // Adjust path if needed
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
export default function AccountSettings() {
    const {
        user,
        updateUserProfile,
        changePassword,
        deleteAccount,
        isLoading: isUserLoading,
        error: userError,
        clearError: clearUserError
    } = useUserProfile();

    const navigate = useNavigate();


    // Profile Info State
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    // Password Change State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Account Deletion State
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // General Loading/Saving State
    const { isLoading: globalLoading, startLoading, stopLoading } = useLoading();
    const {notify} = useNotification();
    // Load user data when available
    useEffect(() => {
        if (user?.username && user?.email) {
            // Extract name parts from username if needed
            setUsername(user.username);
            setEmail(user.email);
        }
    }, [user]);

    // Clear errors on unmount or user change
    useEffect(() => {
        return () => {
            clearUserError();
            setPasswordError("");
        };
    }, [user, clearUserError]);

    // --- Handlers ---

    const handleProfileSave = async () => {
        startLoading('setting.save');
        clearUserError();

        // Construct name/username as needed by your backend
        try {
            await updateUserProfile({
                username: username || user?.username,
                email: email,
            });
            notify({
                message: "Profile updated successfully!",
                type: 'success',
                duration: 3000
            });
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? "Failed to update profile.",
                type: 'error',
                duration: 3000
            });
        } finally {
            stopLoading('setting.save');
        }
    };

    const handlePasswordChange = async () => {
        setPasswordError("");
        setPasswordSuccess(false);
        clearUserError();

        if (!currentPassword) {
            notify({
                message: "Current password is required",
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            notify({
                message: "New passwords don't match",
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (newPassword.length < 8) {
            notify({
                message: "Password must be at least 8 characters",
                type: 'error',
                duration: 3000
            });
            return;
        }

        startLoading('setting.password');
        try {
            await changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setPasswordSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? "Failed to change password.",
                type: 'error',
                duration: 3000
            });
        } finally {
            stopLoading('setting.password');
        }
    };


    const handleConfirmDeleteAccount = async () => {
        clearUserError();

        if (deleteConfirmText !== "DELETE") {
            notify({
                message: "Please type 'DELETE' to confirm.",
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (!deletePassword) {
            notify({
                message: "Password is required to delete your account.",
                type: 'error',
                duration: 3000
            });
            return;
        }

        startLoading('setting.delete');
        try {
            await deleteAccount({
                password: deletePassword,
                confirm: deleteConfirmText,
            }).then(() => {
                navigate('/login');
            });
            // Logout should be handled by useUser/AuthService after successful deletion
            notify({
                message: "Account deletion initiated. You will be logged out.",
                type: 'success',
                duration: 3000
            });
        } catch (err: any) {
            notify({
                message: (err.userMessage ?? err.message) ?? "Failed to delete account. Check your password.",
                type: 'error',
                duration: 3000
            });
        } finally {
            stopLoading('setting.delete');
        }
        // Don't reset loading state on success, as user should be logged out/redirected
    };

    const isLoading = isUserLoading || globalLoading(['setting.save', 'setting.password', 'setting.delete']);

    return (
        <div className="space-y-6">
            {/* Profile Information Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Profile Information</h2>
                    <p className="card-description">Update your personal information</p>
                </div>
                <div className="card-content">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="username">
                                       Username
                                    </label>
                                    <input
                                        className="form-input"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your username"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                <label className="form-label" htmlFor="email">
                                    Email Address
                                </label>
                                <input
                                    className="form-input"
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    disabled={isLoading}
                                />
                            </div>
                            </div>
                           
                            <div className="flex justify-end">
                                <button
                                    className="button button-primary"
                                    onClick={handleProfileSave}
                                    disabled={isLoading}
                                >
                                    <LoadingWrapper isLoading={isLoading} fallback="Saving...">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                                    {isLoading ? 'Saving...' : 'Save Profile'}
                                    </LoadingWrapper>
                                    
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Change Password</h2>
                    <p className="card-description">Update your password for security</p>
                </div>
                <div className="card-content space-y-4">
                    {passwordError && (
                        <div className="alert alert-destructive">
                            <AlertCircle className="alert-icon" size={16} />
                            <div>
                                <div className="alert-title">Error</div>
                                <div className="alert-description">{passwordError}</div>
                            </div>
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="alert alert-success">
                            <div>
                                <div className="alert-title">Success</div>
                                <div className="alert-description">Password updated successfully!</div>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="currentPassword">
                            Current Password
                        </label>
                        <input
                            className="form-input"
                            id="currentPassword"
                            autoComplete="new-password"
                            aria-autocomplete="none"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="newPassword">
                            New Password
                        </label>
                        <input
                            className="form-input"
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter minimum 8 characters"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">
                            Confirm New Password
                        </label>
                        <input
                            className="form-input"
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your new password"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        className="button button-primary"
                        onClick={handlePasswordChange}
                        disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                        {isLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </div>

            {/* Danger Zone Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Danger Zone</h2>
                    <p className="card-description">Irreversible actions</p>
                </div>
                <div className="card-content">
                    <div className="border border-destructive rounded-md p-4">
                        <h3 className="text-lg font-medium text-destructive">Delete Account</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Permanently delete your account and all associated data. This cannot be undone.
                        </p>
                            <div className="mt-4 space-y-3">
                                <p className="text-sm font-medium">Type "DELETE" and enter your password to confirm:</p>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder='Type "DELETE" here'
                                    disabled={isLoading}
                                />
                                <input
                                    className="form-input"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                                <div className="flex gap-3">
                                    <button
                                        className="button button-destructive"
                                        onClick={handleConfirmDeleteAccount}
                                        disabled={isLoading || deleteConfirmText !== 'DELETE' || !deletePassword}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isLoading ? 'Deleting...' : 'Confirm Deletion'}
                                    </button>
                                    <button
                                        className="button button-outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
