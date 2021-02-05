/**
 * types.ts
 * Collection of global types.
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
	password?: string;
	email: string | null;
	admin: boolean | null;
	moderator?: boolean;
	banned: boolean | null;
}

export interface TimedPayload {
	payload: any;
	validUntil: number;
	createdOn: number;
}

export interface AuthenticationResponce {
	payload: UserData;
	authorization: string;
}

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
	uploaded?: Date;
	expires?: Date | null;
}

/************************************************
 * ANCHOR other
 ************************************************/

export interface StatusMessage {
	status: number;
	message: string;
}