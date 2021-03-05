/**
 * auth.controller.ts
 * Controller for handling user authentication.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";

import { HttpStatus } from "../lib";
import { UserState } from "../lib/types";

import { SessionModel } from "../model/mysql";
import { Connection } from "typeorm";

export default async (ctx: ParameterizedContext, next: any) => {

	const session_id = ctx.cookies.get("session_id");
	if(session_id) {
		const db: Connection = ctx.mysql;

		const session_collection = db.manager.getRepository(SessionModel);

		const session = await session_collection.findOne({ session_id });
		if(session && session.user) {
			const state: UserState = {
				session_id: session.session_id,
				user_id: session.user.user_id,
				username: session.user.username,
				email: session.user.email,
				admin: session.user.admin,
				banned: session.user.banned,
			};
			ctx.state = state;
			await next()
		} else {
			ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
			ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
			return;
		}
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
		return;
	}
}