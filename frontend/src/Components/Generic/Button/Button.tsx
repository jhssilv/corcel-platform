import { ReactNode, ElementType, forwardRef } from 'react';
import { Stack, Icon, IconName } from '..';
import styles from '../../../styles/button.module.css';

export type ButtonTier = 'primary' | 'secondary' | 'tertiary';
export type ButtonVariant = 'action' | 'danger' | 'neutral';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps<E extends ElementType = 'button'> = {
    as?: E;
    tier: ButtonTier;
    variant: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: IconName;
    rightIcon?: IconName;
    children?: ReactNode;
    disabled?: boolean;
    className?: string;
} & Omit<React.ComponentPropsWithoutRef<E>, 'as' | 'tier' | 'variant' | 'size' | 'disabled' | 'className'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Button = forwardRef<HTMLElement, ButtonProps<any>>(({
    as: Component = 'button',
    tier,
    variant,
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    children,
    disabled = false,
    ...props
}, ref) => {
    const isDisabled = disabled || isLoading;

    const classes = [
        styles.button,
        styles[`tier-${tier}`],
        styles[`variant-${variant}`],
        styles[`size-${size}`],
        isLoading ? styles.loading : '',
        isDisabled ? styles.disabled : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <Component
            ref={ref}
            className={classes}
            disabled={isDisabled}
            {...props}
        >
            <Stack direction="horizontal" alignX="center" alignY="center" gap={8} as="span">
                {isLoading && (
                    <Icon name="Loader2" className={styles.spinner} color="white" />
                )}
                {!isLoading && leftIcon && (
                    <Icon name={leftIcon} color="white" />
                )}

                {children && <span>{children}</span>}

                {!isLoading && rightIcon && (
                    <Icon name={rightIcon} color="white" />
                )}
            </Stack>
        </Component>
    );
});

Button.displayName = 'Button';

export default Button;