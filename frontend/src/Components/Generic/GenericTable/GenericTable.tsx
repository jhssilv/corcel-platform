import { HTMLAttributes, ReactNode, memo } from "react";
import styles from "./generic_table.module.css";

export type GenericTableMode = "semantic" | "grid";
export type GenericTableMobileMode = "scroll" | "stack";
export type GenericTableAlign = "left" | "center" | "right";

export interface GenericTableColumn<T> {
	key: string;
	header: ReactNode;
	render: (
		row: T,
		rowIndex: number,
		context: { isSelected: boolean },
	) => ReactNode;
	align?: GenericTableAlign;
	width?: string;
	hideOnMobile?: boolean;
	truncate?: boolean;
}

export interface GenericTableProps<T> extends HTMLAttributes<HTMLDivElement> {
	data: T[];
	columns: GenericTableColumn<T>[];
	getRowId: (row: T, rowIndex: number) => string | number;
	mode?: GenericTableMode;
	mobileMode?: GenericTableMobileMode;
	onRowClick?: (row: T, rowIndex: number) => void;
	isRowSelected?: (row: T, rowIndex: number) => boolean;
}

const alignClassByValue: Record<GenericTableAlign, string> = {
	left: styles.alignLeft,
	center: styles.alignCenter,
	right: styles.alignRight,
};

interface MemoRowProps {
	row: unknown;
	rowIndex: number;
	columns: GenericTableColumn<any>[];
	getRowId: (row: any, rowIndex: number) => string | number;
	isSelected: boolean;
	onRowClick?: (row: any, rowIndex: number) => void;
}

const SemanticRow = memo(
	function SemanticRow({
		row,
		rowIndex,
		columns,
		getRowId,
		isSelected,
		onRowClick,
	}: MemoRowProps) {
		const canClick = !!onRowClick;

		return (
			<tr
				key={getRowId(row, rowIndex)}
				className={[
					canClick ? styles.clickable : "",
					isSelected ? styles.selected : "",
				]
					.filter(Boolean)
					.join(" ")}
				onClick={canClick ? () => onRowClick(row, rowIndex) : undefined}
			>
				{columns.map((column) => (
					<td
						key={column.key}
						style={column.width ? { width: column.width } : undefined}
						className={[
							alignClassByValue[column.align || "left"],
							column.hideOnMobile ? styles.hideOnMobile : "",
							column.truncate ? styles.truncate : "",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{column.render(row, rowIndex, { isSelected })}
					</td>
				))}
			</tr>
		);
	},
	(previousProps, nextProps) => {
		return (
			previousProps.row === nextProps.row &&
			previousProps.rowIndex === nextProps.rowIndex &&
			previousProps.columns === nextProps.columns &&
			previousProps.isSelected === nextProps.isSelected &&
			previousProps.onRowClick === nextProps.onRowClick
		);
	},
);

const GridRow = memo(
	function GridRow({
		row,
		rowIndex,
		columns,
		getRowId,
		isSelected,
		onRowClick,
	}: MemoRowProps) {
		const canClick = !!onRowClick;

		return (
			<div
				key={getRowId(row, rowIndex)}
				role="row"
				className={[
					styles.gridRow,
					canClick ? styles.clickable : "",
					isSelected ? styles.selected : "",
				]
					.filter(Boolean)
					.join(" ")}
				onClick={canClick ? () => onRowClick(row, rowIndex) : undefined}
			>
				{columns.map((column) => {
					const headerLabel =
						typeof column.header === "string" ? column.header : column.key;

					return (
						<div
							key={column.key}
							role="cell"
							data-label={headerLabel}
							style={column.width ? { width: column.width } : undefined}
							className={[
								styles.gridCell,
								alignClassByValue[column.align || "left"],
								column.hideOnMobile ? styles.hideOnMobile : "",
								column.truncate ? styles.truncate : "",
							]
								.filter(Boolean)
								.join(" ")}
						>
							{column.render(row, rowIndex, { isSelected })}
						</div>
					);
				})}
			</div>
		);
	},
	(previousProps, nextProps) => {
		return (
			previousProps.row === nextProps.row &&
			previousProps.rowIndex === nextProps.rowIndex &&
			previousProps.columns === nextProps.columns &&
			previousProps.isSelected === nextProps.isSelected &&
			previousProps.onRowClick === nextProps.onRowClick
		);
	},
);

export function GenericTable<T>({
	data,
	columns,
	getRowId,
	mode = "semantic",
	mobileMode = "scroll",
	onRowClick,
	isRowSelected,
	className = "",
	...props
}: GenericTableProps<T>) {
	const wrapperClasses = [
		styles.wrapper,
		mode === "semantic" ? styles.semanticWrapper : styles.gridWrapper,
		mobileMode === "stack" ? styles.mobileStack : styles.mobileScroll,
		className,
	]
		.filter(Boolean)
		.join(" ");

	if (mode === "semantic") {
		return (
			<div className={wrapperClasses} {...props}>
				<table className={styles.table}>
					<thead>
						<tr>
							{columns.map((column) => (
								<th
									key={column.key}
									style={column.width ? { width: column.width } : undefined}
									className={[
										alignClassByValue[column.align || "left"],
										column.hideOnMobile ? styles.hideOnMobile : "",
									]
										.filter(Boolean)
										.join(" ")}
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.map((row, rowIndex) => {
							const isSelected = isRowSelected
								? isRowSelected(row, rowIndex)
								: false;

							return (
								<SemanticRow
									key={getRowId(row, rowIndex)}
									row={row}
									rowIndex={rowIndex}
									columns={columns}
									getRowId={getRowId}
									isSelected={isSelected}
									onRowClick={onRowClick}
								/>
							);
						})}
					</tbody>
				</table>
			</div>
		);
	}

	return (
		<div className={wrapperClasses} {...props}>
			<div className={styles.gridTable} role="table">
				<div className={styles.gridHeader} role="row">
					{columns.map((column) => (
						<div
							key={column.key}
							role="columnheader"
							style={column.width ? { width: column.width } : undefined}
							className={[
								styles.gridCell,
								styles.gridHeaderCell,
								alignClassByValue[column.align || "left"],
								column.hideOnMobile ? styles.hideOnMobile : "",
							]
								.filter(Boolean)
								.join(" ")}
						>
							{column.header}
						</div>
					))}
				</div>

				<div className={styles.gridBody}>
					{data.map((row, rowIndex) => {
						const isSelected = isRowSelected
							? isRowSelected(row, rowIndex)
							: false;

						return (
							<GridRow
								key={getRowId(row, rowIndex)}
								row={row}
								rowIndex={rowIndex}
								columns={columns}
								getRowId={getRowId}
								isSelected={isSelected}
								onRowClick={onRowClick}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default GenericTable;
