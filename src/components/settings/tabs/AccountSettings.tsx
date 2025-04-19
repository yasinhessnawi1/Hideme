import React, { useState, useEffect } from "react";
import { Save, User, AlertCircle, Loader2 } from "lucide-react";
import useUserProfile from "../../../hooks/auth/useUserProfile"; // Adjust path if needed

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


    // Profile Info State
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");

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
    const [deleteError, setDeleteError] = useState("");

    // General Loading/Saving State
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    // Load user data when available
    useEffect(() => {
        if (user?.username && user?.email) {
            // Extract name parts from username if needed
            const nameParts = user.username.split(' ');
            if (nameParts.length < 2) {
                setName(user.username);
            } else {
                setName(nameParts[0] || user. username);
                setSurname(nameParts.slice(1).join(' ') || '');
            }

            setEmail(user.email);
        }
    }, [user]);

    // Clear errors on unmount or user change
    useEffect(() => {
        return () => {
            clearUserError();
            setPasswordError("");
            setDeleteError("");
            setGeneralError(null);
        };
    }, [user, clearUserError]);

    // --- Handlers ---

    const handleProfileSave = async () => {
        setIsSavingProfile(true);
        setProfileSaveSuccess(false);
        setGeneralError(null);
        clearUserError();

        // Construct name/username as needed by your backend
        const combinedName = `${name} ${surname}`.trim();

        try {
            await updateUserProfile({
                username: combinedName || user?.username,
                email: email,
            });
            setProfileSaveSuccess(true);
            setTimeout(() => setProfileSaveSuccess(false), 3000);
        } catch (err: any) {
            setGeneralError(err.userMessage || err.message || "Failed to update profile.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordError("");
        setPasswordSuccess(false);
        setGeneralError(null);
        clearUserError();

        if (!currentPassword) {
            setPasswordError("Current password is required");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("Password must be at least 8 characters");
            return;
        }

        setIsChangingPassword(true);
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
            setPasswordError(err.userMessage || err.message || "Failed to change password.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccountClick = () => {
        setDeleteError("");
        setShowDeleteConfirm(true);
    };

    const handleConfirmDeleteAccount = async () => {
        setDeleteError("");
        setGeneralError(null);
        clearUserError();

        if (deleteConfirmText !== "DELETE") {
            setDeleteError("Please type 'DELETE' to confirm.");
            return;
        }
        if (!deletePassword) {
            setDeleteError("Password is required to delete your account.");
            return;
        }

        setIsDeletingAccount(true);
        try {
            await deleteAccount({
                password: deletePassword,
                confirm: deleteConfirmText,
            });
            // Logout should be handled by useUser/AuthService after successful deletion
            alert("Account deletion initiated. You will be logged out.");
            // Optionally trigger logout from context here if not automatic
            // logout();
        } catch (err: any) {
            setDeleteError(err.userMessage || err.message || "Failed to delete account. Check your password.");
            setIsDeletingAccount(false); // Keep modal open on error
        }
        // Don't reset loading state on success, as user should be logged out/redirected
    };

    const isLoading = isUserLoading || isSavingProfile || isChangingPassword || isDeletingAccount;

    return (
        <div className="space-y-6">
            {generalError && (
                <div className="alert alert-destructive">
                    <AlertCircle className="alert-icon" size={16} />
                    <div>
                        <div className="alert-title">Error</div>
                        <div className="alert-description">{generalError}</div>
                    </div>
                </div>
            )}
            {profileSaveSuccess && (
                <div className="alert alert-success">
                    <div>
                        <div className="alert-title">Success</div>
                        <div className="alert-description">Profile updated successfully!</div>
                    </div>
                </div>
            )}

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
                                    <label className="form-label" htmlFor="firstName">
                                        First Name
                                    </label>
                                    <input
                                        className="form-input"
                                        id="firstName"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your first name"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="lastName">
                                        Last Name
                                    </label>
                                    <input
                                        className="form-input"
                                        id="lastName"
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        placeholder="Enter your last name"
                                        disabled={isLoading}
                                    />
                                </div>
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
                            <div className="flex justify-end">
                                <button
                                    className="button button-primary"
                                    onClick={handleProfileSave}
                                    disabled={isLoading || !user || !name || !surname || !email}
                                >
                                    {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
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
                            autoComplete={"off"}
                            aria-autocomplete={"none"}
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
                        {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
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
                        {deleteError && (
                            <div className="alert alert-destructive mt-3">
                                <AlertCircle className="alert-icon" size={16} />
                                <div>{deleteError}</div>
                            </div>
                        )}
                        {!showDeleteConfirm ? (
                            <button className="button button-destructive mt-4" onClick={handleDeleteAccountClick} disabled={isLoading}>
                                Delete My Account
                            </button>
                        ) : (
                            <div className="mt-4 space-y-3">
                                <p className="text-sm font-medium">Type "DELETE" and enter your password to confirm:</p>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder='Type "DELETE" here'
                                    disabled={isDeletingAccount}
                                />
                                <input
                                    className="form-input"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={isDeletingAccount}
                                />
                                <div className="flex gap-3">
                                    <button
                                        className="button button-destructive"
                                        onClick={handleConfirmDeleteAccount}
                                        disabled={isDeletingAccount || deleteConfirmText !== 'DELETE' || !deletePassword}
                                    >
                                        {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isDeletingAccount ? 'Deleting...' : 'Confirm Deletion'}
                                    </button>
                                    <button
                                        className="button button-outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isDeletingAccount}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
