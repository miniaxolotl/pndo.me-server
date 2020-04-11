/** Authentication success responce */
export interface auth_responce_t {
	user: {
		profile: string;
		email: string;
		name: string;
	};
	authorization: string;
};

/** Timestamped JWT payload */
export interface timed_payload_t {
	payload: {};
	validUntil: number;
	createdOn: number;
};