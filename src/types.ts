

export interface ResgisterRequest {
	username: string,
	password: string,
};

/** Authentication success responce */
export interface UserPayload {
	profile: string;
	username: string;
};

/** Authentication success responce */
export interface AuthenticationResponce {
	user: UserPayload;
	authorization: string;
};

export interface UserData {
	profile: string;
	username: string;
	password: string;
};

/** Timestamped JWT payload */
export interface TimedPayload {
	payload: {};
	validUntil: number;
	createdOn: number;
};