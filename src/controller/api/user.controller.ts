/**
 * user.controller.ts
 * Controller for handling users.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../../lib";
import { SessionResponce, UploadRequest } from "../../lib/types";
import { AlbumAccess, UserAccess } from "../../middleware";
import { FileUpdateSchema, LoginSchema, PrivateAlbumSearchSchema, PrivateFileSearchSchema, PublicSearchSchema, RegisterSchema, UploadSchema, URLUploadSchema, UserUpdateSchema } from "../../schema";

import { AlbumMetadataModel, AlbumModel, AlbumUserModel, MetadataModel, SessionModel, UserModel } from "../../model/mysql";
import { Connection } from "typeorm";

import fetch from "node-fetch";
import crypto from "crypto";
import stream from "stream";
import path, { join } from "path";
import zlib from "zlib";
import { spawn } from "child_process";
import fs from "fs";

import FileType from 'file-type';
import { uid } from 'uid/secure';
import { v4 as uuid } from 'uuid';

import config from "../../../res/config.json";
import validator from "validator";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.get("/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const user = await user_collection
	.findOne({
		where: {
			user_id: validator.escape(ctx.params.id),
		},
		select: [ "user_id", "username", "banned", "admin" ]
	});

	if(user) {
		ctx.body = user;
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
	}
});

router.post("/:id/album", UserAccess, async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = PrivateAlbumSearchSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const n_page_query = await db.query(`
			SELECT COUNT(*) as count
			FROM
			(SELECT DISTINCT
				t1.album_id, t1.title as albumname, SUM(metadata.bytes) as bytes,
				t1.d_count, t1.v_count, t1.protected, t1.hidden
			FROM
			(SELECT DISTINCT 
				album_user.user_id, album_file.file_id, album.*
				FROM album
			RIGHT JOIN album_file
			ON album.album_id = album_file.album_id
			RIGHT JOIN album_user
			ON album.album_id = album_user.album_id
			WHERE album.deleted = false AND album_user.user_id = "${ctx.state.user_id}") as t1
			LEFT JOIN metadata
			ON t1.file_id = metadata.file_id
			GROUP BY t1.album_id) as t2
		`);

		const n_page = Math.ceil(n_page_query[0].count / value.limit);
		const c_page = n_page > 0 ? value.page > n_page ? n_page : value.page : 1;
				
		const s_query = await db.query(`
			SELECT t2.* FROM
			(SELECT DISTINCT
				t1.album_id, t1.title as albumname, SUM(metadata.bytes) as bytes,
				t1.d_count, t1.v_count, t1.protected, t1.hidden
			FROM
			(SELECT DISTINCT 
				album_user.user_id, album_file.file_id, album.*
				FROM album
			RIGHT JOIN album_file
			ON album.album_id = album_file.album_id
			RIGHT JOIN album_user
			ON album.album_id = album_user.album_id
			WHERE album.deleted = false AND album_user.user_id = "${ctx.state.user_id}") as t1
			LEFT JOIN metadata
			ON t1.file_id = metadata.file_id
			WHERE t1.title LIKE "%${value.albumname}%"
			GROUP BY t1.album_id) AS t2
			ORDER BY ${value.sort} ${value.direction}
			LIMIT ${value.limit} OFFSET ${value.skip  * (c_page - 1)}
		`);
		
		ctx.body = {
			n_page,
			c_page,
			page_data: s_query,
		};
		
		return;
	}
});

router.post("/:id/file", UserAccess, async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = PrivateFileSearchSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const n_page_query = await db.query(`
			SELECT COUNT(*) as count
			FROM
			(SELECT t2.album_id, t2.file_id, t2.filename, t2.type, t2.bytes, t2.d_count, t2.v_count, t2.create_date
			FROM
				(SELECT album_user.user_id, t1.*
				FROM
					(SELECT album_file.album_id, metadata.*
					FROM metadata
					LEFT JOIN album_file
					ON metadata.file_id = album_file.file_id
					WHERE metadata.deleted = false AND metadata.filename LIKE "%${value.filename}%") AS t1
				LEFT JOIN album_user
				ON t1.album_id = album_user.album_id) AS t2
			WHERE t2.user_id = "${validator.escape(ctx.params.id)}") as t3
		`);

		const n_page = Math.ceil(n_page_query[0].count / value.limit);
		const c_page = n_page > 0 ? value.page > n_page ? n_page : value.page : 1;

		const s_query = await db.query(`
			SELECT t2.album_id, t2.file_id, t2.filename, t2.type, t2.bytes, t2.d_count, t2.v_count, t2.create_date
			FROM
				(SELECT album_user.user_id, t1.*
				FROM
					(SELECT album_file.album_id, metadata.*
					FROM metadata
					LEFT JOIN album_file
					ON metadata.file_id = album_file.file_id
					WHERE metadata.deleted = false AND metadata.filename LIKE "%${value.filename}%") AS t1
				LEFT JOIN album_user
				ON t1.album_id = album_user.album_id) AS t2
			WHERE t2.user_id = "${validator.escape(ctx.params.id)}"
			ORDER BY ${value.sort} ${value.direction}
			LIMIT ${value.limit} OFFSET ${value.skip  * (c_page - 1)}
		`);

		ctx.body = {
			n_page,
			c_page,
			page_data: s_query,
		};

		return;
	}
});

router.get("/username/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const user = await user_collection
	.findOne({
		where: {
			username: validator.escape(ctx.params.id),
		},
		select: [ "user_id", "username", "banned", "admin" ]
	});

	if(user) {
		ctx.body = user;
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	}
});

router.patch("/:id", UserAccess, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = UserUpdateSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const user = await db.getRepository(UserModel).findOne({ user_id: validator.escape(ctx.params.id) });
		if(!user) {
			ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
			ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			return;
		} else {
			const data = await new Promise<UserModel | null>((resolve, reject) => {
				db.transaction(async (transaction) => {
					const user_u = {
						...new UserModel(),
						...value,
						user_id: user.user_id
					};
					await transaction.getRepository(UserModel).save({
						...user,
						...user_u
					}).then((res) => {
						resolve(res);
					}).catch(() => {
						resolve(null);
					});
				});
			});

			if(data) {
				data.id = undefined!;
				data.password = undefined!;
				ctx.body = data;
				return;
			} else {
				ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
				ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
				return;
			}
		}
	}
});

router.delete("/:id", UserAccess, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	if(validator.escape(ctx.params.id)) {
		await db.manager.getRepository(UserModel).delete({ user_id: validator.escape(ctx.params.id) })
		.catch(() => {
			ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
			ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
			return;
		}).then(() => {
			ctx.status = HttpStatus.SUCCESS.OK.status;
			ctx.body = HttpStatus.SUCCESS.OK.message;
			return;
		});
	} else {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
		return;
	}
});

const Controller: Router = router;

export default Controller;
