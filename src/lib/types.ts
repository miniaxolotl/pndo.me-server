/**
 * types.ts
 * Collection of types used in application.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

/************************************************
 * ANCHOR user authentication
 ************************************************/

export interface UserData {
	user_id: string | null;
	username: string | null;
	email: string | null;
	admin: boolean | null;
	banned: boolean | null;
};

export interface UserState {
	session_id: string | null;
	user_id: string | null;
	username: string | null;
	email: string | null;
	admin: boolean | null;
	banned: boolean | null;
};

export interface TimedPayload {
	payload: any;
	validUntil: number;
	createdOn: number;
};

export interface ApiResponce {
	payload: UserData;
	authorization: string;
};

export interface SessionResponce {
	payload: UserData;
	session_id: string;
};

/************************************************
 * ANCHOR file
 ************************************************/

export interface UploadRequest {
	upload_file: string | null;
	protected: boolean;
	hidden: boolean;
};

export interface Metadata {
	file_id?: string;
	sha256: string;
	md5: string;
	filename:  string;
	type: string;
	user_id?: string | null;
	deleted?: boolean;
	protected?: boolean;
	hidden: boolean;
	downloads?: number;
	views?: number;
	bytes: number;
	create_date?: Date;
	expires?: Date | null;
}

/************************************************
 * ANCHOR other
 ************************************************/

export interface StatusMessage {
	status: number;
	message: string;
}