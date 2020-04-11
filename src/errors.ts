export interface StatusMessage {
	status: number;
	message: string;
};

export const invalidCredentials: StatusMessage = {
	status: 401,
	message: "Invalid credentials",
};