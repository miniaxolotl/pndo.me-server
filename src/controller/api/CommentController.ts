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
import mongoose from "mongoose";
import { noContentToProcess, invalidRequest, unauthorizedAccess, resourceNotFound, resourceDeleted } from "../../util/errors";
import { JWTAuthenticate } from "../../middleware";
import { ThreadComment, Metadata } from "types";
import crypto from "crypto";

const router: Router = new Router();

router.all("/:id", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ file_id: ctx.params.id });
	
	if(!file_data
	|| (file_data.protected && (file_data.owner != ctx.auth.user))) {
		if(!file_data) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {

			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess;
		}
	} else {
		const query = {
			form_id: ctx.params.id,
		};
		
		const filter = {
			__v: 0,
			_id: 0,
		};
		
		const comment_list = await models['uploads.comment']
		.find(query, filter)
		.sort({ created: -1 });
		
		if(!comment_list) {
			ctx.status = noContentToProcess.status;
			ctx.body = noContentToProcess;
		} else {
			ctx.body = comment_list;
		}
	}
});

router.all("/:id/create", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ file_id: ctx.params.id });
	
	if(!file_data
	|| (file_data.protected && (file_data.owner != ctx.auth.user))) {
		if(!file_data) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {

			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess;
		}
	} else {
		const comment_hash = crypto.randomBytes(8).toString('hex');

		const comment_data: ThreadComment = {
			comment_id: comment_hash,
			form_id: ctx.params.id,
			message: req.message,
			sender: ctx.auth.user,
		};
		
		const comment_store
			= new models['uploads.comment'](comment_data);
		const status = new Promise((res, rej) => {
			comment_store.save()
			.catch((err) => {
				res();
			});
			res(comment_data);
		});

		if(!status || !req.message) {
			ctx.status = invalidRequest.status;
			ctx.body = invalidRequest;
		} else {
			ctx.body = comment_data;
		}
	}
});

router.all("/:id/delete", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_data: Metadata = await models['uploads.metadata']
	.findOne({ file_id: ctx.params.id });
	
	if(!file_data
	|| (file_data.protected && (file_data.owner != ctx.auth.user))) {
		if(!file_data) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess;
		}
	} else {
		const comment_store = await models['uploads.comment']
		.deleteOne({ form_id: ctx.params.id, comment_id: req.comment_id });

		if(comment_store.deletedCount && comment_store.deletedCount > 0) {
			ctx.status = resourceDeleted.status;
			ctx.body = resourceDeleted;
		} else {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		}
	}
});

const Controller: Router = router;

export default Controller;
