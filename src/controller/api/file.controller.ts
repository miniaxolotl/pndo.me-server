/**
 * file.controller.ts
 * File management workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 20-02-14
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import fs, { createReadStream, stat } from "fs";
import crypto from "crypto";
import path from "path";

import { Connection, Like } from "typeorm";
import validator from "validator";

import { userNotFound, unauthorizedAccess, actionSuccessful, actionUnsuccessful, serverError, validationError, resourceNotFound } from "../../util/status";

import { FileTimestampModel } from "../../model/mongo";
import { MetadataModel, ProfileModel } from "../../model/mysql";
import { UploadSchema } from "../../schema";

import { jwtIdentify, fileAccess } from "../../middleware";

import { bcrypt, TimedJWT } from "../../util";
import { ProfileData, AuthResponce, Metadata, UploadRequest } from "types";

import config from "../../../res/config.json";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.post("/upload", jwtIdentify, async (ctx: ParameterizedContext) => {
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const file_repo = db.manager.getRepository(MetadataModel);

	const { value, error } = UploadSchema.validate(body);

	if(error) {
		ctx.status = validationError.status;
		ctx.body = validationError.message;
	} else {
		const file: any = (ctx.request as any).files.upload_file;
		const file_id = crypto.randomBytes(8).toString('hex');
	
		const tmp_path = file.path;
		const file_path = path.join(config.data_dir, file_id);
	
		await new Promise<Metadata>((resolve, reject) => {
			const in_stream = fs.createReadStream(tmp_path);
			const out_stream = fs.createWriteStream(file_path);
	
			try {
				in_stream.on('end', async () => {
					const sha256 =
					in_stream.pipe(crypto.createHash('sha256')).digest('hex');
					const md5 =
					in_stream.pipe(crypto.createHash('md5')).digest('hex');
	
					fs.unlinkSync(tmp_path);

					const loggedIn = !(ctx.auth.username == null);

					const file_metadata = new MetadataModel();
					file_metadata.file_id = file_id;
					file_metadata.sha256 = sha256;
					file_metadata.md5 = md5;
					file_metadata.filename = file.name;
					file_metadata.type = file.type;
					file_metadata.bytes = file.bytes;
					file_metadata.profile_id = ctx.auth.profile_id;

					const p = String(body.protected).toLowerCase() == 'true';
					const h = String(body.hidden).toLowerCase() == 'true';

					file_metadata.protected
					= loggedIn && (p || !body.protected)
					? true : false;

					file_metadata.hidden
					= file_metadata.protected || (h || !body.hidden)
					? true : false;

					file_metadata.bytes = file.size;

					const metadata_res = await file_repo
					.save(file_metadata)
					.catch((e) => {
						ctx.status = serverError.status;
						ctx.body = serverError.message;
					});

					if(metadata_res) {
						resolve(metadata_res);
					} else {
						reject();
					}
				});
				
				
				in_stream.pipe(out_stream);
			} catch {
				reject();
			}
		}).catch(() => {
			ctx.status = serverError.status;
			ctx.body = serverError;
		}).then((file_data) => {
			ctx.body = file_data;
		});
	}
});

// router.post("/upload/url", jwtIdentify,
// 	async (ctx: ParameterizedContext) => {

// 	const req: any = ctx.request.body;
// 	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;
	
// 	if(!req || !req.resource_url)
// 	{ ctx.throw(invalidBody.status, invalidBody); }

// 	const resource: any = req.resource_url;
// 	const file_hash = crypto.randomBytes(8).toString('hex');
// 	const file_path = path.join(config.file_store.slow[0], file_hash)

// 	var file = fs.createWriteStream(file_path);

// 	const file_data = await new Promise<any>((res, rej) => {
// 		request(resource, (err, result, data) => {
			
// 			if(result.statusCode == 200) {
// 				const file_type = result.headers["content-type"];
// 				const file_size = result.headers["content-length"];
// 				const file_name = result.headers["content-disposition"]
// 				?.split(';')[1]
// 				.split('"')[1]
// 				? result.headers["content-disposition"]
// 					?.split(';')[1]
// 					.split('"')[1]
// 				: path.basename('resource');

// 				if(file_type && file_name && file_size) {
// 					file.on('finish', () => {
// 						const in_stream = fs.createReadStream(file_path);
// 						const sha256 =
// 							in_stream.pipe(crypto.createHash('sha256'))
// 							.digest('hex');
// 						const md5 =
// 							in_stream.pipe(crypto.createHash('md5'))
// 							.digest('hex');

// 						file.close();
// 						res({ file_type, file_name, file_size, sha256, md5 });
// 					});
// 				} else {
// 					res(null);
// 				}
// 			} else {
// 				res(null);
// 			}
// 		}).pipe(file);
// 	});

// 	if(file_data) {
// 		const file_metadata: Metadata = {
// 			file_id: file_hash,
// 			sha256: file_data.sha256,
// 			md5: file_data.md5,
// 			filename: file_data.file_name,
// 			type: file_data.file_type,
// 			bytes: file_data.file_size,
// 			owner: ctx.auth.user
// 			? ctx.auth.user : null,
// 			protected: req.protected && ctx.auth.user 
// 			? req.protected : false,
// 			hidden: (req.protected == true && ctx.auth.user)
// 			|| !req.hidden || req.hidden == 'true' || req.hidden == true
// 			? true : false,
// 		};
		
// 		const metadata_store = new models['uploads.metadata'](file_metadata);
// 		await metadata_store.save().catch();

// 		ctx.body = file_metadata;
// 	} else {
// 		ctx.status = invalidRequest.status;
// 		ctx.body = invalidRequest;
// 	}
// });

// router.post("/delete/:id", jwtIdentify, async (ctx: ParameterizedContext) => {
// 	const body: UploadRequest = ctx.request.body;
// 	const db: Connection = ctx.mysql;
	
// 	const file_repo = db.manager.getRepository(MetadataModel);

// 	const file_path = path.join(config.data_dir, ctx.params.id);

// 	await models['uploads.metadata']
// 	.updateOne({ file_id: ctx.params.id }, { deleted: true })
// 	.then(() => {
// 		agenda.now('QueueFileDelete', { file_id: ctx.params.id, file_path });

// 		ctx.status = resourceQueuefDeleted.status;
// 		ctx.body = resourceQueuefDeleted;
// 	})
// 	.catch(() => {
// 		ctx.status = serverError.status;
// 		ctx.body = serverError;
// 	});
// });

router.all("/stream/:id", fileAccess, async (ctx: ParameterizedContext) => {
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const file_repo = db.manager.getRepository(MetadataModel);

	const file_path = path.join(config.data_dir, ctx.params.id);

	const file_data = await file_repo
	.findOne({ file_id: ctx.params.id });

	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		try {
			/* check if file exists on filesystem */
			fs.statSync(file_path);
		
			const range = ctx.headers.range;
			
			if(range) {
				const parts = range.replace(/bytes=/, "").split("-");
				const start = parseInt(parts[0], 10);
				const end = parts[1] ? parseInt(parts[1], 10) : file_data.bytes - 1;
				const chunk_size = (end-start) + 1;
				
				if(fs.existsSync(file_path)) {
					const file_stream
						= fs.createReadStream(file_path, {start, end});
					
				{ /* set headers */
					ctx.response.set("connection", "keep-alive");
					ctx.response.set("content-type", file_data.type);
					ctx.response.set("content-length", chunk_size.toString());
					ctx.response.set("accept-ranges", "bytes");
					ctx.response.set("content-range",
					`bytes ${start}-${end}/${file_data.bytes}`);
					ctx.response.set("connection", "keep-alive");
					ctx.response.set("content-disposition",
					"inline; filename=\""+file_data.filename+'"');
				}
				
				ctx.status = 206;
				ctx.body = file_stream;
				} else {
					ctx.status = resourceNotFound.status;
					ctx.body = resourceNotFound.message;
				}
			} else {
				{ /* update stats */
					const update_query = {
						downloads: file_data.downloads ? ++file_data.downloads : 1,
					}
					await file_repo
					.update({ file_id: ctx.params.id }, update_query);

					const file_timestamp_store
					= ctx.mongo.manager.getRepository(FileTimestampModel);

					const file_timestamp = new FileTimestampModel();
					file_timestamp.file_id = ctx.params.id;
					file_timestamp.profile_id = ctx.auth.profile_id;

					const res = await file_timestamp_store
					.save(file_timestamp)
					.catch((err) => {
						ctx.status = serverError.status;
						ctx.body = serverError.message;
					});
					console.log(res);
					
				}	
				
				{ /* set headers */
					ctx.response.set("connection", "keep-alive");
					ctx.response.set("content-length", file_data.bytes.toString());
					ctx.response.set("content-type", file_data.type);
					ctx.response.set("content-disposition",
					"inline; filename=\""+file_data.filename+'"');
				}
				
				if(fs.existsSync(file_path)) {
					ctx.status = 200;
					ctx.body = fs.createReadStream(file_path);
				} else {
					ctx.status = resourceNotFound.status;
					ctx.body = resourceNotFound.message;
				}
			}
		} catch(err) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound.message;
		}
	}
});

