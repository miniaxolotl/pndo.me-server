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
import { FileUpdateSchema, LoginSchema, PublicSearchSchema, RegisterSchema, UploadSchema, URLUploadSchema, UserUpdateSchema } from "../../schema";

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

router.get("/:id/album", UserAccess, async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = PublicSearchSchema.validate(body, {
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
			(SELECT
			ALBUMS.album_id, metadata.file_id, ALBUMS.albumname, metadata.filename,
			metadata.type, metadata.bytes, metadata.d_count, metadata.v_count, metadata.create_date
			FROM
			(SELECT
			album_file.file_id, album_file.album_id, album.title as albumname
			FROM album_file
			INNER JOIN album
			ON album_file.album_id = album.album_id
			WHERE
			((album.deleted=false AND album.hidden=false AND album.protected=false)
			AND (album.title LIKE "%${value.albumname}%"))) AS ALBUMS
			INNER JOIN metadata
			ON ALBUMS.file_id = metadata.file_id
			WHERE metadata.deleted = false) AS FILE_LIST
			WHERE(FILE_LIST.filename LIKE "%${value.filename}%" OR FILE_LIST.type LIKE "%${value.type}%")
			ORDER BY ${value.sort} ${value.direction}`
		);

		const n_page = Math.ceil(n_page_query[0].count / value.limit);
		const c_page = n_page > 0 ? value.page > n_page ? n_page : value.page : 1;
		
		const s_query = await db.query(`
			SELECT
			FILE_LIST.*
			FROM
			(SELECT
			ALBUMS.album_id, metadata.file_id, ALBUMS.albumname, metadata.filename,
			metadata.type, metadata.bytes, metadata.d_count, metadata.v_count, metadata.create_date
			FROM
			(SELECT
			album_file.file_id, album_file.album_id, album.title as albumname
			FROM album_file
			INNER JOIN album
			ON album_file.album_id = album.album_id
			WHERE
			((album.deleted=false AND album.hidden=false AND album.protected=false)
			AND (album.title LIKE "%${value.albumname}%"))) AS ALBUMS
			INNER JOIN metadata
			ON ALBUMS.file_id = metadata.file_id
			WHERE metadata.deleted = false) AS FILE_LIST
			WHERE (FILE_LIST.filename LIKE "%${value.filename}%" OR FILE_LIST.type LIKE "%${value.type}%")
			LIMIT ${value.limit} OFFSET ${value.skip  * (c_page - 1)}`
		);
		
		
		return;
	}
});

router.get("/:id/file", async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = PublicSearchSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		console.log("hello");
		
		
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
