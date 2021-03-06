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
import { LoginSchema, RegisterSchema, UploadSchema, URLUploadSchema } from "../../schema";

import { AlbumMetadataModel, AlbumModel, MetadataModel, SessionModel, UserModel } from "../../model/mysql";
import { Connection } from "typeorm";

import fetch from "node-fetch";
import crypto from "crypto";
import path, { join } from "path";
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
	if(!album_files.length) {
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

				ctx.response.set("content-type", 'application/zip');
				ctx.response.set("content-length", `${file_data.size}`);
				ctx.response.set("accept-ranges", "bytes");
				ctx.response.set("connection", "keep-alive");
				ctx.response.set("content-disposition", `attachment; filename="${ctx.params.id}.zip`);

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