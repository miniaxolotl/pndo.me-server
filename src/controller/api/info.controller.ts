/**
 * info.controller.ts
 * File/Album info workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 21-02-04
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../../lib";
import { SessionResponce, UploadRequest } from "../../lib/types";
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

router.get([ "/file/:id", "/f/:id" ], async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const file_data = await db.query(`
		SELECT 
			album_file.album_id,
			metadata.filename, metadata.type, metadata.bytes, 
			metadata.sha256, metadata.md5, metadata.d_count, metadata.v_count,
			metadata.create_date
		FROM metadata
		LEFT JOIN album_file
		ON metadata.file_id = album_file.file_id
		WHERE album_file.file_id = "${ctx.params.id}"
	`);
	if(!file_data.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
	} else {
		ctx.body = file_data[0];
	}
});

router.get([ "/album/:id", "/a/:id" ], async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;
	
	const album_data = await db.query(`
		SELECT
			t2.album_id, t2.title, COUNT(t2.file_id) AS files, SUM(t2.bytes) AS bytes,
			t2.protected, t2.hidden, t2.d_count, t2.v_count, t2.create_date
		FROM
			(SELECT
				t1.album_id, metadata.file_id, metadata.bytes, t1.create_date,
				t1.title,  t1.protected, t1.hidden, t1.d_count, t1.v_count 
			FROM
				(SELECT album_file.file_id, album.* FROM album_file
				RIGHT JOIN album
				ON album_file.album_id = album.album_id) AS t1
			RIGHT JOIN metadata
			ON t1.file_id = metadata.file_id
			WHERE t1.album_id = "${ctx.params.id}") AS t2
		GROUP BY t2.album_id
	`);
	const file_list = await db.query(`
		SELECT * FROM
		(SELECT metadata.file_id, filename, metadata.bytes, metadata.type, metadata.create_date FROM
		(SELECT album_file.file_id, album.* FROM album_file
		RIGHT JOIN album
		ON album_file.album_id = album.album_id) AS t1
		RIGHT JOIN metadata
		ON t1.file_id = metadata.file_id
		WHERE t1.album_id = "${ctx.params.id}") AS t2
		GROUP BY t2.file_id
	`);
	
	if(!album_data.length || !file_list.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
	} else {
		ctx.body = {
			album: album_data,
			files: file_list,
		};
	}
});

const Controller: Router = router;

export default Controller;