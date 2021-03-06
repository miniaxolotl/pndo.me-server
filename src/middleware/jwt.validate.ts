/**
 * auth.controller.ts
 * Controller for handling user authentication.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";

import { HttpStatus, TimedJWT } from "../lib";
import { UserState } from "../lib/types";

import { SessionModel } from "../model/mysql";
import { Connection } from "typeorm";

import config from "../../res/config.json";

const secret = config.crypt.key;

export default async (ctx: ParameterizedContext, next: any) => {

	const authorization_key = (ctx.headers.authorization);
	if(authorization_key) {
		const db: Connection = ctx.mysql;

		const session_collection = db.manager.getRepository(SessionModel);
		
		try {
			const token = authorization_key.split(' ')[1];
			const authorization = TimedJWT.verify(token, secret);
			if(authorization) {
				const session = await session_collection.findOne({
					session_id: authorization.payload 
				}, {
					relations: [ "user" ]
				});
				if(session && session.user && (session.expire_date > new Date())) {
					const state: UserState = {
						session_id: session.session_id,
						user_id: session.user.user_id,
						username: session.user.username,
						email: session.user.email,
						admin: session.user.admin,
						banned: session.user.banned,
					};
					ctx.state = state;
					await next();
				}
			} else {
				ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
				ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
				return;
			}
		} catch {
			ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
			ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
			return;
		}
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
		ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
		return;
	}
}