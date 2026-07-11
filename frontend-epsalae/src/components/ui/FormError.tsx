// ============================================
// FORM ERROR COMPONENT
// ============================================
// Display field-level validation errors

import React from 'react';

interface FormErrorProps {
  errors?: Record<string, string>;
  fieldName?: string;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({
  errors,
  fieldName,
  className = ''
}) => {
  // Get error message for specific field
  if (fieldName && errors && errors[fieldName]) {
    return (
      <div style={styles.errorContainer} className={className}>
        <span style={styles.errorIcon}>!</span>
        <span style={styles.errorText}>{errors[fieldName]}</span>
      </div>
    );
  }

  // Display all errors if no specific field
  if (errors && Object.keys(errors).length > 0) {
    return (
      <div style={styles.errorBox} className={className}>
        <h4 style={styles.errorTitle}>Please fix the following errors:</h4>
        <ul style={styles.errorList}>
          {Object.entries(errors).map(([field, message]) => (
            <li key={field} style={styles.errorItem}>
              <span style={styles.fieldLabel}>{formatFieldName(field)}:</span>{' '}
              {message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
};

interface FormFieldWrapperProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helperText?: string;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  error,
  required = false,
  children,
  helperText
}) => {
  return (
    <div style={styles.fieldWrapper}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {children}
      {error && <div style={styles.fieldError}>{error}</div>}
      {helperText && !error && <div style={styles.helperText}>{helperText}</div>}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
}

export const FormInput: React.FC<InputProps> = ({
  error,
  label,
  required,
  helperText,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const inputStyle: React.CSSProperties = {
    ...styles.input,
    borderColor: error ? '#d32f2f' : isFocused ? '#1976d2' : '#ddd',
    backgroundColor: error ? 'rgba(211, 47, 47, 0.05)' : '#fff'
  };

  if (label) {
    return (
      <FormFieldWrapper label={label} error={error} required={required} helperText={helperText}>
        <input
          {...props}
          style={inputStyle}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
        />
      </FormFieldWrapper>
    );
  }

  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        setIsFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
};

// Helper function to format field names
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

const styles: { [key: string]: React.CSSProperties } = {
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    marginTop: '4px'
  },
  errorIcon: {
    color: '#d32f2f',
    fontSize: '16px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  errorText: {
    color: '#c41c3b',
    fontSize: '14px',
    fontWeight: '500'
  },
  errorBox: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  errorTitle: {
    margin: '0 0 8px 0',
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: '600'
  },
  errorList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#991b1b',
    fontSize: '14px'
  },
  errorItem: {
    marginBottom: '4px'
  },
  fieldLabel: {
    fontWeight: '600'
  },
  fieldWrapper: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  required: {
    color: '#d32f2f',
    marginLeft: '4px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease'
  },
  fieldError: {
    color: '#d32f2f',
    fontSize: '13px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  helperText: {
    color: '#666',
    fontSize: '13px',
    marginTop: '4px'
  }
};

export default FormError;
