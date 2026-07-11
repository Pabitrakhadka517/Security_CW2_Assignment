// ============================================
// LOADING SPINNER COMPONENT
// ============================================
// Spinner for showing loading states

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#1976d2',
  fullScreen = false,
  message
}) => {
  const sizeMap = {
    small: { spinner: 24, container: 40 },
    medium: { spinner: 40, container: 60 },
    large: { spinner: 56, container: 80 }
  };

  const { spinner: spinnerSize, container: containerSize } = sizeMap[size];

  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9998,
        backdropFilter: 'blur(2px)'
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      };

  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `3px solid rgba(0, 0, 0, 0.1)`,
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  };

  const messageStyle: React.CSSProperties = {
    marginTop: '16px',
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div style={containerStyle}>
        <div style={spinnerStyle} />
        {message && <p style={messageStyle}>{message}</p>}
      </div>
    </>
  );
};

export default LoadingSpinner;
