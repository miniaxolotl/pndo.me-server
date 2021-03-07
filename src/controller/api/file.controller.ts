/**
 * file.controller.ts
 * File management workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 20-02-14
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

router.post("/", async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const { value, error } = UploadSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const data: any = (ctx.request as any).files.file;
		if(!data) {
			ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
			ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
			return;
		} 
		const list: File[] = data.length > 0 ? data : [ data ];

		await db.transaction(async (transaction) => {
			ctx.body = { album: {}, files: []}
			let album: AlbumModel;
			const album_data = await db.query("SELECT * FROM album where album_id = ?", [ value.album ]);
			if (value.album && !album_data.length) {
				ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
				ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
				return;
			} else {
				if(!value.album) {
					album = new AlbumModel();
					album.album_id = uid();
					album.protected = value.protected && ctx.state.user_id ? value.protected : false;
					album.hidden = album.protected || album.hidden ? true : false;
					album.title = uid(4);
					album.password = value.password ? await Bcrypt.gen_hash(value.password) : null!;
					await transaction.save(album);

					album.password = undefined!;
					album.deleted = undefined!;
					album.id = undefined!;
					album.d_count = undefined!;
					album.v_count = undefined!;
					(ctx.body as { album: {}, files: any[] }).album = album;
				} else {
					album = value.album;

					album.password = undefined!;
					album.deleted = undefined!;
					album.id = undefined!;
					album.d_count = undefined!;
					album.v_count = undefined!;
					(ctx.body as { album: {}, files: any[] }).album = album_data[0];
				}

				for(let i = 0; i < list.length; i++) {
					await new Promise<any>(async (resolve, reject) => {

						const file_id = uid();
						const temp_path = (list[i] as any).path;
						const file_path = path.join(`${config.dir.data}/data`, file_id);

						const in_stream = fs.createReadStream(temp_path);
						const out_stream = fs.createWriteStream(file_path);

						const ext_stream = fs.createReadStream(temp_path);
						const file_ext = await FileType.fromStream(ext_stream);
						
						in_stream.on('end', async () => {
							const sha256 = in_stream.pipe(crypto.createHash('sha256')).digest('hex');
							const md5 = in_stream.pipe(crypto.createHash('md5')).digest('hex');
							
							const metadata = new MetadataModel();
							metadata.file_id = file_id;
							metadata.sha256 = sha256;
							metadata.md5 = md5;
							metadata.filename = list[i].name;
							metadata.type = list[i].type;
							metadata.bytes = list[i].size;
							metadata.ext = file_ext ? file_ext.ext : '';
							await transaction.save(metadata);

							metadata.id = undefined!;
							metadata.d_count = undefined!;
							metadata.v_count = undefined!;
							metadata.deleted = undefined!;
							
							const album_metatdata = new AlbumMetadataModel();
							album_metatdata.album = album;
							album_metatdata.metadata = metadata;
							await transaction.save(album_metatdata);

							const album_user = new AlbumUserModel();
							album_user.album = album;
							album_user.user = ctx.state.user_id;
							await transaction.save(album_user);

							fs.unlinkSync(temp_path);
							if(album_metatdata) {
								(ctx.body as { album: {}, files: any[] }).files.push(metadata);
								resolve(null); 
							} else {
								ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
								ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
								reject();
							}
						});
						in_stream.pipe(out_stream);
					});
				}
			}
		});
	}
});

router.post("/url", async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const { value, error } = URLUploadSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const data: any = (ctx.request.body as any).url;
		const list: string[] = data.length > 0 ? data : [ data ];

		await db.transaction(async (transaction) => {
			ctx.body = { album: {}, files: []}

			let password_hash: string | null | undefined = undefined;
			if(value.password) {
				password_hash = await Bcrypt.gen_hash(validator.escape(value.password));
				if(!password_hash) { password_hash = null; }
			}
			
			let album: AlbumModel;
			const album_data = await db.query("SELECT * FROM album where album_id = ?", [ value.album ]);
			if (value.album && !album_data.length) {
				ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
				ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
				return;
			} else {
				if(!value.album) {
					album = new AlbumModel();
					album.album_id = uid();
					album.protected = value.protected && ctx.state.user_id ? value.protected : false;
					album.hidden = album.protected || album.hidden ? true : false;
					album.title = uid(4);
					album.password = value.password ? await Bcrypt.gen_hash(value.password) : null!;
					await transaction.save(album);

					album.password = undefined!;
					album.deleted = undefined!;
					album.id = undefined!;
					album.d_count = undefined!;
					album.v_count = undefined!;
					(ctx.body as { album: {}, files: any[] }).album = album;
				} else {
					album = value.album;

					album.password = undefined!;
					album.deleted = undefined!;
					album.id = undefined!;
					album.d_count = undefined!;
					album.v_count = undefined!;
					(ctx.body as { album: {}, files: any[] }).album = album_data[0];
				}
				for(var i = 0; i < list.length; i++) {
					const file_id = uid();
					const temp_path = path.join(`${config.dir.data}/temp`, file_id);
					const file_path = path.join(`${config.dir.data}/data`, file_id);

					await new Promise<any>(async (resolve, reject) => {
						const res = await fetch(list[i])
						const dlStream = fs.createWriteStream(temp_path);
						res.body.pipe(dlStream);
						dlStream.on('finish', async () => {
							const in_stream = fs.createReadStream(temp_path);
							const out_stream = fs.createWriteStream(file_path);

							const ext_stream = fs.createReadStream(temp_path);
							const file_ext = await FileType.fromStream(ext_stream);
							let alt_ext = '';

							in_stream.on('end', async () => {
								const sha256 = in_stream.pipe(crypto.createHash('sha256')).digest('hex');
								const md5 = in_stream.pipe(crypto.createHash('md5')).digest('hex');
								fs.unlinkSync(temp_path);
								const file_stats = fs.statSync(file_path);

								const headers = res.headers.raw();
								const file_type = headers["content-type"][0].split(";");
								const file_size = headers["content-length"];
								let file_name = headers["content-disposition"]
								? headers["content-disposition"][0]
								.split(';')[1].split('"')[1] : file_id;

								const qq = list[i].split("/");
								if(qq.length > 0 && qq[qq.length-1]) {
									file_name = headers["content-disposition"] ? file_name : qq[qq.length-1];
									const seg =  file_type[0].split("/");
									if(!file_ext && seg.length > 0) {
										alt_ext = seg[seg.length-1];
									}
								}

								const metadata = new MetadataModel();
								metadata.file_id = file_id;
								metadata.sha256 = sha256;
								metadata.md5 = md5;
								metadata.ext = file_ext ? file_ext.ext : alt_ext;
								metadata.filename = file_name.split('.').length > 1
								? `${file_name}` : metadata.ext ? `${file_name}.${metadata.ext}` : file_name;
								metadata.type = file_type[0];
								metadata.bytes = Number(file_size ? file_size[0] : file_stats.size);
								await transaction.save(metadata);

								metadata.id = undefined!;
								metadata.d_count = undefined!;
								metadata.v_count = undefined!;
								metadata.deleted = undefined!;

								const album_metatdata = new AlbumMetadataModel();
								album_metatdata.album = album;
								album_metatdata.metadata = metadata;
								await transaction.save(album_metatdata);

								const album_user = new AlbumUserModel();
								album_user.album = album;
								album_user.user = ctx.state.user_id;
								await transaction.save(album_user);

								if(album_metatdata) {
									(ctx.body as { album: {}, files: any[] }).files.push(metadata);
									resolve(null);
								} else {
									ctx.status = HttpStatus.SERVER_ERROR.INTERNAL.status;
									ctx.body = HttpStatus.SERVER_ERROR.INTERNAL.message;
									reject();
								}
							}).pipe(out_stream).on('error', reject);
						}).on('error', reject);
					});
				}
			}
		});
	}
});

router.get("/:id", FileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const file_data = await db.query(`
		SELECT * FROM album_file
		JOIN metadata 
		ON album_file.file_id = metadata.file_id AND album_file.file_id = ?
		WHERE metadata.deleted = false`,
		[ ctx.params.id ]
	);
	if(!file_data || !file_data.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
		const file_path = path.join(`${config.dir.data}/data`, file_data[0].file_id);
		if(fs.existsSync(file_path)) {
			const file_stream = fs.createReadStream(file_path);
			ctx.response.set("content-type", file_data[0].type);
			ctx.response.set("content-length", `${file_data[0].bytes}`);
			ctx.response.set("accept-ranges", "bytes");
			ctx.response.set("connection", "keep-alive");
			ctx.response.set("content-disposition", `inline; filename="${file_data[0].filename}"`);

			ctx.body = file_stream;
			return;
		} else {
			ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
			ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			return;
		}
	}
});

router.get("/:id/:filename", FileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const file_data = await db.query(`
		SELECT * FROM album_file
		JOIN metadata 
		ON album_file.file_id = metadata.file_id AND album_file.file_id = ? AND metadata.filename = ?
		WHERE metadata.deleted = false`,
		[ ctx.params.id, ctx.params.filename ]
	);
	if(!file_data || !file_data.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
		const file_path = path.join(`${config.dir.data}/data`, file_data[0].file_id);
		
		if(fs.existsSync(file_path)) {
			ctx.response.set("content-type", file_data[0].type);
			ctx.response.set("content-length", `${file_data[0].bytes}`);
			ctx.response.set("accept-ranges", "bytes");
			ctx.response.set("connection", "keep-alive");
			ctx.response.set("content-disposition", `inline; filename="${file_data[0].filename}`);

			ctx.body = fs.createReadStream(file_path);
			return;
		} else {
			ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
			ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			return;
		}
	}
});

router.patch("/:id", FileAccess, async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const { value, error } = FileUpdateSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const file = await db.getRepository(MetadataModel).findOne({ file_id: ctx.params.id });
		if(!file) {
			ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
			ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
			return;
		} else {
			const data = await new Promise<MetadataModel | null>((resolve, reject) => {
				db.transaction(async (transaction) => {
					const file_u = {
						...new MetadataModel(),
						...value,
						file_id: ctx.params.id
					};
					await transaction.getRepository(MetadataModel).save({
						...file,
						...file_u
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

router.delete("/:id", FileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;
	
	const file_data = await db.query(`
		SELECT * FROM album_file
		JOIN metadata
		ON album_file.file_id = metadata.file_id AND album_file.file_id = ?`,
		[ ctx.params.id ]
	);
	if(!file_data.length) {
		ctx.status = HttpStatus.CLIENT_ERROR.NOT_FOUND.status;
		ctx.body = HttpStatus.CLIENT_ERROR.NOT_FOUND.message;
		return;
	} else {
		const d_query = await db.query(`
			UPDATE metadata
			JOIN album_file
			ON album_file.file_id = metadata.file_id AND album_file.file_id = ?
			SET metadata.deleted = true`,
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