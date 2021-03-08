/**
 * user.access.ts
 * Middleware to verify elevated to a user.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";

import { HttpStatus } from "../lib";
import { UserState } from "../lib/types";

import { AlbumUserModel, SessionModel, UserModel } from "../model/mysql";
import { Connection } from "typeorm";

import validator from "validator";

export default async (ctx: ParameterizedContext, next: any) => {
	const db: Connection = ctx.mysql;
	
	if(!(ctx.state.user_id as string).localeCompare(validator.escape(ctx.params.id)) || ctx.state.admin) {
		await next();
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
		ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
		return;
	}

}