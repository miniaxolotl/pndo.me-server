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

import fs from "fs";
import crypto from "crypto";
import path from "path";

import { Connection } from "typeorm";

import { serverError, validationError, resourceNotFound } from "../../util/status";

import { FileTimestampModel } from "../../model/mongo";
import { MetadataModel, UserModel } from "../../model/mysql";
import { UploadSchema } from "../../schema";

import { fileAccess, jwt } from "../../middleware";

import { Metadata, UploadRequest } from "types";

import config from "../../../res/config.json";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.post("/", jwt.identify, async (ctx: ParameterizedContext) => {

	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const file_collection = db.manager.getRepository(MetadataModel);

	const { error } = UploadSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = validationError.status;
		ctx.body = { invalid: [] };
		error.details.forEach(e => {
			if(e.context)
				ctx.body.invalid.push(e.context.key);
		});
	} else {
		const file: any = (ctx.request as any).files.file;
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

					const authenticated = !(ctx.state.username == null);
					const metadata = new MetadataModel();
					metadata.file_id = file_id;
					metadata.sha256 = sha256;
					metadata.md5 = md5;
					metadata.filename = file.name;
					metadata.type = file.type;
					metadata.bytes = file.bytes;
					metadata.user_id = ctx.state.profile_id;

					const flag_protected
						= String(body.protected).toLowerCase() == 'true';
					const flag_hidden
						= String(body.hidden).toLowerCase() == 'true';

					metadata.protected
					= authenticated && (flag_protected || !body.protected)
					? true : false;

					metadata.hidden
					= metadata.protected || (flag_hidden || !body.hidden)
					? true : false;

					metadata.bytes = file.size;

					const res = await file_collection
					.save(metadata)
					.catch(() => {
						ctx.status = serverError.status;
						ctx.body = serverError.message;
					});

					if(res) {
						resolve(res);
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
		}).then((res) => {
			ctx.body = res;
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
// 			owner: ctx.state.user
// 			? ctx.state.user : null,
// 			protected: req.protected && ctx.state.user 
// 			? req.protected : false,
// 			hidden: (req.protected == true && ctx.state.user)
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

router.get("/:id", fileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const file_path = path.join(config.data_dir, ctx.params.id);

	const file_collection = db.manager.getRepository(MetadataModel);
	const file_data = await file_collection.findOne({ file_id: ctx.params.id });
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
				await file_collection
				.update({ file_id: ctx.params.id }, update_query);

				const timestamp_collection
					= ctx.mongo.manager.getRepository(FileTimestampModel);
				const timestamp = new FileTimestampModel()
				timestamp.file_id = ctx.params.id;
				timestamp.user_id = ctx.state.profile_id;

				timestamp_collection
				.save(timestamp)
				.catch((err) => {
					ctx.status = serverError.status;
					ctx.body = serverError.message;
				});
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

router.get("/:id/:filename", fileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;

	const file_path = path.join(config.data_dir, ctx.params.id);

	const file_collection = db.manager.getRepository(MetadataModel);
	const file_data = await file_collection
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
				await file_collection
				.update({ file_id: ctx.params.id }, update_query);

				const timestamp_collection
					= ctx.mongo.manager.getRepository(FileTimestampModel);
				const timestamp = new FileTimestampModel()
				timestamp.file_id = ctx.params.id;
				timestamp.user_id = ctx.state.profile_id;

				await timestamp_collection
				.save(timestamp)
				.catch((err) => {
					ctx.status = serverError.status;
					ctx.body = serverError.message;
				});
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

router.delete("/:id", fileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;
	
	const file_collection = db.manager.getRepository(MetadataModel);
	const file_data = await file_collection
	.findOne({ file_id: ctx.params.id, filename: ctx.params.filename });

	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		const file = new MetadataModel();
		file.deleted = true;

		await file_collection.save(file).then(() => {
			// queue for deletion
		}).catch(() => {
			ctx.status = serverError.status;
			ctx.body = serverError;
		});
	}
});

// router.all("/search", async (ctx: ParameterizedContext) => {
// 	const body = ctx.request.body;
// 	const db: Connection = ctx.mysql;

// 	const file_repo = db.manager.getRepository(MetadataModel);

// 	const limit = body.limit ? parseInt(body.limit) : 15;
// 	const page = body.page ? parseInt(body.page) : parseInt(ctx.query.page);
// 	const search_key = body.search_key
// 		? Like(`%${body.search_key}%`)
// 		: Like(`%`);

// 	const query_data = await new Promise<any>(async (res) => {
// 		const file_list = await file_repo
// 		.find({
// 			where: {
// 				filename: search_key,
// 				protected: false,
// 				hidden: false
// 			},
// 			select: [ "file_id", "sha256", "md5", "filename", "type", "profile_id", "protected", "hidden", "downloads", "views", "bytes", "uploaded", "expires" ],
// 			take: limit,
// 			skip: ((page - 1) * limit)
// 		})
// 		.catch(() => {
// 			res();
// 		})

// 		res(file_list);
// 	});

// 	ctx.body = query_data;
// });

const Controller: Router = router;

export default Controller;