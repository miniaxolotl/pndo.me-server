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
import { system_usage } from "../../util/sys-util";
import { MetadataModel, UserModel, CommentModel } from "../../model/mysql";
import { UploadRequest } from "types";
import { Connection } from "typeorm";
import { resourceNotFound, unauthorizedAccess, noContent, invalidRequest, actionSuccessful, actionUnsuccessful } from "../../util/status";
import { fileAccess, jwt } from "../../middleware";
import crypto from "crypto";

const router: Router = new Router();

router.get("/:id", fileAccess, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	// const file_collection = db.manager.getRepository(MetadataModel);
	const comment_collection = db.manager.getRepository(CommentModel);
	
	// const file = await file_collection.findOne({ file_id: ctx.params.id });
	
	const comments = await comment_collection.find({
		where: {
			file_id: ctx.params.id
		},
		order: {
			create_date: "ASC"
		}
	});

	if(!comments) {
		ctx.status = noContent.status;
		ctx.body = noContent.message;
	} else {
		ctx.body = comments;
	}
});

router.post("/:id", fileAccess, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_collection = db.manager.getRepository(MetadataModel);
	const comment_collection = db.manager.getRepository(CommentModel);
	
	const file = await file_collection.findOne({ file_id: ctx.params.id });
	if(file) {
		const comment_id = crypto.randomBytes(8).toString('hex');

		const comment = new CommentModel();
		comment.message = body.message;
		comment.comment_id = comment_id;
		comment.file_id = file.file_id;
		comment.user_id = ctx.state.user_id;

		if(!body.message) {
			ctx.status = invalidRequest.status;
			ctx.body = invalidRequest.message;
		} else {
			await comment_collection.save(comment);
			ctx.body = comment;
		}
	} else {
		ctx.status = invalidRequest.status;
		ctx.body = invalidRequest.message;
	}
});

router.delete("/:id", jwt.authenticate, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	// const file_collection = db.manager.getRepository(MetadataModel);
	const comment_collection = db.manager.getRepository(CommentModel);

	const comment
		= await comment_collection.findOne({ comment_id: ctx.params.id });
		console.log(comment);
		
	if(comment) {
		const status = await comment_collection.delete({
			comment_id: ctx.params.id,
		});

		if(status.affected && status.affected > 0) {
			ctx.status = actionSuccessful.status;
			ctx.body = actionSuccessful.message;
		} else {
			ctx.status = actionUnsuccessful.status;
			ctx.body = actionUnsuccessful.message;
		}
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	}
});

const Controller: Router = router;

export default Controller;