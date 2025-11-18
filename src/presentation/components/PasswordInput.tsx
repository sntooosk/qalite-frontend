import { ChangeEvent, useState } from 'react';

import { EyeIcon, EyeSlashIcon } from './icons';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
}

export const PasswordInput = ({
  id,
  label,
  value,
  onChange = () => {},
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete,
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible((previous) => !previous);

  return (
    <label htmlFor={id} className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-wrapper">
        <input
          id={id}
          name={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className="field-input field-input--with-action"
        />
        <button
          type="button"
          className="field-input-action field-input-action--icon"
          onClick={toggleVisibility}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeSlashIcon aria-hidden className="icon" />
          ) : (
            <EyeIcon aria-hidden className="icon" />
          )}
        </button>
      </div>
    </label>
  );
};
