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
import { unauthorizedAccess, noContentToProcess, resourceNotFound } from "../util/errors";
import { UserPayload, UserData, Metadata } from "types";
import { ParameterizedContext } from "koa";

import mongoose from "mongoose";

const secret = config.crypt.secret;

/**
 * Validates authorization token and user.
 */
export default async (ctx: ParameterizedContext, next: any): Promise<void> => {
	const token = (ctx.headers.authorization as string).split(' ')[1];
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;
	
	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ hash: ctx.params.id });

	if(file_data == null) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound;
	} else {
		if(token == null) {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess;
		} else {
			try{ 
				const authorization = TimedJWT.verify(token, secret);

				if(authorization) {
					const payload: UserData = authorization.payload;
		
					let user: UserData = await models.User
					.findOne({ username: payload.username });

					ctx.auth.user = payload.username;
					ctx.auth.profile = payload.profile;
					ctx.auth.flags = payload.flags;

					if(file_data.protected == true) {
						if(file_data.owner == user.username) {
							await next();
						} else {
							ctx.status = unauthorizedAccess.status;
							ctx.body = unauthorizedAccess;
						}
					} else {
						await next();
					}
				} else {
					ctx.status = unauthorizedAccess.status;
					ctx.body = unauthorizedAccess;
				}
			} catch(err) {
				ctx.status = unauthorizedAccess.status;
				ctx.body = unauthorizedAccess;
			}
		}
	}
};

