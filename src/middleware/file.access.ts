/**
 * jwt.authenticate.ts
 * Verify the user data in a jwt is valid. 
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { Connection } from "typeorm";

import { MetadataModel, UserModel } from "../model/mysql";

import { resourceNotFound, unauthorizedAccess } from "../util/status";
import { TimedJWT } from "../util";

import { UserData } from "types";
import config from "../../res/config.json";

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
		admin: null,
		banned: null
	};

	const db: Connection = ctx.mysql;
	const user_collection = db.manager.getRepository(UserModel);
	const file_collection = db.manager.getRepository(MetadataModel);

	const file = await file_collection
	.findOne({ file_id: ctx.params.id });

	if(file && authorization_key) {
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

					if(file.protected) {
						if(file.user_id == state.user_id || state.admin) {
							ctx.state = state;
							await next();
						} else {
							ctx.status = unauthorizedAccess.status;
							ctx.body = unauthorizedAccess.message;
						}
					} else {
						ctx.state = state;
						await next();
					}
				} else {
					ctx.status = unauthorizedAccess.status;
					ctx.body = unauthorizedAccess.message;
				}
			} else {
				ctx.status = unauthorizedAccess.status;
				ctx.body = unauthorizedAccess.message;
			}
		} catch(err) {
			if (file) {
				if(file.protected) {
					ctx.status = unauthorizedAccess.status;
					ctx.body = unauthorizedAccess.message;
				} else {
					ctx.state = state;
					await next();
				}
			} else {
				ctx.status = unauthorizedAccess.status;
				ctx.body = unauthorizedAccess.message;
			}
		}
	} else if (file) {
		if(file.protected) {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess.message;
		} else {
			ctx.state = state;
			await next();
		}
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	}
};
