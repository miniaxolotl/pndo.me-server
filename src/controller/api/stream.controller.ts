/**
 * stream.controller.ts
 * File streaming workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 21-02-04
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import fs from "fs";
import path from "path";

import { Connection } from "typeorm";

import { serverError, resourceNotFound } from "../../util/status";

import { FileTimestampModel } from "../../model/mongo";
import { MetadataModel } from "../../model/mysql";

import { jwt } from "../../middleware";

import config from "../../../res/config.json";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.all("/:id", jwt.identify, async (ctx: ParameterizedContext) => {

	const db: Connection = ctx.mysql;
	
	const file_collection = db.manager.getRepository(MetadataModel);

	const file_path = path.join(config.data_dir, ctx.params.id);
	const file_data = await file_collection.findOne({ file_id: ctx.params.id });
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
				
				file_stream.on("error", e => void(0));
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
					await file_collection
					.update({ file_id: ctx.params.id }, update_query);

					const file_timestamp_collection
					= ctx.mongo.manager.getRepository(FileTimestampModel);

					const file_timestamp = new FileTimestampModel();
					file_timestamp.file_id = ctx.params.id;
					file_timestamp.user_id = ctx.state.profile_id;

					await file_timestamp_collection
					.save(file_timestamp)
					.catch((err) => {
						// do nothing
					});
				}	
				
				{ /* set headers */
					ctx.response.set("connection", "keep-alive");
					ctx.response.set("content-length", file_data.bytes.toString());
					ctx.response.set("content-type", file_data.type);
					ctx.response.set("content-disposition",
					"inline; filename=\""+file_data.filename+'"');
				}
				
				if(fs.existsSync(file_path)) {
					const file_stream = fs.createReadStream(file_path)
					file_stream.on("error", e => void(0));
					ctx.status = 200;
					ctx.body = file_stream;
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

const Controller: Router = router;

export default Controller;