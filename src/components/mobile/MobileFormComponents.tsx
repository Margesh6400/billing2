import React from 'react';

interface MobileFormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileFormGroup: React.FC<MobileFormGroupProps> = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {children}
  </div>
);

interface MobileFormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export const MobileFormField: React.FC<MobileFormFieldProps> = ({ label, error, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {children}
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

interface MobileNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const MobileNumberInput: React.FC<MobileNumberInputProps> = ({ label, error, ...props }) => (
  <MobileFormField label={label} error={error}>
    <input
      type="number"
      className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
      pattern="[0-9]*"
      inputMode="numeric"
      {...props}
    />
  </MobileFormField>
);

interface MobileDateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const MobileDateInput: React.FC<MobileDateInputProps> = ({ label, error, ...props }) => (
  <MobileFormField label={label} error={error}>
    <input
      type="date"
      className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
      {...props}
    />
  </MobileFormField>
);

interface MobileSearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const MobileSearchInput: React.FC<MobileSearchInputProps> = ({ onClear, ...props }) => (
  <div className="relative">
    <input
      type="search"
      className="w-full h-12 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
      {...props}
    />
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  </div>
);

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({ label, error, ...props }) => (
  <MobileFormField label={label} error={error}>
    <textarea
      className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
      {...props}
    />
  </MobileFormField>
);

interface MobileSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const MobileSubmitButton: React.FC<MobileSubmitButtonProps> = ({
  loading,
  children,
  ...props
}) => (
  <button
    type="submit"
    className="w-full h-12 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={loading}
    {...props}
  >
    {loading ? (
      <span className="flex items-center justify-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Loading...
      </span>
    ) : (
      children
    )}
  </button>
);
