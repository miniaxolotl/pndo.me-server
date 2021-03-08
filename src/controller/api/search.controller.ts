/**
 * search.controller.ts
 * Database search functions
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 21-03-07
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../../lib";
import { SessionResponce, UploadRequest } from "../../lib/types";
import { AlbumAccess } from "../../middleware";
import { LoginSchema, PublicSearchSchema, RegisterSchema, UploadSchema, URLUploadSchema } from "../../schema";

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

router.all("/", async (ctx: ParameterizedContext) => {

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

		ctx.body = {
			n_page,
			c_page,
			page_data: s_query,
		};
		return;
	}
});

const Controller: Router = router;

export default Controller;