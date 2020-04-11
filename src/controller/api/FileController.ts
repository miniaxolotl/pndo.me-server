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
import { ResgisterRequest, Metadata, GridFSFile } from "types";
import { invalidBody, serverError } from "../../util/errors";
import { GridFS, connection } from "../../server";
import mongoose from 'mongoose';
import crypto from "crypto";

import { createModel } from 'mongoose-gridfs';

import fs, { createReadStream } from "fs";

const router: Router = new Router();

/*************************** route: /:all ***************************/

router.post("/upload", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).fields;
	const files: ResgisterRequest = (ctx.request as any).files;
	if(!req || !files) { ctx.throw(invalidBody.status, invalidBody); }

	const db = ctx.db;

	const file_hash = crypto.randomBytes(4).toString('hex');
	let metadata_store: any;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
	});

	const readStream = fs.createReadStream(files[0].path);
	const options = ({ filename: files[0].name, contentType: files[0].type })

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

/*************************** route: /:user ***************************/

router.all("/download/:id", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).fields;

	const db = ctx.db;

	let file_data: Metadata;

	const upload_store = createModel({
		modelName: 'uploads',
		connection: db.connection,
	});
	
	await db['uploads.metadata']
	.findOne({ uuid: ctx.params.id }, async (err, res) => {
		if(res === null) {
			// do nothing
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
	});
});

const Controller: Router = router;

export default Controller;
