/**
 * file.access.ts
 * Middleware for validaingh file access.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */


import { Connection } from "typeorm";

import { ProfileModel, MetadataModel } from "../model/mysql";

import { unauthorizedAccess, resourceNotFound, serverError } from "../util/status";
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
		flags: {
			admin: false,
			moderator: false,
			banned: false,
		},
	};

	const db: Connection = ctx.mysql;

	const profile_repo = db.manager.getRepository(ProfileModel);
	const file_repo = db.manager.getRepository(MetadataModel);

	const file_data = await file_repo
	.findOne({ file_id: ctx.params.id });

	if(authentication && file_data) {
		const token = authentication.split(' ')[1];

		try {
			const authorization = TimedJWT.verify(token, secret);

			if(authorization) {
				const payload: ProfileData = authorization.payload;

				const profile_data = await profile_repo
				.findOne({ profile_id: payload.profile_id! });

				if(profile_data) {
					auth_payload.username = profile_data.username;
					auth_payload.display_name = profile_data.display_name;
					auth_payload.profile_id = profile_data.profile_id;
					auth_payload.flags = {
						admin: profile_data.admin,
						moderator: profile_data.moderator,
						banned: profile_data.banned,
					};

					ctx.auth = auth_payload;

					if(file_data.protected) {
						if(file_data.profile_id == profile_data.profile_id) {
							await next();
						} else {
							ctx.status = unauthorizedAccess.status;
							ctx.body = unauthorizedAccess.message;
						}
					} else {
						await next();
					}
				} else {
					if(file_data.protected) {
						ctx.status = serverError.status;
						ctx.body = serverError.message;
					} else {
						await next();
					}
				}
			} else {
				ctx.status = serverError.status;
				ctx.body = serverError.message;
			}
		} catch(err) {
			if(file_data.protected) {
				ctx.status = serverError.status;
				ctx.body = serverError.message;
			} else {
				await next();
			}
		}
	} else if (file_data) {
		if(file_data.protected) {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess.message;
		} else {
			await next();
		}
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	}
};
