import { Types } from "mongoose";


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

export interface GridFSFile {
	_id: string;
	filename: string;
	contentType: string;
	length: number;
	chunkSize: number;
	uploadDate: Date;
	aliases?: string | undefined;
	metatdata?: any | undefined;
	md5: string;
};

export interface Metadata {
	ref: Types.ObjectId;
	uuid: string;
	filename:  string;
	type: string;
	owner?: string;
	protected?: boolean;
	downloads?: number;
	views?: number;
	bytes: number;
	uploaded: Date;
	expires?: Date | null;
}

/** Timestamped JWT payload */
export interface TimedPayload {
	payload: any;
	validUntil: number;
	createdOn: number;
};