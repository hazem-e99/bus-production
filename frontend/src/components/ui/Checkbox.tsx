import React from 'react';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function Checkbox({ 
  id, 
  checked = false, 
  onCheckedChange, 
  className = '', 
  disabled = false 
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCheckedChange) {
      onCheckedChange(e.target.checked);
    }
  };

  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={`
        w-4 h-4 
        text-blue-600 
        bg-gray-100 
        border-gray-300 
        rounded 
        focus:ring-blue-500 
        focus:ring-2
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
}
