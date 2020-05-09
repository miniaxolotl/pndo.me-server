/**
 * jwt.authenticate.ts
 * Verify the user data in a jwt is valid. 
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */


import { Connection } from "typeorm";

import { ProfileModel } from "../model/mysql";

import { unauthorizedAccess } from "../util/status";
import { TimedJWT } from "../util";

import { ProfileData } from "types";
import config from "../../res/config.json";

const secret = config.crypt.secret;

/**
 * Validates the specified authentication token.
 */
export default async (ctx: any, next: any): Promise<void> => {
	const authentication = (ctx.headers.authorization);

	if(authentication) {
		const token = authentication.split(' ')[1];
		const db: Connection = ctx.mysql;

		const profile_repository = db.manager.getRepository(ProfileModel);

		try {
			const authorization = TimedJWT.verify(token, secret);

			if(authorization) {
				const auth_payload: ProfileData = authorization.payload;

				const profile_data = await profile_repository
				.findOne({ username: auth_payload.username! });

				if(profile_data && !profile_data.banned) {
					const user_auth: ProfileData = {
						username: profile_data.username,
						display_name: profile_data.display_name,
						profile_id: profile_data.profile_id,
						email: profile_data.email,
						flags: {
							admin: profile_data.admin,
							moderator: profile_data.moderator,
							banned: profile_data.banned,
						},
					};

					ctx.auth = user_auth;

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
