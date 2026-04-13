import { IconButton } from "../Generic";

interface DownloadButtonProps {
	onClick: () => void;
	disabled?: boolean;
}

function DownloadButton({ onClick, disabled = false }: DownloadButtonProps) {
	return (
		<IconButton
			onClick={onClick}
			disabled={disabled}
			label="Fazer Download"
			icon="Download"
			variant="neutral"
			size="md"
		/>
	);
}

export default DownloadButton;
