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
import { MetadataModel, ProfileModel, CommentModel } from "../../model/mysql";
import { UploadRequest } from "types";
import { Connection } from "typeorm";
import { resourceNotFound, unauthorizedAccess, noContent, invalidRequest, actionSuccessful, actionUnsuccessful } from "../../util/status";

const router: Router = new Router();

router.get("/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_repo = db.manager.getRepository(MetadataModel);
	const comment_repo = db.manager.getRepository(CommentModel);
	
	const file_data = await file_repo.findOne({ file_id: ctx.params.id });
	
	if(!file_data
	|| (file_data.protected && (file_data.profile_id != ctx.auth.profile_id))) {
		if(!file_data) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound.message;
		} else {

			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess.message;
		}
	} else {
		const comments = await comment_repo.find({
			where: {
				file_id: ctx.params.id
			},
			order: {
				created: "ASC"
			}
		});

		if(!comments) {
			ctx.status = noContent.status;
			ctx.body = noContent.message;
		} else {
			ctx.body = comments;
		}
	}
});

router.post("/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_repo = db.manager.getRepository(MetadataModel);
	const comment_repo = db.manager.getRepository(CommentModel);
	
	const file_data = await file_repo.findOne({ file_id: ctx.params.id });
	
	if(!file_data
	|| (file_data.protected && (file_data.profile_id != ctx.auth.profile_id))) {
		if(!file_data) {
			ctx.status = resourceNotFound.status;
			ctx.body = resourceNotFound;
		} else {
			ctx.status = unauthorizedAccess.status;
			ctx.body = unauthorizedAccess;
		}
	} else {
		const comment = new CommentModel();
		comment.message = body.message;
		comment.file_id = file_data.file_id;
		comment.profile_id = ctx.auth.profile_id;

		if(!body.message) {
			ctx.status = invalidRequest.status;
			ctx.body = invalidRequest.message;
		} else {
			await comment_repo.save(comment);

			ctx.body = comment;
		}
	}
});

router.delete("/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const file_repo = db.manager.getRepository(MetadataModel);
	const comment_repo = db.manager.getRepository(CommentModel);
	
	const file_data = await file_repo.findOne({ file_id: ctx.params.id });

	// if(!file_data
	// || (file_data.protected && (file_data.profile_id != ctx.auth.profile_id))) {
	// 	if(!file_data) {
	// 		ctx.status = resourceNotFound.status;
	// 		ctx.body = resourceNotFound.message;
	// 	} else {
	// 		ctx.status = unauthorizedAccess.status;
	// 		ctx.body = unauthorizedAccess.message;
	// 	}
	// } else {
		const status = await comment_repo.delete({
			id: ctx.params.id,
		});

		if(status.affected && status.affected > 0) {
			ctx.status = actionSuccessful.status;
			ctx.body = actionSuccessful.message;
		} else {
			ctx.status = actionUnsuccessful.status;
			ctx.body = actionUnsuccessful.message;
		}
	// }
});

const Controller: Router = router;

export default Controller;