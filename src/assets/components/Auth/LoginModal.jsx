// src/components/Auth/LoginModal.jsx
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, Briefcase, ShieldCheck } from 'lucide-react';
import '../../styles/LoginModal.css';

export default function LoginModal({ isOpen, onClose, role, onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isLeader = role === 'leaders';
  const RoleIcon = isLeader ? ShieldCheck : Briefcase;
  const roleColor = isLeader ? '#10b981' : '#8b5cf6';
  const roleTitle = isLeader ? 'Leaders Portal' : 'Workers Portal';

  // SPECIFIC PASSCODES FOR EACH PORTAL
  const EXPECTED_PASSWORD = isLeader ? 'tcl1234567890' : 'tcw1234567890';

  const handleCancel = () => {
    setPassword('');
    setError('');
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password === EXPECTED_PASSWORD) {
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess({ role });
      }
      setPassword('');
      setError('');
      if (typeof onClose === 'function') {
        onClose();
      }
    } else {
      setError(`Incorrect password for ${roleTitle}. Access denied.`);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleCancel} aria-label='Close Modal'>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="role-badge" style={{
            backgroundColor: `${roleColor}22`,
            color: roleColor,
            border: `1px solid ${roleColor}44`
          }}>
            <RoleIcon size={16} />
            <span>{roleTitle}</span>
          </div>

          <h2 className='modal-title'>Access Portal</h2>
          <p className='modal-subtitle'>Enter the portal password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className='login-form'>
          {error && <div className='error-message' style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.85rem' }}>{error}</div>}

          <div className="form-group">
            <label className='form-label'>Access Password</label>
            <div className="input-wrapper">
              <Lock className='input-icon' size={18} />

              <input 
                type={showPassword ? 'text' : 'password'} 
                className='glass-input input-with-icon'
                placeholder='Enter password...'
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required
                autoFocus
              />

              <button 
                type='button'
                className='toggle-password'
                onClick={() => setShowPassword(!showPassword)} 
                aria-label='Toggle password visibility'
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button 
              type='button' 
              className='glass-btn' 
              onClick={handleCancel}
              style={{ background: 'transparent', border: '1px solid var(--glass-border)', flex: 1 }}
            >
              Cancel
            </button>
            <button 
              type='submit'
              className='glass-btn submit-btn'
              style={{ background: `linear-gradient(135deg, ${roleColor}, #3b82f6)`, flex: 2 }}
            >
              Enter Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}