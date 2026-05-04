/**
 * CountyPay UI Component Library
 * Built with Tailwind CSS for consistency and simplicity
 * All components support accessibility and responsive design
 */

import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// ============================================================================
// BUTTON COMPONENT
// ============================================================================
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  isLoading = false, 
  onClick,
  className = '',
  ...props 
}) => {
  const baseStyles = 'font-semibold rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    outline: 'border border-slate-300 text-slate-900 hover:bg-slate-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled || isLoading ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

// ============================================================================
// INPUT COMPONENT
// ============================================================================
export const Input = ({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors duration-200 ${
          error 
            ? 'border-red-300 bg-red-50 text-slate-900 placeholder-red-300' 
            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ============================================================================
// SELECT COMPONENT
// ============================================================================
export const Select = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors duration-200 appearance-none bg-white ${
          error
            ? 'border-red-300 bg-red-50 text-slate-900'
            : 'border-slate-300 text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ============================================================================
// CARD COMPONENT
// ============================================================================
export const Card = ({ children, title, subtitle, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-slate-200">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
};

// ============================================================================
// BADGE COMPONENT
// ============================================================================
export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================================================
// ALERT COMPONENT
// ============================================================================
export const Alert = ({ 
  children, 
  variant = 'info', 
  title, 
  onDismiss,
  className = '',
  ...props 
}) => {
  const variants = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: CheckCircle },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertCircle },
    danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertCircle }
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-lg p-4 flex gap-3 ${className}`}
      {...props}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
      <div className="flex-1">
        {title && <h3 className={`font-semibold text-sm ${config.text}`}>{title}</h3>}
        <div className={`text-sm ${config.text}`}>{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={`flex-shrink-0 ${config.text} hover:opacity-75`}>
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// MODAL COMPONENT
// ============================================================================
export const Modal = ({
  isOpen,
  title,
  children,
  actions,
  onClose,
  size = 'md',
  className = '',
  ...props
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      {...props}
    >
      <div
        className={`bg-white rounded-xl shadow-lg ${sizes[size]} w-full mx-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="px-6 py-4">{children}</div>

        {actions && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SPINNER COMPONENT
// ============================================================================
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg
        className="animate-spin h-full w-full text-emerald-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// ============================================================================
// TABLE COMPONENT
// ============================================================================
export const Table = ({ 
  headers = [], 
  rows = [], 
  loading = false,
  className = '',
  ...props 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 ${className}`} {...props}>
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-8 text-center text-sm text-slate-500">
                No data available
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-6 py-3 text-sm text-slate-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// TEXTAREA COMPONENT
// ============================================================================
export const Textarea = ({
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors duration-200 font-mono resize-vertical ${
          error
            ? 'border-red-300 bg-red-50 text-slate-900'
            : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ============================================================================
// CHECKBOX COMPONENT
// ============================================================================
export const Checkbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${className}`}
        {...props}
      />
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
};

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================
export const Divider = ({ label, className = '', ...props }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`} {...props}>
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>
    );
  }
  return <div className={`border-t border-slate-200 my-4 ${className}`} {...props} />;
};

// ============================================================================
// SKELETON LOADER
// ============================================================================
export const Skeleton = ({ width = 'w-full', height = 'h-4', className = '', ...props }) => (
  <div
    className={`${width} ${height} bg-slate-200 rounded animate-pulse ${className}`}
    {...props}
  />
);
