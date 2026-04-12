import { HTMLAttributes, ReactNode, CSSProperties } from 'react';
import styles from '../../../styles/stack.module.css';

type GapSize = 4 | 8 | 12 | 16 | 20 | 32 | 64;
type Alignment = 'start' | 'center' | 'end' | 'space-between' | 'space-evenly';
type Direction = 'horizontal' | 'vertical';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
    gap?: GapSize;
    direction?: Direction;
    alignX?: Alignment;
    alignY?: Alignment;
    wrap?: boolean;
}

const mapAlignmentToFlex = (align: Alignment): string => {
    switch (align) {
        case 'start':
            return 'flex-start';
        case 'end':
            return 'flex-end';
        default:
            return align;
    }
};

export function Stack({
    children,
    gap,
    direction = 'horizontal',
    alignX,
    alignY,
    wrap = false,
    className = '',
    style,
    ...props
}: StackProps) {
    const isHorizontal = direction === 'horizontal';

    // X-axis alignment
    const xFlexProperty = isHorizontal ? 'justifyContent' : 'alignItems';
    const xFlexValue = alignX ? (mapAlignmentToFlex(alignX) as any) : undefined;

    // Y-axis alignment
    const yFlexProperty = isHorizontal ? 'alignItems' : 'justifyContent';
    const yFlexValue = alignY ? (mapAlignmentToFlex(alignY) as any) : undefined;

    const stackStyles: CSSProperties = {
        ...style,
    };

    if (gap) {
        stackStyles.gap = `${gap}px`;
    }
    if (xFlexValue) {
        stackStyles[xFlexProperty as keyof CSSProperties] = xFlexValue;
    }
    if (yFlexValue) {
        stackStyles[yFlexProperty as keyof CSSProperties] = yFlexValue;
    }

    const classes = [
        styles.stack,
        styles[direction],
        wrap ? styles.wrap : '',
        className
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes} style={stackStyles} {...props}>
            {children}
        </div>
    );
}

export default Stack;
