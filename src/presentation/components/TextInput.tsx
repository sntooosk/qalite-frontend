import { ChangeEvent } from 'react';

interface TextInputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
}

export const TextInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange = () => {},
  required = false,
  placeholder,
  disabled = false,
  readOnly = false,
  autoComplete
}: TextInputProps) => (
  <label htmlFor={id} className="field">
    <span className="field-label">{label}</span>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={autoComplete}
      className="field-input"
    />
  </label>
);
