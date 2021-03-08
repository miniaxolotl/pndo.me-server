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

import validator from "validator";

export default async (ctx: ParameterizedContext, next: any) => {

	const db: Connection = ctx.mysql;
	
	const access = await db.query(`
		SELECT * FROM
		(SELECT DISTINCT t1.album_id, t1.file_id, album_user.user_id FROM
		(SELECT album_file.album_id, metadata.file_id from metadata
		RIGHT JOIN album_file
		ON metadata.file_id = album_file.file_id
		WHERE
			metadata.file_id = "${validator.escape(ctx.params.id)}" AND
			metadata.deleted = false) AS t1
		RIGHT JOIN album_user
		ON t1.album_id = album_user.album_id) AS t2
		LEFT JOIN album
		ON t2.album_id = album.album_id
		WHERE
			album.deleted = false 
			AND 
			(t2.user_id = "${ctx.state.user_id}" OR 
			t2.user_id = NULL OR
			album.protected = false)
	`);
	const file = await db.query(`
		SELECT * FROM metadata
		WHERE metadata.file_id = "${validator.escape(ctx.params.id)}"
	`);
			
	if(file.length) {
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
}