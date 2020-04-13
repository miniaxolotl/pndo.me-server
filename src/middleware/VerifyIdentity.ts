/**
 * JWTAuthenticate.ts
 * Middleware for authenticating timed JWT's
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-15
 */

import config from "../../res/config.json";
import { TimedJWT } from "../util";
import { unauthorizedAccess } from "../util/errors";
import { UserPayload, UserData } from "types";

import mongoose from "mongoose";

const secret = config.crypt.secret;

/**
 * Validates authorization token and user.
 */
export default async (ctx: any, next: any): Promise<void> => {
	const authentication = (ctx.headers.authorization);

	if(authentication) {
		const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;
		const token = authentication.split(' ')[1];

		try {
			const authorization = TimedJWT.verify(token, secret);

			if(authorization) {
				const payload: UserData = authorization.payload;

				let user: UserData = await models.User
				.findOne({ username: payload.username });

				if(user == null) {
					// do nothing
				} else {
					ctx.auth.user = payload.username;
					ctx.auth.profile = payload.profile;
					ctx.auth.flags = payload.flags;
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
