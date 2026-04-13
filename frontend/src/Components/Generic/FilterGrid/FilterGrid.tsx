import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

export interface FilterGridProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	minColumnWidth?: number;
	gap?: number;
	marginTop?: number;
	marginBottom?: number;
}

export function FilterGrid({
	children,
	minColumnWidth = 200,
	gap = 15,
	marginTop,
	marginBottom,
	style,
	...props
}: FilterGridProps) {
	const mergedStyle: CSSProperties = {
		display: "grid",
		gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`,
		gap,
		...(marginTop !== undefined ? { marginTop } : {}),
		...(marginBottom !== undefined ? { marginBottom } : {}),
		...style,
	};

	return (
		<div style={mergedStyle} {...props}>
			{children}
		</div>
	);
}

export default FilterGrid;
