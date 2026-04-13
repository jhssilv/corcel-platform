import { useEffect, useState } from "react";
import { requestReport } from "../../Api";
import { useSnackbar } from "../../Context/Generic";
import { Stack, Button, ModalScaffold } from "../Generic";

interface ReportModalProps {
	isOpen: boolean;
	onClose: () => void;
	textCount: number;
}

interface ApiErrorShape {
	error?: string;
}

function ReportModal({ isOpen, onClose, textCount }: ReportModalProps) {
	const [confirmEnabled, setConfirmEnabled] = useState(false);
	const { addSnackbar } = useSnackbar();

	useEffect(() => {
		if (!isOpen) {
			setConfirmEnabled(false);
			return;
		}

		setConfirmEnabled(false);
		const timer = setTimeout(() => setConfirmEnabled(true), 2000);
		return () => clearTimeout(timer);
	}, [isOpen]);

	const handleConfirm = async () => {
		try {
			const parsed = JSON.parse(
				localStorage.getItem("textIds") || "[]",
			) as unknown;
			const textIds = Array.isArray(parsed)
				? parsed.filter((value): value is number => typeof value === "number")
				: [];

			onClose();
			await requestReport(textIds);
			addSnackbar({
				text: "Relatório gerado com sucesso!",
				type: "success",
			});
		} catch (error) {
			console.error(error);
			addSnackbar({
				text: "Houve um erro ao gerar o relatório.",
				type: "error",
				duration: 5000,
			});
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<ModalScaffold
			isOpen={isOpen}
			onClose={onClose}
			title="Gerar Relatório"
			size="sm"
			footer={
				<>
					<Button tier="secondary" variant="neutral" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						tier="primary"
						variant="action"
						onClick={() => {
							void handleConfirm();
						}}
						disabled={!confirmEnabled}
					>
						Confirmar
					</Button>
				</>
			}
		>
			<Stack direction="vertical" gap={12} alignX="center">
				<p>
					Gerar relatório para os <b>{textCount}</b> textos <b>filtrados</b>?
				</p>
			</Stack>
		</ModalScaffold>
	);
}

export default ReportModal;
