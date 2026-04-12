import { ReactNode, HTMLAttributes } from 'react';
import styles from './form_field.module.css';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
    label: string;
    htmlFor?: string;
    children: ReactNode;
    helperText?: string;
    errorText?: string;
    required?: boolean;
}

export function FormField({
    label,
    htmlFor,
    children,
    helperText,
    errorText,
    required = false,
    className = '',
    ...props
}: FormFieldProps) {
    const classes = [styles.formField, className].filter(Boolean).join(' ');

    return (
        <div className={classes} {...props}>
            <label htmlFor={htmlFor} className={styles.label}>
                {label}
                {required && <span className={styles.required}>*</span>}
            </label>
            <div className={styles.control}>{children}</div>
            {errorText ? <p className={styles.errorText}>{errorText}</p> : null}
            {!errorText && helperText ? <p className={styles.helperText}>{helperText}</p> : null}
        </div>
    );
}

export default FormField;
