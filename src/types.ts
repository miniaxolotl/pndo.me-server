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

export interface ProfileData {
	profile_id?: string;
	username: string | null;
	password?: string;
	display_name: string | null;
	admin?: boolean;
	moderator?: boolean;
	banned?: boolean;
	flags?: ProfileFlags;
}

export type ProfileFlags = {
	admin: boolean;
	moderator: boolean;
	banned: boolean;
};

export interface TimedPayload {
	payload: any;
	validUntil: number;
	createdOn: number;
}

export interface AuthResponce {
	payload: ProfileData;
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
	owner?: string | null;
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