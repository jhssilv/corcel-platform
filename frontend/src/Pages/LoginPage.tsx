import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../Components/Layout/TopBar";
import { authenticateUser } from "../Api";
import { useAuth } from "../Context/Auth/UseAuth";
import { useSnackbar } from "../Context/Generic";
import { Card, CardTitle, Stack } from "../Components/Generic";
import "../styles/login_page.css";

interface LoginErrorShape {
	error?: string;
}

function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const { login } = useAuth();
	const { addSnackbar } = useSnackbar();

	const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
		setUsername(event.target.value);
	};

	const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
		setPassword(event.target.value);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		try {
			const loginData = await authenticateUser(username, password);
			login(username, loginData.isAdmin);
			navigate("/main");
		} catch (err) {
			console.error(err);
			addSnackbar({
				text: "Falha no login. Verifique suas credenciais.",
				type: "error",
				duration: 4000,
			});
		}
	};

	return (
		<Stack direction="vertical" alignX="center" style={{ width: "100%" }}>
			<TopBar showSidePanel={false} />
			<Card style={{ width: "100%", maxWidth: "400px", marginTop: "60px" }}>
				<CardTitle style={{ justifyContent: "center" }}>
					Autenticação de usuário
				</CardTitle>
				<div style={{ padding: "20px" }}>
					<form onSubmit={handleSubmit}>
						<Stack direction="vertical" gap={16}>
							<input
								name="username_input"
								type="text"
								value={username}
								onChange={handleUsernameChange}
								required
								placeholder="Usuário"
							/>
							<input
								name="password_input"
								type="password"
								value={password}
								onChange={handlePasswordChange}
								required
								placeholder="Senha"
							/>
							<button type="submit" style={{ color: "white" }}>
								Entrar
							</button>
							<div style={{ textAlign: "center" }}>
								<Link
									to="/first-access"
									style={{
										color: "#666",
										textDecoration: "none",
										fontSize: "0.9rem",
									}}
								>
									Primeiro Acesso? Ative sua conta
								</Link>
							</div>
						</Stack>
					</form>
				</div>
			</Card>
		</Stack>
	);
}

export default LoginPage;
