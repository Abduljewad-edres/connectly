import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';

export const RegisterPage = () => {
  const { register } = useAuth();
  const { navigate } = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="card auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-icon">
            <span className="brand-c">C</span>
          </div>
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Join Connectly — Connect. Share. Belong.</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Abdul Rahman"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-prefix-wrapper">
              <span className="input-prefix">@</span>
              <input
                type="text"
                className="form-control"
                placeholder="abdul_dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <span className="text-muted text-xs">Letters, numbers, and underscores only</span>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="abdul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <button
            className="auth-link-btn"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

