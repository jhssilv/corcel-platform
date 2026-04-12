import { HTMLAttributes, ReactNode } from 'react';
import styles from './card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
    const combinedClassName = `${styles.card} ${className}`.trim();

    return (
        <div className={combinedClassName} {...props}>
            {children}
        </div>
    );
}

export default Card;
