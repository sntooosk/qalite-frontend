import { ChangeEvent, InputHTMLAttributes } from 'react';

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
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  autoCapitalize?: InputHTMLAttributes<HTMLInputElement>['autoCapitalize'];
  autoCorrect?: InputHTMLAttributes<HTMLInputElement>['autoCorrect'];
  spellCheck?: boolean;
  min?: number;
  max?: number;
  step?: number;
  dataTestId?: string;
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
  autoComplete,
  inputMode,
  autoCapitalize,
  autoCorrect,
  spellCheck,
  min,
  max,
  step,
  dataTestId,
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
      inputMode={inputMode}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
      min={min}
      max={max}
      step={step}
      className="field-input"
      data-testid={dataTestId}
    />
  </label>
);
