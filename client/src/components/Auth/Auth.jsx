import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useApp } from '../../context/AppContext';
import { Mail, Apple, Github, ArrowRight, ShieldCheck, Lock, User, Save, LogOut } from 'lucide-react';
import './Auth.css';

const Auth = () => {
    const { state, actions } = useApp();
    const [loading, setLoading] = useState(false);
    
    // Auth states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLogin, setIsLogin] = useState(true);

    // Profile states (for logged in users)
    const [profileEmail, setProfileEmail] = useState('');
    const [profileFirstName, setProfileFirstName] = useState('');
    const [profileLastName, setProfileLastName] = useState('');
    
    const [message, setMessage] = useState({ type: '', text: '' });

    // Sync profile states when user changes
    useEffect(() => {
        if (state.user) {
            setProfileEmail(state.user.email || '');
            setProfileFirstName(state.user.user_metadata?.first_name || '');
            setProfileLastName(state.user.user_metadata?.last_name || '');
        }
    }, [state.user]);

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (!supabase) {
            setMessage({ type: 'error', text: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' });
            setLoading(false);
            return;
        }

        try {
            let error;
            if (isLogin) {
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                error = signInError;
            } else {
                const { error: signUpError } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName
                        }
                    }
                });
                error = signUpError;
                if (!error) setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            }

            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message || error.error_description });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const updates = {
                data: {
                    first_name: profileFirstName,
                    last_name: profileLastName
                }
            };

            // Only include email if it changed
            if (profileEmail !== state.user.email) {
                updates.email = profileEmail;
            }

            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;

            if (updates.email) {
                setMessage({ type: 'success', text: 'Profile updated. Please check both your old and new email addresses to confirm the change.' });
            } else {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleSocialAuth = (provider) => {
        setMessage({ type: 'info', text: `${provider} authentication is coming soon.` });
    };

    const handleResetPassword = async () => {
        if (!supabase) {
            setMessage({ type: 'error', text: 'Supabase is not configured. Please set environment variables.' });
            return;
        }

        if (!email) {
            setMessage({ type: 'error', text: 'Please enter your email address above to reset your password.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/auth?type=recovery',
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || error.error_description });
        } finally {
            setLoading(false);
        }
    };

    // --- LOGGED IN VIEW ---
    if (state.user) {
        return (
            <div className="auth-wrapper">
                <div className="auth-container profile-container">
                    <div className="auth-branding">
                        <div className="branding-content">
                            <h1>Account Settings</h1>
                            <p className="branding-tagline">
                                Manage your profile information and account preferences.
                            </p>
                            <div className="profile-summary">
                                <div className="profile-avatar">
                                    {(profileFirstName[0] || '').toUpperCase()}{(profileLastName[0] || '').toUpperCase()}
                                </div>
                                <div className="profile-info">
                                    <h3>{profileFirstName} {profileLastName}</h3>
                                    <p>{state.user.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="branding-decoration dec-1"></div>
                        <div className="branding-decoration dec-2"></div>
                    </div>

                    <div className="auth-panel">
                        <div className="auth-header profile-header">
                            <h2>My Profile</h2>
                            <p>Update your personal information below.</p>
                        </div>

                        {message.text && (
                            <div className={`auth-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="auth-form profile-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="pFirstName">First name</label>
                                    <input 
                                        id="pFirstName" 
                                        type="text" 
                                        value={profileFirstName} 
                                        onChange={(e) => setProfileFirstName(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pLastName">Last name</label>
                                    <input 
                                        id="pLastName" 
                                        type="text" 
                                        value={profileLastName} 
                                        onChange={(e) => setProfileLastName(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="pEmail">Email address</label>
                                <input 
                                    id="pEmail" 
                                    type="email" 
                                    value={profileEmail} 
                                    onChange={(e) => setProfileEmail(e.target.value)} 
                                    required 
                                />
                                <p className="input-hint">Changing your email requires verification.</p>
                            </div>

                            <div className="profile-actions">
                                <button type="submit" className="btn btn-primary profile-submit" disabled={loading}>
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                
                                <button 
                                    type="button" 
                                    className="btn btn-secondary profile-signout" 
                                    onClick={() => supabase.auth.signOut()}
                                >
                                    <LogOut size={18} />
                                    Sign Out
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // --- LOGGED OUT VIEW ---
    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                {/* Left Side: Illustration / Branding */}
                <div className="auth-branding">
                    <div className="branding-content">
                        <h1>MoatWise</h1>
                        <p className="branding-tagline">
                            Discover hidden value in the markets. Keep your portfolio perfectly synced across all your devices.
                        </p>
                        
                        <div className="branding-features">
                            <div className="feature-item">
                                <ShieldCheck size={20} className="feature-icon" />
                                <span>Find businesses with true economic moats</span>
                            </div>
                            <div className="feature-item">
                                <Lock size={20} className="feature-icon" />
                                <span>Bank-grade encryption for your portfolio</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Background Elements */}
                    <div className="branding-decoration dec-1"></div>
                    <div className="branding-decoration dec-2"></div>
                </div>

                {/* Right Side: Form */}
                <div className="auth-panel">
                    <div className="auth-header">
                        <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
                        <p>{isLogin ? 'Enter your details to access your account.' : 'Join MoatWise to unlock unlimited stock analysis.'}</p>
                    </div>

                    {/* Paywall Alert Banner */}
                    {state.paywallMessage && (
                        <div className="auth-paywall-alert">
                            <span className="paywall-icon">⚠️</span>
                            {state.paywallMessage}
                        </div>
                    )}

                    <div className="social-login-group">
                        <button type="button" className="btn-social" onClick={() => handleSocialAuth('Google')}>
                            <svg className="social-icon" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Continue with Google
                        </button>
                        <button type="button" className="btn-social" onClick={() => handleSocialAuth('Apple')}>
                            <Apple size={20} className="social-icon apple-icon" />
                            Continue with Apple
                        </button>
                    </div>

                    <div className="auth-separator">
                        <span>or continue with email</span>
                    </div>

                    {message.text && (
                        <div className={`auth-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="auth-form">
                        {!isLogin && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First name</label>
                                    <input 
                                        id="firstName" 
                                        type="text" 
                                        value={firstName} 
                                        onChange={(e) => setFirstName(e.target.value)} 
                                        placeholder="John" 
                                        required={!isLogin} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="lastName">Last name</label>
                                    <input 
                                        id="lastName" 
                                        type="text" 
                                        value={lastName} 
                                        onChange={(e) => setLastName(e.target.value)} 
                                        placeholder="Doe" 
                                        required={!isLogin} 
                                    />
                                </div>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input 
                                id="email" 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="name@company.com" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <div className="label-row">
                                <label htmlFor="password">Password</label>
                                {isLogin && (
                                    <button 
                                        type="button" 
                                        className="forgot-link" 
                                        onClick={handleResetPassword}
                                        disabled={loading}
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="••••••••" 
                                required 
                                minLength={6} 
                            />
                        </div>
                        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="auth-footer">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button type="button" className="toggle-mode-btn" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
