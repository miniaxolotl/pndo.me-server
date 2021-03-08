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
		SELECT album.album_id, t2.user_id, album.protected, album.hidden FROM
		(SELECT album_user.album_id, album_user.user_id FROM
		(SELECT DISTINCT album_file.album_id FROM metadata
		FULL JOIN album_file) AS t1
		RIGHT JOIN album_user
		ON t1.album_id = album_user.album_id
		WHERE 
			t1.album_id = "${validator.escape(ctx.params.id)}") AS t2
		LEFT JOIN album
		ON t2.album_id = album.album_id
		WHERE 
			album.deleted = false 
			AND 
			(t2.user_id = "${ctx.state.user_id}" OR 
			t2.user_id = NULL OR
			album.protected = false)
		GROUP BY t2.album_id, t2.user_id
	`);
	const album = await db.query(`
		SELECT * FROM album
		WHERE album.album_id = "${validator.escape(ctx.params.id)}"
	`);
			
	if(album.length) {
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