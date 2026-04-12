import { forwardRef, useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './checkbox.module.css';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'className' | 'children'> {
    label?: ReactNode;
    description?: ReactNode;
    size?: CheckboxSize;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({
    id,
    label,
    description,
    size = 'md',
    checked,
    defaultChecked,
    onChange,
    disabled = false,
    ...props
}, ref) {
    const generatedId = useId();
    const inputId = id ?? `checkbox-${generatedId}`;
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
    const resolvedChecked = isControlled ? Boolean(checked) : internalChecked;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) {
            setInternalChecked(event.target.checked);
        }

        onChange?.(event);
    };

    return (
        <label className={[styles.wrapper, styles[`size-${size}`], disabled ? styles.disabled : ''].filter(Boolean).join(' ')} htmlFor={inputId}>
            <input
                ref={ref}
                id={inputId}
                type="checkbox"
                checked={resolvedChecked}
                onChange={handleChange}
                disabled={disabled}
                className={styles.input}
                {...props}
            />
            <span className={styles.indicator} aria-hidden="true" />
            <span className={styles.content}>
                {label ? <span className={styles.label}>{label}</span> : null}
                {description ? <span className={styles.description}>{description}</span> : null}
            </span>
        </label>
    );
});

export default Checkbox;
