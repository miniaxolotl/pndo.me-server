/**
 * bcrypt.ts
 * Wrapper for performing bcrypt functions anycronously.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import bcrypt from "bcrypt";
import config from "../../res/config.json";

const salt_rounds = config.crypt.salt_rounds;

/**
 * Salt the hash
 * @param rounds Round's salt must undergo .
 */
const gen_salt = (rounds: number): Promise<string> => new Promise((resolve, reject) => {
	bcrypt.genSalt(rounds, (err, salt) => {
		if(err)
		{
			reject(err);
		}
		else
		{
			resolve(salt);
		}
	});
});

/**
 * Hash a string using bcrypt.
 * @param data String to be hashed.
 */
const gen_hash = (data: string): Promise<string> =>
	new Promise<string>((resolve, reject) => {
	bcrypt.hash(data, salt_rounds, (err, hash) => {
		if(err)
		{
			reject(err);
		}
		else
		{
			resolve(hash);
		}
	});
});

/**
 * Compare a string to a hashed value.
 * @param data Data to match against hash.
 * @param hash Hash to compare data with.
 */
const compare = (data: string, hash: string): Promise<boolean> =>
	new Promise((resolve, reject) => {
	bcrypt.compare(data, hash, (err, res) =>{
		if(err)
		{
			reject(err);
		}
		else
		{
			resolve(res);
		}
	});
});

export default {
	gen_salt,
	gen_hash,
	compare,
};
