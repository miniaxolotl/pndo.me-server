/**
 * AuthController.ts
 * General authentication workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 20-02-14
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';
import mongoose, { Model, Mongoose } from 'mongoose';

import fs, { createReadStream } from "fs";
import crypto from "crypto";
import path from "path";

import { ResgisterRequest, Metadata, MetadataSanitised } from "types";
import { invalidBody, serverError,
	resourceNotFound, resourceDeleted } from "../../util/errors";

import config from "../../../res/config.json";

/************************************************
 * ANCHOR routes
 ************************************************/

const router: Router = new Router();

router.post("/upload", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file: any = (ctx.request as any).files.file;
	if(!req || !file) { ctx.throw(invalidBody.status, invalidBody); }

	const file_hash = crypto.randomBytes(8).toString('hex');
	let metadata_store: any;

	const tmp_path = file.path;
	const file_path = path.join(config.file_path, file_hash);

	const file_data = await new Promise<Metadata | null>((resolve, reject) => {
		fs.rename(tmp_path, file_path, async (err) => {
			if(err) {
				reject(err);
			} else {
				console.log(file);
				
				const file_data: Metadata = {
					hash: file_hash,
					filename: file.name,
					type: file.type,
					bytes: file.size,
				};

				metadata_store = new models['uploads.metadata'](file_data);
				
				await metadata_store.save().then(async (e: any) => {
					// do nothing
				}).catch(() => {
					resolve(null);
				});
				resolve(file_data);
			}
		});
	});

	if(!file_data) { ctx.throw(serverError.status, serverError); }

	ctx.body = file_data;
});

router.post("/delete/:id", async (ctx: ParameterizedContext) => {
	// const req: ResgisterRequest = (ctx.request as any).body;

	// const db = ctx.db;

	// let file_data: Metadata;

	// const upload_store = createModel({
	// 	modelName: 'uploads',
	// 	connection: db.connection,
	// });
	
	// const status = await new Promise<boolean>(async (resolve, reject) => {
	// 	await (db['uploads.metadata'] as mongoose.Model<any>)
	// 	.findOneAndDelete({ uuid: ctx.params.id }, async (err, res) => {
	// 		if(res === null) {
	// 			resolve(false);
	// 		} else {
	// 			file_data = res;
				
	// 			upload_store.unlink({ _id: file_data.ref }, (error) => {
	// 			});
	// 		}
	// 	}).then(() => {
	// 		// do nothing
	// 		resolve(true);
	// 	});
	// });
	
	// if(status) {
	// 	ctx.status = resourceDeleted.status;
	// 	ctx.body = resourceDeleted;
	// } else {
	// 	ctx.status = resourceNotFound.status;
	// 	ctx.body = resourceNotFound;
	// }
});

router.all("/stream/:id", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_path = path.join(config.file_path, ctx.params.id);

	const stat = fs.statSync(file_path);
	const fileSize = stat.size
	const range = ctx.headers.range
	if (range) {
		const parts = range.replace(/bytes=/, "").split("-");
		const start = parseInt(parts[0], 10);
		const end = parts[1]
		? parseInt(parts[1], 10)
		: fileSize-1;
		const chunksize = (end-start)+1;
		const file = fs.createReadStream(file_path, {start, end});
		ctx.response.set("content-type", 'video/webm');
		ctx.response.set("content-length", chunksize.toString());
		ctx.response.set("accept-ranges", "bytes");
		ctx.response.set("content-range", `bytes ${start}-${end}/${fileSize}`);
		ctx.response.set("connection", "keep-alive");
		ctx.response.set("content-disposition",
			"inline; filename=hello.mkv");
		
		ctx.status = 206;
		ctx.body = file;
	} else {
		ctx.response.set("content-length", fileSize.toString());
		ctx.response.set("content-type", 'video/webm');
		ctx.response.set("content-disposition",
			"inline; filename=hello.mkv");
		
		ctx.status = 200;
		ctx.body = fs.createReadStream(file_path)
		.on('error', () => { console.log('hello') });
	}
});

router.all("/download/:id", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	let file_data: Metadata;

	await models['uploads.metadata']
	.findOne({ hash: ctx.params.id }, async (err, res) => {
		if(res === null) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
			file_data = res;

			const file_path = path.join(config.file_path, res.hash);
			const readStream = fs.createReadStream(file_path);

			ctx.response.set("content-type", file_data.type);
			ctx.response.set("content-length", file_data.bytes.toString());
			ctx.response.set("accept-ranges", "bytes");
			ctx.response.set("connection", "keep-alive");
			ctx.response.set("content-disposition",
				"inline; filename="+file_data.filename);

			ctx.body = readStream;
		}
	}).then(() => {
		// do nothing
	});
});

router.all("/download/:id/:name", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	// let file_data: Metadata;
	
	// await models['uploads.metadata']
	// .findOne({ uuid: ctx.params.id, filename: ctx.params.name },
	// 	async (err, res) => {
	// 	if(res === null) {
	// 		ctx.status = resourceNotFound.status;
	// 		ctx.body = resourceNotFound;
	// 	} else {
	// 		file_data = res;
	// 		const readStream = upload_store.read({ _id: file_data.ref });

	// 		ctx.response.set("content-type", 'video/webm');
	// 		ctx.response.set("content-length", file_data.bytes.toString());
	// 		ctx.response.set("accept-ranges", "bytes");
	// 		ctx.response.set("connection", "keep-alive");
	// 		ctx.response.set("content-disposition",
	// 			"inline; filename="+file_data.filename);

	// 		ctx.body = readStream;
	// 	}
	// }).then(() => {
	// 	// do nothing
	// });
});

router.all("/info/:id", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	let file_data: Metadata;

	await models['uploads.metadata']
	.findOne({ uuid: ctx.params.id }, async (err, res) => {
		if(res === null) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
		file_data = res;
		const responce: MetadataSanitised = {
			hash: file_data.uuid,
			filename: file_data.filename,
			type: file_data.type,
			owner: file_data.owner ? file_data.owner : null,
			downloads: file_data.downloads,
			views: file_data.views,
			bytes: file_data.bytes,
			expires: file_data.expires,
		};
		ctx.body = responce;
	}
	}).then(() => {
		// do nothing
	});
});

const Controller: Router = router;

export default Controller;
