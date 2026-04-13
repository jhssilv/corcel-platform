import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../Components/Layout/TopBar";
import { getUsersData, toggleUserActive, toggleUserAdmin } from "../Api";
import { useAuth } from "../Context/Auth/UseAuth";
import { useSnackbar } from "../Context/Generic";
import {
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
	const [confirmAdminToggle, setConfirmAdminToggle] = useState<string | null>(
		null,
	);

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
						onClick={() => setConfirmAdminToggle(user.username)}
						disabled={user.username === currentUsername}
					>
						{user.isAdmin ? "Remover Admin" : "Tornar Admin"}
					</Button>
					<Button
						size="sm"
						tier="secondary"
						variant={user.isActive ? "danger" : "action"}
						onClick={() => {
							void handleToggleActive(user.username);
						}}
						disabled={user.username === currentUsername}
					>
						{user.isActive ? "Desativar" : "Ativar"}
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

	const handleToggleActive = async (username: string) => {
		if (username === currentUsername) {
			return;
		}

		try {
			await toggleUserActive(username);
			await fetchUsers();
			addSnackbar({
				text: `Status de '${username}' atualizado com sucesso.`,
				type: "success",
			});
		} catch (err) {
			console.error("Failed to toggle active status", err);
			addSnackbar({
				text: "Failed to toggle active status",
				type: "error",
			});
		}
	};

	const handleToggleAdmin = async () => {
		if (!confirmAdminToggle) {
			return;
		}

		try {
			await toggleUserAdmin(confirmAdminToggle);
			const userRef = confirmAdminToggle;
			setConfirmAdminToggle(null);
			await fetchUsers();
			addSnackbar({
				text: `Privilégios de '${userRef}' atualizados com sucesso.`,
				type: "success",
			});
		} catch (err) {
			console.error("Failed to toggle admin status", err);
			addSnackbar({
				text: "Failed to toggle admin status",
				type: "error",
			});
			setConfirmAdminToggle(null);
		}
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
									void handleToggleAdmin();
								}}
							>
								Confirmar
							</Button>
						</>
					}
				>
					<Stack direction="vertical" gap={12}>
						<p>
							Tem certeza que deseja alterar o status de administrador para{" "}
							<strong>{confirmAdminToggle}</strong>?
						</p>
					</Stack>
				</ModalScaffold>
			)}
		</div>
	);
}

export default UserManagementDashboard;