router.all("/download/:id", fileAccess,
	async (ctx: ParameterizedContext) => {
	
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_path = path.join(config.data_dir, ctx.params.id);

	const file_repo = db.manager.getRepository(MetadataModel);
	const file_data = await file_repo.findOne({ file_id: ctx.params.id });

	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		if(fs.existsSync(file_path)) {
			const file_stream = fs.createReadStream(file_path);

			{ /* update stats */
				const update_query = {
					downloads: file_data.downloads ? ++file_data.downloads : 1,
				}
				await file_repo
				.update({ file_id: ctx.params.id }, update_query);

				const file_timestamp_store = ctx.mongo.manager.getRepository(FileTimestampModel);
				const file_timestamp = new FileTimestampModel()
				file_timestamp.file_id = ctx.params.id;
				file_timestamp.profile_id = ctx.auth.profile_id;

				file_timestamp_store
				.save(file_timestamp)
				.catch((err) => {
					console.log(err);
					
					ctx.status = serverError.status;
					ctx.body = serverError.message;
				});;
			}

			ctx.response.set("content-type", file_data.type);
			ctx.response.set("content-length", file_data.bytes.toString());
			ctx.response.set("accept-ranges", "bytes");
			ctx.response.set("connection", "keep-alive");
			ctx.response.set("content-disposition",
				"inline; filename=\""+file_data.filename+'"');

			ctx.body = file_stream;
		} else {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		}
	}
});

