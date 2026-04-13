import { type ReactNode } from "react";

export interface ListStateProps<T> {
	items: T[];
	isLoading: boolean;
	loadingContent: ReactNode;
	emptyContent: ReactNode;
	children: (items: T[]) => ReactNode;
}

export function ListState<T>({
	items,
	isLoading,
	loadingContent,
	emptyContent,
	children,
}: ListStateProps<T>) {
	if (isLoading) return <>{loadingContent}</>;
	if (items.length === 0) return <>{emptyContent}</>;
	return <>{children(items)}</>;
}

export default ListState;
