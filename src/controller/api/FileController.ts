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

import fs, { createReadStream, stat } from "fs";
import request from "request";
import crypto from "crypto";
import path from "path";

import { ResgisterRequest, Metadata, MetadataSanitised, UploadRequest } from "types";
import { invalidBody, serverError,
	resourceNotFound, resourceDeleted, invalidRequest } from "../../util/errors";

import config from "../../../res/config.json";
import { VerifyFileAuthentication, VerifyIdentity } from "../../middleware";

/************************************************
 * ANCHOR routes
 ************************************************/

const router: Router = new Router();

router.post("/upload", VerifyIdentity, async (ctx: ParameterizedContext) => {
	const req: UploadRequest = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;
	
	if(!req
		|| !(ctx.request as any).files
		|| !(ctx.request as any).files.upload_file)
	{ ctx.throw(invalidBody.status, invalidBody); }

	const file: any = (ctx.request as any).files.upload_file;

	const file_hash = crypto.randomBytes(8).toString('hex');

	const tmp_path = file.path;
	const file_path = path.join(config.file_path, file_hash);

	const file_data = await new Promise<Metadata>((resolve, reject) => {
		fs.rename(tmp_path, file_path, async (err) => {
			if(err) { reject(); }

			const file_data: Metadata = {
				hash: file_hash,
				filename: file.name,
				type: file.type,
				bytes: file.size,
				owner: ctx.auth.user
					? ctx.auth.user : null,
				protected: req.protected && ctx.auth.user 
					? req.protected : false,
				hidden: (req.protected == true && ctx.auth.user)
					|| !req.hidden || req.hidden == 'true' || req.hidden == true
					? true : false,
			};
			
			const metadata_store = new models['uploads.metadata'](file_data);
			await metadata_store.save().catch(() => { reject(); });

			resolve(file_data);
		});
	}).catch(() => {
		ctx.throw(serverError.status, serverError);
	});

	ctx.body = file_data;
});

router.post("/upload/url", VerifyIdentity,
	async (ctx: ParameterizedContext) => {

	const req: any = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;
	
	if(!req || !req.resource_url)
	{ ctx.throw(invalidBody.status, invalidBody); }

	const resource: any = req.resource_url;
	const file_hash = crypto.randomBytes(8).toString('hex');
	const file_path = path.join(config.file_path, file_hash)

	var file = fs.createWriteStream(file_path);

	const file_data = await new Promise<any>((res, rej) => {
		request(resource, (err, result, data) => {
			
			if(result.statusCode == 200) {
				const file_type = result.headers["content-type"];
				const file_size = result.headers["content-length"];
				const file_name = result.headers["content-disposition"]
				?.split(';')[1]
				.split('"')[1]
				? result.headers["content-disposition"]
					?.split(';')[1]
					.split('"')[1]
				: path.basename('resource');

				if(file_type && file_name && file_size) {
					file.on('finish', () => {
						file.close();
						res({ file_type, file_name, file_size });
					});
				} else {
					res(null);
				}
			} else {
				res(null);
			}
		}).pipe(file);
	});

	if(file_data) {
		const file_metadata: Metadata = {
			hash: file_hash,
			filename: file_data.file_name,
			type: file_data.file_type,
			bytes: file_data.file_size,
			owner: ctx.auth.user
			? ctx.auth.user : null,
			protected: req.protected && ctx.auth.user 
			? req.protected : false,
			hidden: (req.protected == true && ctx.auth.user)
			|| !req.hidden || req.hidden == 'true' || req.hidden == true
			? true : false,
		};
		
		const metadata_store = new models['uploads.metadata'](file_metadata);
		await metadata_store.save().catch();

		ctx.body = file_metadata;
	} else {
		ctx.status = invalidRequest.status;
		ctx.body = invalidRequest;
	}
});

router.post("/delete/:id", VerifyFileAuthentication,
	async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_path = path.join(config.file_path, ctx.params.id);
	
	await models['uploads.metadata']
	.findOneAndDelete({ hash: ctx.params.id })
	.catch(() => {
		ctx.throw(resourceNotFound.status, resourceNotFound);
	});

	try {
		fs.unlinkSync(file_path);
	} catch(err) {
		ctx.throw(resourceNotFound.status, resourceNotFound);
	}	

	ctx.status = resourceDeleted.status;
	ctx.body = resourceDeleted;
});