router.all("/download/:id/:filename", fileAccess,
	async (ctx: ParameterizedContext) => {
	
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_path = path.join(config.data_dir, ctx.params.id);

	const file_repo = db.manager.getRepository(MetadataModel);
	const file_data = await file_repo
	.findOne({ file_id: ctx.params.id, filename: ctx.params.filename });

	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		if(fs.existsSync(file_path)) {
			const file_stream = fs.createReadStream(file_path);

			{ /* update stats */
				const update_query = {
					downloads: file_data.downloads ? ++file_data.downloads : 1,
				}
				await file_repo
				.update({ file_id: ctx.params.id }, update_query);

				const file_timestamp_store = ctx.mongo.manager.getRepository(FileTimestampModel);
				const file_timestamp = new FileTimestampModel()
				file_timestamp.file_id = ctx.params.id;
				file_timestamp.profile_id = ctx.auth.profile_id;

				file_timestamp_store
				.save(file_timestamp)
				.catch((err) => {
					console.log(err);
					
					ctx.status = serverError.status;
					ctx.body = serverError.message;
				});;
			}

			ctx.response.set("content-type", file_data.type);
			ctx.response.set("content-length", file_data.bytes.toString());
			ctx.response.set("accept-ranges", "bytes");
			ctx.response.set("connection", "keep-alive");
			ctx.response.set("content-disposition",
				"inline; filename=\""+file_data.filename+'"');

			ctx.body = file_stream;
		} else {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		}
	}
});

router.all("/info/:id", fileAccess, async (ctx: ParameterizedContext) => {
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const file_repo = db.manager.getRepository(MetadataModel);
	const file_data = await file_repo
	.findOne({ file_id: ctx.params.id });

	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		{ /* update stats */
			const update_query = {
				views: file_data.views ? ++file_data.views : 1,
			}
			await file_repo
			.update({ file_id: ctx.params.id }, update_query);
		}

		const profile_repository = db.manager.getRepository(ProfileModel);
		
		const profile_data = await profile_repository
		.findOne({ profile_id: file_data.profile_id! });

		const responce: Metadata = {
			file_id: file_data.file_id,
			sha256: file_data.sha256,
			md5: file_data.md5,
			filename: file_data.filename,
			type: file_data.type,
			owner: profile_data?.display_name
				? profile_data.display_name : null,
			protected: file_data.protected,
			hidden: file_data.hidden,
			downloads: file_data.downloads,
			views: file_data.views,
			bytes: file_data.bytes,
			uploaded: file_data.uploaded,
			expires: file_data.expires,
		};

		ctx.body = responce;
	}
});

router.all("/search", async (ctx: ParameterizedContext) => {
	const body = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_repo = db.manager.getRepository(MetadataModel);

	const limit = body.limit ? parseInt(body.limit) : 15;
	const page = body.page ? parseInt(body.page) : parseInt(ctx.query.page);
	const search_key = body.search_key
		? Like(`%${body.search_key}%`)
		: Like(`%`);

	const query_data = await new Promise<any>(async (res) => {
		const file_list = await file_repo
		.find({
			where: {
				filename: search_key,
				protected: false,
				hidden: false
			},
			select: [ "file_id", "sha256", "md5", "filename", "type", "profile_id", "protected", "hidden", "downloads", "views", "bytes", "uploaded", "expires" ],
			take: limit,
			skip: ((page - 1) * limit)
		})
		.catch(() => {
			res();
		})

		res(file_list);
	});

	ctx.body = query_data;
});

const Controller: Router = router;

export default Controller;