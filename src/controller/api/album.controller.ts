/**
 * ablum.controller.ts
 * Album management workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 20-02-14
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../../lib";
import { SessionResponce, UploadRequest } from "../../lib/types";
import { AlbumSchema, AlbumUpdateSchema, LoginSchema, RegisterSchema, UploadSchema, URLUploadSchema } from "../../schema";

import { AlbumMetadataModel, AlbumModel, AlbumUserModel, MetadataModel, SessionModel, UserModel } from "../../model/mysql";
import { Connection } from "typeorm";

import fetch from "node-fetch";
import crypto from "crypto";
import path, { join, resolve } from "path";
import zlib from "zlib";
import { spawn } from "child_process";
import fs from "fs";

import FileType from 'file-type';
import { uid } from 'uid/secure';
import { v4 as uuid } from 'uuid';

import config from "../../../res/config.json";

const router: Router = new Router();


/************************************************
 * ANCHOR routes
 ************************************************/

router.post("/", async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const { value, error } = AlbumSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		await db.transaction(async (transaction) => {
			const album = new AlbumModel();
			album.album_id = uid();
			album.protected = value.protected;
			album.hidden = value.hidden;
			album.title = value.title ? value.title : uid(4);
			album.password = value.password ? await Bcrypt.gen_hash(value.password) : null!;
			await transaction.save(album);

			const album_user = new AlbumUserModel();
			album_user.album = album;
			album_user.user = ctx.state.user_id;
			await transaction.save(album_user);

			album.password = undefined!;
			album.deleted = undefined!;
			album.id = undefined!;
			ctx.body = album;
		});
	}
});

router.patch("/:id", async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const { value, error } = AlbumUpdateSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const album = await db.getRepository(AlbumModel).findOne({ album_id: value.album_id });
		if(!album) {
			ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
			ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			return;
		} else {
			const data = await new Promise<AlbumModel | null>((resolve, reject) => {
				db.transaction(async (transaction) => {
					const album_u = new AlbumModel();
					album_u.title = value.title;
					album_u.password = value.password;
					album_u.protected = value.protected;
					album_u.hidden = value.hidden;
					await transaction.getRepository(AlbumModel).save({
						...album,
						...album_u
					}).then((res) => {
						resolve(res);
					}).catch(() => {
						resolve(null);
					});
				});
			});

			if(data) {
				data.id = undefined!;
				data.deleted = undefined!;
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

router.get("/:id", async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const temp_path = path.join(`${config.dir.data}/temp`, ctx.params.id);

	const album_files= await db.query(`
		SELECT * FROM album_file
		JOIN metadata 
		ON album_file.file_id = metadata.file_id AND album_file.album_id = ?
		WHERE metadata.deleted = false`,
		[ ctx.params.id ]
	);
	const album = await db.getRepository(AlbumModel).findOne({ album_id: ctx.params.id })
	if(!album_files.length || !album) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
		const path_list: string[] = [];
		album_files.forEach((e) => {
			if(fs.existsSync(path.join(`${config.dir.data}/data`, `${e.file_id}`))) {
				const filename = e.filename.split(".").length > 0 
				path_list.push(path.join(`${config.dir.data}/temp`, `${e.filename}`));
				fs.symlink(
					path.join(`${config.dir.data}/data`, `${e.file_id}`),
					path.join(`${config.dir.data}/temp`, `${e.filename}`),
					() => { }
				)
			}
		});

		if(path_list.length) {
			var zip = spawn('zip', [ '-o', `${temp_path}`, '-j', ...path_list ]);
			const code = await new Promise((resolve, reject) => {
				zip.on('exit', (code) => {
					if(code) {
						ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
						ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
						reject(code);
					} else {
						resolve(code);
					}
				});
			});

			if(code) {
				ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
				ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			} else {
				var file_data = fs.statSync(`${temp_path}.zip`)
				const file_stream = fs.createReadStream(`${temp_path}.zip`);
				const filename = album.title ? album.title : album.album_id;

				ctx.response.set("content-type", 'application/zip');
				ctx.response.set("content-length", `${file_data.size}`);
				ctx.response.set("accept-ranges", "bytes");
				ctx.response.set("connection", "keep-alive");
				ctx.response.set("content-disposition", `attachment; filename="${filename}.zip`);

				ctx.body = file_stream;
				return;
			}
		} else {
			ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
			ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
			return;
		}
	}
});

router.delete("/:id", async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;
	
	const file_data = await db.query(`
		SELECT * FROM album_file
		JOIN album
		ON album_file.album_id = album.album_id
		JOIN metadata
		ON album_file.file_id = metadata.file_id
		WHERE album.album_id = ?`,
		[ ctx.params.id ]
	);
	if(!file_data.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
		const d_query = await db.query(`
			UPDATE album_file
			JOIN album
			ON album_file.album_id = album.album_id
			JOIN metadata
			ON album_file.file_id = metadata.file_id
			SET deleted = true
			WHERE album.album_id = ?`,
			[ ctx.params.id ]
		);
		if(d_query.changedRows > 0) {
			ctx.status = HttpStatus.SUCCESS.OK.status;
			ctx.body = HttpStatus.SUCCESS.OK.message;
		} else {
			ctx.status = HttpStatus.SUCCESS.ACCEPTED.status;
			ctx.body = HttpStatus.SUCCESS.ACCEPTED.message;
		}
	}
});

const Controller: Router = router;

export default Controller;