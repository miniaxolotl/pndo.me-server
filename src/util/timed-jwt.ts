/**
 * timed-jwt.ts
 * Wrapper for working with timed jwt's
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import jwt from 'jsonwebtoken';

import config from "../../res/config.json";
import { timed_payload_t } from '../types.js';

/**
 * Sign an object (string) with a specififed secret.
 * @param payload Object to be signed.
 * @param secret Secret to use when signing.
 */
const sign = (payload: {}, secret: string,
		options?: { expire_length?: number }): string => {
	const current_time = new Date().getTime();
	const default_expire_length =  (10*24*60*60*1000) + current_time;
	let expire_date: number = default_expire_length;

	if(options) {
		expire_date = options.expire_length ?
			options.expire_length : default_expire_length;
	}

	const timed_payload: timed_payload_t = {
		payload,
		validUntil: expire_date,
		createdOn: current_time
	};

	const token = jwt.sign(timed_payload, config.crypt.secret);

	return token;
};

/**
 * Decrypt a signed message.
 * @param token Token to be decrypted.
 * @param secret Secret to use when decrypting.
 * @returns The decrypted message.
 */
const open = (token: string, secret: string): timed_payload_t => {
	const token_data: timed_payload_t = Object(jwt.verify(token, secret));

	return token_data;
};

/**
 * Decrypt a signed message and check if it's expired.
 * @param token Token to be decrypted.
 * @param secret Secret to use when decrypting.
 * @returns The decrypted message, returns null if it's expired.
 */
const verify = (token: string, secret: string): timed_payload_t | null => {
	const current_time = new Date().getTime();
	const token_data: timed_payload_t = Object(jwt.verify(token, secret));

	if(current_time > token_data.validUntil) {
		return null;
	}

	return token_data;
};

export default {
	sign,
	open,
	verify
};
