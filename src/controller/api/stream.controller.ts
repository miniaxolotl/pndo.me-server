/**
 * stream.controller.ts
 * File streaming workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 21-02-04
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../../lib";
import { SessionResponce, UploadRequest } from "../../lib/types";
import { FileAccess } from "../../middleware";
import { FileUpdateSchema, LoginSchema, PublicSearchSchema, RegisterSchema, UploadSchema, URLUploadSchema } from "../../schema";

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

router.all("/:id", FileAccess, async (ctx: ParameterizedContext) => {

	const db: Connection = ctx.mysql;
	
	const file_collection = db.manager.getRepository(MetadataModel);

	const file_path = path.join(`${config.dir.data}/data`, validator.escape(ctx.params.id));
	const file_data = await file_collection.findOne({ file_id: validator.escape(ctx.params.id) });
	if(!file_data) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
			if(fs.existsSync(file_path)) {
				fs.statSync(file_path);
			
				const range = ctx.headers.range;
				if(range) {
					const parts = range.replace(/bytes=/, "").split("-");
					const start = parseInt(parts[0], 10);
					const end = parts[1] ? parseInt(parts[1], 10) : file_data.bytes - 1;
					const chunk_size = (end-start) + 1;
					
					const file_stream = fs.createReadStream(file_path, {start, end});
						
					ctx.response.set("connection", "keep-alive");
					ctx.response.set("content-type", file_data.type);
					ctx.response.set("content-length", chunk_size.toString());
					ctx.response.set("accept-ranges", "bytes");
					ctx.response.set("content-range", `bytes ${start}-${end}/${file_data.bytes}`);
					ctx.response.set("content-disposition", `inline; filename="${file_data.filename}"`);
				
					file_stream.on("error", e => void(0));
					ctx.status = 206;
					ctx.body = file_stream;
					
				} else {
					{ /* set headers */
						ctx.response.set("connection", "keep-alive");
						ctx.response.set("content-length", file_data.bytes.toString());
						ctx.response.set("content-type", file_data.type);
						ctx.response.set("content-disposition", `inline; filename="${file_data.filename}"`);
					}

					const file_stream = fs.createReadStream(file_path)
					file_stream.on("error", error => void(null));

					ctx.status = 200;

					ctx.body = file_stream.pipe(new stream.PassThrough());
					return;
				}
		} else {
			ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
			ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
			return;
		}
	}
});

const Controller: Router = router;

export default Controller;