router.all("/stream/:id", VerifyFileAuthentication,
	async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_path = path.join(config.file_path, ctx.params.id);

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ hash: ctx.params.id });
	if(!file_data) { ctx.throw(resourceNotFound.status, resourceNotFound); }
	
	try {
		/* check if file exists on filesystem */
		fs.statSync(file_path);
	} catch(err) {
		ctx.throw(resourceNotFound.status, resourceNotFound);
	}

	const range = ctx.headers.range;

	if(range) {
		const parts = range.replace(/bytes=/, "").split("-");
		const start = parseInt(parts[0], 10);
		const end = parts[1] ? parseInt(parts[1], 10) : file_data.bytes - 1;
		const chunk_size = (end-start) + 1;

		if(fs.existsSync(file_path)) {
			const file_stream = fs.createReadStream(file_path, {start, end});
			
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
			ctx.body = resourceNotFound;
		}
	} else {
		{ /* update stats */
			const update_query = {
				downloads: file_data.downloads ? ++file_data.downloads : 1,
			}
			await models['uploads.metadata']
			.updateOne({ hash: ctx.params.id }, update_query);
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
			ctx.body = resourceNotFound;
		}
	}
});

router.all("/download/:id", VerifyFileAuthentication,
	async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_path = path.join(config.file_path, ctx.params.id);

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ hash: ctx.params.id });
	if(!file_data) { ctx.throw(resourceNotFound.status, resourceNotFound); }

	if(fs.existsSync(file_path)) {
		const file_stream = fs.createReadStream(file_path);

		{ /* update stats */
			const update_query = {
				downloads: file_data.downloads ? ++file_data.downloads : 1,
			}
			await models['uploads.metadata']
			.updateOne({ hash: ctx.params.id }, update_query);
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
});

router.all("/download/:id/:filename", VerifyFileAuthentication,
	async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_path = path.join(config.file_path, ctx.params.id);

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ hash: ctx.params.id, filename: ctx.params.filename })
	.catch(() => {
		ctx.throw(resourceNotFound.status, resourceNotFound);
	});

	if(fs.existsSync(file_path)) {
		const readStream = fs.createReadStream(file_path);

		{ /* update stats */
			const update_query = {
				downloads: file_data.downloads ? ++file_data.downloads : 1,
			}
			await models['uploads.metadata']
			.updateOne({ hash: ctx.params.id }, update_query);
		}

		ctx.response.set("content-type", file_data.type);
		ctx.response.set("content-length", file_data.bytes.toString());
		ctx.response.set("accept-ranges", "bytes");
		ctx.response.set("connection", "keep-alive");
		ctx.response.set("content-disposition",
			"inline; filename="+file_data.filename+'"');

		ctx.body = readStream;
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound;
	}
});

router.all("/info/:id", VerifyFileAuthentication,
	 async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ hash: ctx.params.id });
	if(!file_data) { ctx.throw(resourceNotFound.status, resourceNotFound); }

	{ /* update stats */
		const update_query = {
			views: file_data.views ? ++file_data.views : 1,
		}
		await models['uploads.metadata']
		.updateOne({ hash: ctx.params.id }, update_query);
	}

	const responce: MetadataSanitised = {
		hash: file_data.hash,
		filename: file_data.filename,
		type: file_data.type,
		owner: file_data.owner ? file_data.owner : null,
		protected: file_data.protected,
		hidden: file_data.hidden,
		downloads: file_data.downloads,
		views: file_data.views,
		bytes: file_data.bytes,
		uploaded: file_data.uploaded,
		expires: file_data.expires,
	};

	ctx.body = responce;
});

router.all("/search",
	 async (ctx: ParameterizedContext) => {

	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const limit = req.limit ? parseInt(req.limit) : 15;
	const page = req.page ? parseInt(req.page) : parseInt(ctx.query.page);
	const search_key = req.search_key
		? req.search_key.split(' ').join('|')
		: ctx.query.search_key ? ctx.query.search_key : '';

	const query = {
		"filename" : {
			$regex: `.*(${search_key}).*`,
			$options: 'i',
		},
		owner: req.owner,
		protected: false,
		hidden: false,
	};
	
	const query_data = await new Promise<any>(async (res) => {
		const file_list = await models['uploads.metadata']
		.find(query, { _id: 0, __v: 0 })
		.limit(limit)
		.skip((page -1) * limit)
		.catch(() => {
			res();
		});

		res(file_list);
	});

	ctx.body = query_data;
});

const Controller: Router = router;

export default Controller;
