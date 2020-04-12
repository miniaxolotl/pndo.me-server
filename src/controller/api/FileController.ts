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
import { ResgisterRequest, Metadata, GridFSFile, MetadataSanitised } from "types";
import { invalidBody, serverError, StatusMessage, resourceNotFound, resourceDeleted } from "../../util/errors";
import { GridFS, connection } from "../../server";
import mongoose, { Model, Mongoose } from 'mongoose';
import crypto from "crypto";

import { createModel } from 'mongoose-gridfs';

import fs, { createReadStream } from "fs";

const router: Router = new Router();

router.post("/upload", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).body;
	const files: any = (ctx.request as any).files;
	if(!req || !files) { ctx.throw(invalidBody.status, invalidBody); }

	const db = ctx.db;

	const file_hash = crypto.randomBytes(4).toString('hex');
	let metadata_store: any;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
		chunkSizeBytes: 2**22
	});

	const readStream = fs.createReadStream(files.file.path);
	const options
		= ({ filename: files.file.name, contentType: files.file.type })

	const file_data = await new Promise<Metadata>((resolve, reject) => {
		upload_store.write(options, readStream, async (error, file) => {
			const file_data: Metadata = {
				ref: file._id,
				uuid: file_hash,
				filename: file.filename,
				type: file.contentType,
				bytes: file.length,
				uploaded: file.uploadDate,
			};

			metadata_store = db['uploads.metadata'](file_data);
			
			await metadata_store.save().then(async (e: any) => {
				// do nothing
			}).catch((e) => {
				reject(serverError);
			});
			resolve(file_data);
		});
	});

	ctx.body = file_data;
});

router.post("/delete/:id", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).body;

	const db = ctx.db;

	let file_data: Metadata;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
	});
	
	const status = await new Promise<boolean>(async (resolve, reject) => {
		await (db['uploads.metadata'] as mongoose.Model<any>)
		.findOneAndDelete({ uuid: ctx.params.id }, async (err, res) => {
			if(res === null) {
				resolve(false);
			} else {
				file_data = res;
				
				upload_store.unlink({ _id: file_data.ref }, (error) => {
				});
			}
		}).then(() => {
			// do nothing
			resolve(true);
		});
	});
	
	if(status) {
		ctx.status = resourceDeleted.status;
		ctx.body = resourceDeleted;
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound;
	}
});

router.all("/download/:id", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).body;
	
	const db = ctx.db;

	let file_data: Metadata;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
	});
	
	await db['uploads.metadata']
	.findOne({ uuid: ctx.params.id }, async (err, res) => {
		if(res === null) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
			file_data = res;
			const readStream = upload_store.read({ _id: file_data.ref });

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
	const req: ResgisterRequest = (ctx.request as any).body;

	const db = ctx.db;

	let file_data: Metadata;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
	});
	
	await db['uploads.metadata']
	.findOne({ uuid: ctx.params.id, filename: ctx.params.name },
		async (err, res) => {
		if(res === null) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
			file_data = res;
			const readStream = upload_store.read({ _id: file_data.ref });

			ctx.response.set("content-type", 'video/webm');
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

router.all("/info/:id", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).body;

	const db = ctx.db;

	let file_data: Metadata;

	await db['uploads.metadata']
	.findOne({ uuid: ctx.params.id }, async (err, res) => {
		if(res === null) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
		file_data = res;
		const responce: MetadataSanitised = {
			id: file_data.uuid,
			filename: file_data.filename,
			type: file_data.type,
			owner: file_data.owner ? file_data.owner : null,
			downloads: file_data.downloads,
			views: file_data.views,
			bytes: file_data.bytes,
			uploaded: file_data.uploaded,
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
