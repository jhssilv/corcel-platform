import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../Components/Layout/TopBar";
import {
	getUsersData,
	resetUserPassword,
	setUserActiveStatus,
	setUserAdminRole,
} from "../Api";
import { useAuth } from "../Context/Auth/UseAuth";
import { useSnackbar } from "../Context/Generic";
import {
	Banner,
	Card,
	Stack,
	Button,
	FormField,
	SectionHeader,
	ListState,
	GenericTable,
	type GenericTableColumn,
	ModalScaffold,
} from "../Components/Generic";
import type { UserData } from "../types";

function UserManagementDashboard() {
	const [users, setUsers] = useState<UserData[]>([]);
	const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loading, setLoading] = useState(true);
	const [confirmAdminToggle, setConfirmAdminToggle] = useState<UserData | null>(
		null,
	);
	const [resetPasswordUser, setResetPasswordUser] = useState<UserData | null>(
		null,
	);
	const [generatedTempPassword, setGeneratedTempPassword] = useState<
		string | null
	>(null);
	const [isResetting, setIsResetting] = useState(false);
	const [copied, setCopied] = useState(false);

	const { username: currentUsername } = useAuth();
	const navigate = useNavigate();
	const { addSnackbar } = useSnackbar();

	const userColumns: GenericTableColumn<UserData>[] = [
		{
			key: "username",
			header: "Usuário",
			render: (user) => user.username,
			truncate: true,
		},
		{
			key: "lastLogin",
			header: "Último Login",
			render: (user) =>
				user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Nunca",
			truncate: true,
		},
		{
			key: "status",
			header: "Status",
			render: (user) => (
				<Stack gap={8} wrap>
					<Button
						size="sm"
						tier="secondary"
						variant={user.isAdmin ? "action" : "neutral"}
						disabled
					>
						Admin: {user.isAdmin ? "Sim" : "Não"}
					</Button>
					<Button
						size="sm"
						tier="secondary"
						variant={user.isActive ? "action" : "danger"}
						disabled
					>
						{user.isActive ? "Ativo" : "Inativo"}
					</Button>
				</Stack>
			),
		},
		{
			key: "actions",
			header: "Ações",
			render: (user) => (
				<Stack gap={8} alignX="end" wrap>
					<Button
						size="sm"
						tier="secondary"
						variant={user.isAdmin ? "action" : "neutral"}
						onClick={() => setConfirmAdminToggle(user)}
						disabled={user.username === currentUsername}
					>
						{user.isAdmin ? "Remover Admin" : "Tornar Admin"}
					</Button>
					<Button
						size="sm"
						tier="secondary"
						variant={user.isActive ? "danger" : "action"}
						onClick={() => {
							void handleSetActiveStatus(user.username, !user.isActive);
						}}
						disabled={user.username === currentUsername}
					>
						{user.isActive ? "Desativar" : "Ativar"}
					</Button>
					<Button
						size="sm"
						tier="secondary"
						variant="neutral"
						onClick={() => {
							setResetPasswordUser(user);
							setGeneratedTempPassword(null);
							setCopied(false);
						}}
						disabled={user.username === currentUsername}
					>
						Redefinir Senha
					</Button>
				</Stack>
			),
			align: "right",
		},
	];

	const fetchUsers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getUsersData();
			setUsers(data);
			setFilteredUsers(data);
		} catch (fetchError) {
			console.error(fetchError);
			addSnackbar({
				text: "Failed to load users.",
				type: "error",
				duration: 5000,
			});
		} finally {
			setLoading(false);
		}
	}, [addSnackbar]);

	useEffect(() => {
		void fetchUsers();
	}, [fetchUsers]);

	useEffect(() => {
		if (searchTerm) {
			const lower = searchTerm.toLowerCase();
			setFilteredUsers(
				users.filter((user) => user.username.toLowerCase().includes(lower)),
			);
			return;
		}

		setFilteredUsers(users);
	}, [searchTerm, users]);

	const handleSetActiveStatus = async (
		username: string,
		isActive: boolean,
	) => {
		if (username === currentUsername) {
			return;
		}

		try {
			await setUserActiveStatus(username, isActive);
			await fetchUsers();
			addSnackbar({
				text: isActive
					? `Usuário '${username}' ativado com sucesso.`
					: `Usuário '${username}' desativado com sucesso.`,
				type: "success",
			});
		} catch (err) {
			console.error("Failed to update active status", err);
			addSnackbar({
				text: "Failed to update active status",
				type: "error",
			});
		}
	};

	const handleSetAdminRole = async () => {
		if (!confirmAdminToggle) {
			return;
		}

		try {
			const nextIsAdmin = !confirmAdminToggle.isAdmin;
			await setUserAdminRole(confirmAdminToggle.username, nextIsAdmin);
			const userRef = confirmAdminToggle.username;
			setConfirmAdminToggle(null);
			await fetchUsers();
			addSnackbar({
				text: nextIsAdmin
					? `Privilégios de administrador concedidos a '${userRef}'.`
					: `Privilégios de administrador removidos de '${userRef}'.`,
				type: "success",
			});
		} catch (err) {
			console.error("Failed to update admin status", err);
			addSnackbar({
				text: "Failed to update admin status",
				type: "error",
			});
			setConfirmAdminToggle(null);
		}
	};

	const handleResetPassword = async () => {
		if (!resetPasswordUser) {
			return;
		}

		try {
			setIsResetting(true);
			const response = await resetUserPassword(resetPasswordUser.username);
			setGeneratedTempPassword(response.temporaryPassword);
			await fetchUsers();
			addSnackbar({
				text: `Senha de '${resetPasswordUser.username}' redefinida com sucesso.`,
				type: "success",
			});
		} catch (err) {
			console.error("Failed to reset password", err);
			addSnackbar({
				text: "Falha ao redefinir senha do usuário.",
				type: "error",
			});
		} finally {
			setIsResetting(false);
		}
	};

	const handleCloseResetModal = () => {
		setResetPasswordUser(null);
		setGeneratedTempPassword(null);
		setCopied(false);
	};

	const handleCopyPassword = () => {
		if (!generatedTempPassword) return;
		void navigator.clipboard.writeText(generatedTempPassword);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div>
			<TopBar showSidePanel={true} />

			<div>
				<SectionHeader
					heading="Gerenciamento de Usuários"
					preserveCase
					actions={
						<Button
							onClick={() => navigate("/main")}
							tier="secondary"
							variant="neutral"
						>
							Voltar
						</Button>
					}
				/>

				<Card>
					<Stack direction="vertical" gap={20}>
						<FormField
							label="Buscar usuário"
							htmlFor="user-management-search-input"
						>
							<input
								id="user-management-search-input"
								type="text"
								placeholder="Buscar usuário..."
								value={searchTerm}
								onChange={(event: ChangeEvent<HTMLInputElement>) =>
									setSearchTerm(event.target.value)
								}
							/>
						</FormField>

						<ListState
							items={filteredUsers}
							isLoading={loading}
							loadingContent={<p>Carregando...</p>}
							emptyContent={<p>Nenhum usuário encontrado.</p>}
						>
							{() => (
								<GenericTable
									mode="semantic"
									mobileMode="scroll"
									columns={userColumns}
									data={filteredUsers}
									getRowId={(user) => user.username}
								/>
							)}
						</ListState>
					</Stack>
				</Card>
			</div>

			{confirmAdminToggle && (
				<ModalScaffold
					isOpen={!!confirmAdminToggle}
					onClose={() => setConfirmAdminToggle(null)}
					title="Confirmar Alteração"
					size="sm"
					footer={
						<>
							<Button
								tier="secondary"
								variant="neutral"
								onClick={() => setConfirmAdminToggle(null)}
							>
								Cancelar
							</Button>
							<Button
								tier="primary"
								variant="action"
								onClick={() => {
									void handleSetAdminRole();
								}}
							>
								Confirmar
							</Button>
						</>
					}
				>
					<Stack direction="vertical" gap={12}>
						<p>
							Tem certeza que deseja{" "}
							<strong>
								{confirmAdminToggle.isAdmin ? "remover" : "conceder"}
							</strong>{" "}
							status de administrador para{" "}
							<strong>{confirmAdminToggle.username}</strong>?
						</p>
					</Stack>
				</ModalScaffold>
			)}

			{resetPasswordUser && (
				<ModalScaffold
					isOpen={!!resetPasswordUser}
					onClose={handleCloseResetModal}
					title={
						generatedTempPassword
							? "Senha Temporária Gerada"
							: "Redefinir Senha"
					}
					size="sm"
					footer={
						generatedTempPassword ? (
							<Button
								tier="primary"
								variant="action"
								onClick={handleCloseResetModal}
							>
								Concluir
							</Button>
						) : (
							<>
								<Button
									tier="secondary"
									variant="neutral"
									onClick={handleCloseResetModal}
									disabled={isResetting}
								>
									Cancelar
								</Button>
								<Button
									tier="primary"
									variant="danger"
									onClick={() => {
										void handleResetPassword();
									}}
									isLoading={isResetting}
									disabled={isResetting}
								>
									Gerar Nova Senha
								</Button>
							</>
						)
					}
				>
					<Stack direction="vertical" gap={16}>
						{!generatedTempPassword ? (
							<>
								<p>
									Deseja redefinir a senha do usuário{" "}
									<strong>{resetPasswordUser.username}</strong>?
								</p>
								<p
									style={{
										fontSize: "0.88rem",
										color: "var(--color-text-muted)",
									}}
								>
									Uma nova senha temporária será gerada e o usuário será marcado
									como inativo até que defina sua nova senha definitiva na tela
									de ativação.
								</p>
							</>
						) : (
							<>
								<Banner variant="success">
									<div>
										Senha redefinida para{" "}
										<strong>{resetPasswordUser.username}</strong>!
									</div>
								</Banner>

								<div>
									<div
										style={{
											fontSize: "0.85rem",
											marginBottom: "6px",
											color: "var(--color-text-secondary)",
										}}
									>
										Senha Temporária:
									</div>
									<Stack alignY="center" gap={10}>
										<code
											style={{
												flexGrow: 1,
												background: "var(--color-bg-control)",
												color: "var(--color-text-primary)",
												border: "1px solid var(--color-border-subtle)",
												padding: "8px 12px",
												borderRadius: "6px",
												fontSize: "1.05rem",
												fontFamily: "monospace",
												letterSpacing: "1px",
												userSelect: "all",
											}}
										>
											{generatedTempPassword}
										</code>
										<Button
											size="sm"
											tier="secondary"
											variant="neutral"
											onClick={handleCopyPassword}
										>
											{copied ? "Copiado!" : "Copiar"}
										</Button>
									</Stack>
								</div>

								<p
									style={{
										fontSize: "0.85rem",
										color: "var(--color-text-muted)",
										marginTop: "4px",
									}}
								>
									Envie esta senha temporária ao usuário. Ele deverá acessar a
									tela de primeiro acesso da plataforma (/primeiro-acesso) para
									cadastrar sua nova senha pessoal.
								</p>
							</>
						)}
					</Stack>
				</ModalScaffold>
			)}
		</div>
	);
}

export default UserManagementDashboard;
