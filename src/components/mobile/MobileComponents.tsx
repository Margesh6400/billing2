import React from 'react';

interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  label
}) => (
  <button
    onClick={onClick}
    className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center"
    style={{ minWidth: '56px', minHeight: '56px' }}
  >
    {icon}
    {label && <span className="ml-2 text-sm">{label}</span>}
  </button>
);

interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 ${
      onClick ? 'active:bg-gray-50 cursor-pointer' : ''
    }`}
  >
    {children}
  </div>
);

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  ...props
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      {...props}
      className="w-full px-4 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

interface MobileTableProps {
  headers: string[];
  rows: React.ReactNode[][];
}

export const MobileTable: React.FC<MobileTableProps> = ({ headers, rows }) => (
  <div className="overflow-x-auto -mx-4">
    <div className="inline-block min-w-full align-middle p-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface MobileSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  label,
  options,
  value,
  onChange,
  error
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white"
    >
      <option value="">Select...</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);
