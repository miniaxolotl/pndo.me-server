/**
 * jwt.identigy.ts
 * Extract the user data from a jwt.
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
		profile_id: null,
		email: null,
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

				const profile_data = await profile_repository
				.findOne({ username: payload.username! });

				if(profile_data) {
					auth_payload.username = profile_data.username;
					auth_payload.display_name = profile_data.display_name;
					auth_payload.profile_id = profile_data.profile_id;
					auth_payload.email = profile_data.email;
					auth_payload.flags = {
						admin: profile_data.admin,
						moderator: profile_data.moderator,
						banned: profile_data.banned,
					};

					ctx.auth = auth_payload;
				} else {
					ctx.auth = auth_payload;
				}
			} else {
				ctx.auth = auth_payload;
			}
		} catch(err) {
			ctx.auth = auth_payload;
		}
	} else {
		ctx.auth = auth_payload;
	}

	await next();
};
