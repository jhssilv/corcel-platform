import {
	useEffect,
	useRef,
	type CSSProperties,
	type MutableRefObject,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type Ref,
} from "react";
import { IconButton } from "../IconButton/IconButton";
import styles from "./floating_panel.module.css";

interface FloatingPanelPosition {
	top: number;
	left: number | null;
}

interface FloatingPanelDefaultPosition {
	top: number;
	left?: number;
	right?: number;
}

interface DragState {
	dragging: boolean;
	offsetX: number;
	offsetY: number;
}

export interface FloatingPanelProps {
	title: ReactNode;
	subtitle?: ReactNode;
	children: ReactNode;
	onClose: () => void;
	storageKey?: string;
	draggable?: boolean;
	defaultPosition?: FloatingPanelDefaultPosition;
	width?: number | string;
	maxHeight?: number | string;
	actions?: ReactNode;
	forwardRef?: Ref<HTMLDivElement>;
}

const MIN_LEFT = 8;
const MIN_TOP = 68;
const EDGE_PADDING = 8;

const parseStoredPosition = (
	storageKey?: string,
): FloatingPanelPosition | null => {
	if (!storageKey) {
		return null;
	}

	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw) as Partial<FloatingPanelPosition>;
		if (typeof parsed.top !== "number") {
			return null;
		}

		return {
			top: parsed.top,
			left: typeof parsed.left === "number" ? parsed.left : null,
		};
	} catch {
		return null;
	}
};

export function FloatingPanel({
	title,
	subtitle,
	children,
	onClose,
	storageKey,
	draggable = true,
	defaultPosition = { top: 150, right: 20 },
	width = 320,
	maxHeight = "80vh",
	actions,
	forwardRef,
}: FloatingPanelProps) {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const dragStateRef = useRef<DragState>({
		dragging: false,
		offsetX: 0,
		offsetY: 0,
	});
	const positionRef = useRef<FloatingPanelPosition | null>(
		parseStoredPosition(storageKey) ?? {
			top: defaultPosition.top,
			left:
				typeof defaultPosition.left === "number" ? defaultPosition.left : null,
		},
	);

	const assignForwardRef = (node: HTMLDivElement | null) => {
		panelRef.current = node;

		if (!forwardRef) {
			return;
		}

		if (typeof forwardRef === "function") {
			forwardRef(node);
			return;
		}

		(forwardRef as MutableRefObject<HTMLDivElement | null>).current = node;
	};

	const clampPosition = (left: number, top: number) => {
		if (!panelRef.current) {
			return { left, top };
		}

		const rect = panelRef.current.getBoundingClientRect();
		const maxLeft = Math.max(
			MIN_LEFT,
			window.innerWidth - rect.width - EDGE_PADDING,
		);
		const maxTop = Math.max(
			MIN_TOP,
			window.innerHeight - rect.height - EDGE_PADDING,
		);

		return {
			left: Math.min(Math.max(left, MIN_LEFT), maxLeft),
			top: Math.min(Math.max(top, MIN_TOP), maxTop),
		};
	};

	useEffect(() => {
		if (!draggable) {
			return;
		}

		const handleMouseMove = (event: MouseEvent) => {
			if (!dragStateRef.current.dragging || !panelRef.current) {
				return;
			}

			const nextLeft = event.clientX - dragStateRef.current.offsetX;
			const nextTop = event.clientY - dragStateRef.current.offsetY;
			const clamped = clampPosition(nextLeft, nextTop);
			positionRef.current = clamped;
			panelRef.current.style.left = `${clamped.left}px`;
			panelRef.current.style.top = `${clamped.top}px`;
			panelRef.current.style.right = "auto";
		};

		const handleMouseUp = () => {
			if (!dragStateRef.current.dragging) {
				return;
			}

			dragStateRef.current.dragging = false;
			if (storageKey && positionRef.current) {
				localStorage.setItem(storageKey, JSON.stringify(positionRef.current));
			}
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [draggable, storageKey]);

	const handleDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (!draggable || !panelRef.current) {
			return;
		}

		const target = event.target as HTMLElement | null;
		if (
			target?.closest(
				'button, input, textarea, select, a, label, [role="button"]',
			)
		) {
			return;
		}

		const panelRect = panelRef.current.getBoundingClientRect();
		dragStateRef.current = {
			dragging: true,
			offsetX: event.clientX - panelRect.left,
			offsetY: event.clientY - panelRect.top,
		};
	};

	const position = positionRef.current;
	const panelStyle: CSSProperties = {
		top: position?.top ?? defaultPosition.top,
		left: typeof position?.left === "number" ? `${position.left}px` : undefined,
		right:
			typeof position?.left === "number"
				? "auto"
				: `${defaultPosition.right ?? 20}px`,
		width: typeof width === "number" ? `${width}px` : width,
		maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
	};

	return (
		<div className={styles.panel} ref={assignForwardRef} style={panelStyle}>
			<div
				className={[
					styles.header,
					draggable ? styles.headerDraggable : "",
				]
					.filter(Boolean)
					.join(" ")}
				onMouseDown={handleDragStart}
			>
				<div className={styles.headerRow}>
					<div className={styles.headingGroup}>
						<h2 className={styles.title}>{title}</h2>
						{subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
					</div>
					<div className={styles.actions}>
						{actions}
						<IconButton
							icon="X"
							label="Fechar painel"
							onClick={onClose}
							size="sm"
							variant="neutral"
						/>
					</div>
				</div>
			</div>
			<div className={styles.body}>{children}</div>
		</div>
	);
}

export default FloatingPanel;
