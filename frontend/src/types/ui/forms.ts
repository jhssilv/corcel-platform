export interface LoginFormValues {
	username: string;
	password: string;
}

export interface RegisterUserFormValues {
	username: string;
}

export interface ActivateUserFormValues {
	username: string;
	password: string;
}

export interface CorrectionFormValues {
	newToken: string;
	suggestForAll: boolean;
}
