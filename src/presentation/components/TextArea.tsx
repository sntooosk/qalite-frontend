import { ChangeEvent } from 'react';

interface TextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
  dataTestId?: string;
}

export const TextArea = ({
  id,
  label,
  value,
  onChange = () => {},
  placeholder,
  required = false,
  rows = 4,
  disabled = false,
  dataTestId,
}: TextAreaProps) => (
  <label htmlFor={id} className="field">
    <span className="field-label">{label}</span>
    <textarea
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={rows}
      disabled={disabled}
      className="field-input field-textarea"
      data-testid={dataTestId}
    />
  </label>
);
