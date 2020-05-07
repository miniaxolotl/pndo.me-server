/**
 * jwt.authenticate.ts
 * Middleware for authenticating timed JWT's
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

	const auth_payload: ProfileData = {
		username: null,
		display_name: null,
		flags: {
			admin: false,
			moderator: false,
			banned: false,
		},
	};

	if(authentication) {
		const token = authentication.split(' ')[1];
		const db: Connection = ctx.mysql;

		const profile_repository = db.manager.getRepository(ProfileModel);

		try {
			const authorization = TimedJWT.verify(token, secret);

			if(authorization) {
				const payload: ProfileData = authorization.payload;

				const profile_res = await profile_repository
				.findOne({ username: payload.username! });

				if(profile_res) {
					auth_payload.username = profile_res.username;
					auth_payload.display_name = profile_res.display_name;
					auth_payload.flags = {
						admin: profile_res.admin,
						moderator: profile_res.moderator,
						banned: profile_res.banned,
					};

					ctx.auth = auth_payload;
				} else {
					// do nothing
				}
			} else {
				// do nothing
			}
		} catch(err) {
			// do nothing
		}
	} else {
		// do nothing
	}

	await next();
};
