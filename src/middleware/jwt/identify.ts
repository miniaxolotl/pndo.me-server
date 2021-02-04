/**
 * jwt.identigy.ts
 * Extract the user data from a jwt.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { Connection } from "typeorm";

import { UserModel } from "../../model/mysql";

import { unauthorizedAccess } from "../../util/status";
import { TimedJWT } from "../../util";

import { UserData } from "types";
import config from "../../../res/config.json";

const secret = config.crypt.secret;

/**
 * Validates the specified authentication token.
 */
export default async (ctx: any, next: any): Promise<void> => {
	const authorization_key = (ctx.headers.authorization);
	const state: UserData = {
		username: null,
		email: null,
		user_id: null,
	};

	if(authorization_key) {
		const db: Connection = ctx.mysql;
		const user_collection = db.manager.getRepository(UserModel);
		const token = authorization_key.split(' ')[1];
		
		try {
			const authorization = TimedJWT.verify(token, secret);

			if(authorization) {
				const payload: UserData = authorization.payload;
				const user = await user_collection
				.findOne({ username: payload.username! });

				if(user && !user.banned) {
					const state: UserData = {
						username: user.username,
						email: user.email,
						user_id: user.user_id,
					};

					ctx.state = state;
				} else {
					ctx.state = state;
				}
			} else {
				ctx.state = state;
			}
		} catch(err) {
			ctx.state = state;
		}
	} else {
		ctx.state = state;
	}

	await next();
};
