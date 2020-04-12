import { Types } from "mongoose";
export interface ResgisterRequest {
	username: string,
	password: string,
};

export interface UploadRequest {
	username: string,
	password: string,
	protected?: boolean;
	hidden?: boolean | string;
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

export interface Metadata {
	ref?: Types.ObjectId;
	uuid?: string;
	hash?: string;
	filename:  string;
	type: string;
	owner?: string | null;
	protected?: boolean;
	hidden: boolean;
	downloads?: number;
	views?: number;
	bytes: number;
	uploaded?: Date;
	expires?: Date | null;
}

export interface MetadataSanitised {
	hash?: string;
	filename:  string;
	type: string;
	owner?: string | null;
	downloads?: number;
	protected?: boolean;
	hidden: boolean;
	views?: number;
	bytes: number;
	uploaded?: Date;
	expires?: Date | null;
}

export interface MetaFile {
	count: number,
	size: number,
}

/** Timestamped JWT payload */
export interface TimedPayload {
	payload: any;
	validUntil: number;
	createdOn: number;
};