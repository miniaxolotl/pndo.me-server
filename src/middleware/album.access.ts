/**
 * album.access.ts
 * Middleware to verify elevated to a album.
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
	
	const access = await db.query(`
		SELECT * FROM
			(SELECT album.album_id, album_user.user_id
				FROM album_user
				LEFT JOIN album
				ON album.album_id = album_user.album_id
				WHERE album.album_id = '${ctx.params.id}'
				AND (
					album.protected = false
					OR album_user.user_id = NULL
					OR album_user.user_id = '${ctx.state.user_id}')
			) AS t1
	`);

	if(access.length) {
		if(access.length || ctx.state.admin) {
			await next();
		} else {
			ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
			ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
			return;
		}
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	}
};