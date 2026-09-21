import { useState, type ChangeEvent, type FormEvent } from "react";
import { registerUser } from "../../Api";
import { Banner, Stack, Button, FormField, ModalScaffold } from "../Generic";

interface RegisterUserModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface FormMessage {
	text: string;
	type: "success" | "error" | "";
}

function RegisterUserModal({ isOpen, onClose }: RegisterUserModalProps) {
	const [username, setUsername] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
	const [message, setMessage] = useState<FormMessage>({ text: "", type: "" });

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		setMessage({ text: "", type: "" });

		try {
			const response = await registerUser(username);
			setTemporaryPassword(response.temporaryPassword || null);
			setMessage({
				text: response.message || "Usuário criado com sucesso!",
				type: "success",
			});
			setUsername("");
		} catch (error) {
			console.error(error);
			setTemporaryPassword(null);
			setMessage({ text: "Erro ao registrar usuário.", type: "error" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setUsername("");
		setTemporaryPassword(null);
		setMessage({ text: "", type: "" });
		onClose();
	};

	if (!isOpen) {
		return null;
	}

	return (
		<ModalScaffold
			isOpen={isOpen}
			onClose={handleClose}
			title="Registrar Novo Usuário"
			footer={
				<>
					<Button
						type="button"
						tier="secondary"
						variant="neutral"
						onClick={handleClose}
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						tier="primary"
						variant="action"
						disabled={isSubmitting}
						isLoading={isSubmitting}
						form="register-user-form"
					>
						Criar Usuário
					</Button>
				</>
			}
		>
			<Stack
				as="form"
				id="register-user-form"
				onSubmit={handleSubmit}
				direction="vertical"
				gap={20}
			>
				<FormField
					label="Nome de Usuário"
					htmlFor="username"
					required
					helperText="O usuário será criado como inativo e escolherá sua senha definitiva no primeiro acesso."
				>
					<input
						type="text"
						id="username"
						value={username}
						onChange={(event: ChangeEvent<HTMLInputElement>) =>
							setUsername(event.target.value)
						}
						required
						minLength={3}
					/>
				</FormField>

				{message.text && (
					<Banner variant={message.type === "error" ? "danger" : "success"}>
						<div>{message.text}</div>
						{temporaryPassword && (
							<div style={{ marginTop: "8px" }}>
								<div>
									<strong>Senha temporária:</strong>{" "}
									<code
										style={{
											background: "#f0f0f0",
											padding: "2px 6px",
											borderRadius: "4px",
											userSelect: "all",
										}}
									>
										{temporaryPassword}
									</code>
								</div>
								<div style={{ fontSize: "0.85em", marginTop: "4px", opacity: 0.9 }}>
									Forneça esta senha ao usuário para que ele possa realizar o primeiro acesso.
								</div>
							</div>
						)}
					</Banner>
				)}
			</Stack>
		</ModalScaffold>
	);
}

export default RegisterUserModal;
