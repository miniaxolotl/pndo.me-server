/**
 * jwt.authenticate.ts
 * Verify the user data in a jwt is valid. 
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
						admin: user.admin,
						banned: user.banned
					};

					ctx.state = state;

					await next();
				} else {
					ctx.status = unauthorizedAccess.status;
					ctx.body = unauthorizedAccess.message;
				}
			} else {
				ctx.status = unauthorizedAccess.status;
				ctx.body = unauthorizedAccess.message;
			}
		} catch(err) {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess.message;
		}
	} else {
		ctx.status = unauthorizedAccess.status;
		ctx.body = unauthorizedAccess.message;
	}
};
