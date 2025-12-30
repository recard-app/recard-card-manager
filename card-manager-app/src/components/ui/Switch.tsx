import './Switch.scss';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled = false, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'switch--checked' : ''} ${disabled ? 'switch--disabled' : ''}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  );
}
