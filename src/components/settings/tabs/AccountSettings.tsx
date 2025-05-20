import React, {useEffect, useState} from "react";
import {AlertCircle, Loader2, Save} from "lucide-react";
import useUserProfile from "../../../hooks/auth/useUserProfile";
import {useLoading} from "../../../contexts/LoadingContext"; // Adjust path if needed
import LoadingWrapper from "../../common/LoadingWrapper";
import { useNotification } from "../../../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from '../../../contexts/LanguageContext';
import { mapBackendErrorToMessage } from '../../../utils/errorUtils';

export default function AccountSettings() {
    const { t } = useLanguage();
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
                message: t('account', 'profileUpdated'),
                type: 'success',
                duration: 3000
            });
        } catch (err: any) {
            notify({
                message: mapBackendErrorToMessage(err) || t('errors', 'failedToUpdateProfile'),
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
                message: t('account', 'currentPasswordRequired'),
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            notify({
                message: t('account', 'passwordsDoNotMatch'),
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (newPassword.length < 8) {
            notify({
                message: t('account', 'passwordTooShort'),
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
                message: mapBackendErrorToMessage(err) || t('errors', 'failedToChangePassword'),
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
                message: t('account', 'deleteConfirmationText'),
                type: 'error',
                duration: 3000
            });
            return;
        }
        if (!deletePassword) {
            notify({
                message: t('account', 'passwordRequiredForDeletion'),
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
                message: t('account', 'accountDeletionInitiated'),
                type: 'success',
                duration: 3000
            });
        } catch (err: any) {
            notify({
                message: mapBackendErrorToMessage(err) || t('errors', 'failedToDeleteAccount'),
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
                    <h2 className="card-title">{t('account', 'profileInformation')}</h2>
                    <p className="card-description">{t('account', 'updatePersonalInformation')}</p>
                </div>
                <div className="card-content">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="username">
                                       {t('account', 'username')}
                                    </label>
                                    <input
                                        className="form-input"
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder={t('account', 'usernamePlaceholder')}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="form-group">
                                <label className="form-label" htmlFor="email">
                                    {t('account', 'email')}
                                </label>
                                <input
                                    className="form-input"
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('account', 'emailPlaceholder')}
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
                                    <LoadingWrapper isLoading={isLoading} fallback={t('common', 'loading')}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                                    {isLoading ? t('common', 'loading') : t('account', 'saveProfile')}
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
                    <h2 className="card-title">{t('account', 'changePassword')}</h2>
                    <p className="card-description">{t('account', 'updatePasswordDescription')}</p>
                </div>
                <div className="card-content space-y-4">
                    {passwordError && (
                        <div className="alert alert-destructive">
                            <AlertCircle className="alert-icon" size={16} />
                            <div>
                                <div className="alert-title">{t('common', 'error')}</div>
                                <div className="alert-description">{passwordError}</div>
                            </div>
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="alert alert-success">
                            <div>
                                <div className="alert-title">{t('common', 'success')}</div>
                                <div className="alert-description">{t('account', 'passwordUpdated')}</div>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="currentPassword">
                            {t('account', 'currentPassword')}
                        </label>
                        <input
                            className="form-input"
                            id="currentPassword"
                            autoComplete="new-password"
                            aria-autocomplete="none"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder={t('account', 'currentPasswordPlaceholder')}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="newPassword">
                            {t('account', 'newPassword')}
                        </label>
                        <input
                            className="form-input"
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t('account', 'newPasswordPlaceholder')}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">
                            {t('account', 'confirmNewPassword')}
                        </label>
                        <input
                            className="form-input"
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('account', 'confirmNewPasswordPlaceholder')}
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        className="button button-primary"
                        onClick={handlePasswordChange}
                        disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin button-icon" /> : <Save size={16} className="button-icon" />}
                        {isLoading ? t('common', 'loading') : t('account', 'updatePassword')}
                    </button>
                </div>
            </div>

            {/* Danger Zone Card */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('account', 'dangerZone')}</h2>
                    <p className="card-description">{t('account', 'irreversibleActions')}</p>
                </div>
                <div className="card-content">
                    <div className="border border-destructive rounded-md p-4">
                        <h3 className="text-lg font-medium text-destructive">{t('account', 'deleteAccount')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('account', 'deleteAccountDescription')}
                        </p>
                            <div className="mt-4 space-y-3">
                                <p className="text-sm font-medium">{t('account', 'typeDeleteToConfirm')}</p>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder={t('account', 'typeDeleteHerePlaceholder')}
                                    disabled={isLoading}
                                />
                                <input
                                    className="form-input"
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder={t('account', 'passwordPlaceholder')}
                                    disabled={isLoading}
                                />
                                <div className="flex gap-3">
                                    <button
                                        className="button button-destructive"
                                        onClick={handleConfirmDeleteAccount}
                                        disabled={isLoading || deleteConfirmText !== 'DELETE' || !deletePassword}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        {isLoading ? t('common', 'loading') : t('account', 'confirmDeletion')}
                                    </button>
                                    <button
                                        className="button button-outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={isLoading}
                                    >
                                        {t('common', 'cancel')}
                                    </button>
                                </div>
                            </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
