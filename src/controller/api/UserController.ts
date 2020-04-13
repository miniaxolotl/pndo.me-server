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
import { SanitisedUserPayload } from "types";
import { resourceNotFound, noContentToProcess, invalidRequest } from "../../util/errors";

const router: Router = new Router();

/*************************** route: /:user ***************************/

router.all("/:id/files", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const limit = parseInt(req.limit);
	const page = parseInt(req.page);

	if((limit < 0) || (page < 0)) {
		ctx.status = invalidRequest.status;
		ctx.body = invalidRequest;
	} else {
		if(ctx.params.id) {
			const file_store = models['uploads.metadata'];
			const query_data = await new Promise<any>(async (res) => {
				const file_list = await file_store
				.find({ owner: ctx.auth.user }, { _id: 0, __v: 0 })
				.limit(limit)
				.skip((page -1) * limit)
				.catch(() => {
					res();
				});
				
				res(file_list);
			});
			
			if(query_data) {
				ctx.body = query_data;
			} else {
				ctx.status = noContentToProcess.status;
				ctx.body = noContentToProcess;
			}
		}
	}
});

router.all("/:id", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	if(ctx.params.id) {
		const query: any = { profile: ctx.auth.profile };
		const filter: any =  { password: 0, _id: 0, __v: 0, flags: 0 };
	
		const user_data: SanitisedUserPayload
			= await models.User.findOne(query, filter);

		ctx.body = user_data;
	} else {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound;
	}
});

const Controller: Router = router;

export default Controller;
