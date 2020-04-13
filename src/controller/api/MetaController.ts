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
import { noContentToProcess } from "../../util/errors";

const router: Router = new Router();

router.all("/filestats", async (ctx: ParameterizedContext) => {
	// const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const file_store = models['uploads.metadata'];

	const query_data = await new Promise<any>(async (res) => {
		file_store.aggregate([{
				$match: {}
			}, {
				$group: {
					_id: "file count",
					bytes: { $sum: "$bytes" },
					count: { $sum: 1 },
					last_insert: { $max: "$uploaded" }
				}
			}], (err, data: any[]) => {

			if(data.length > 0) { res(data); }
			else {
				res();
			}
		});
	});

	if(query_data) { ctx.body = query_data[0]; }
	else {
		ctx.status = noContentToProcess.status;
		ctx.body = noContentToProcess;
	}
});

router.all("/userstats", async (ctx: ParameterizedContext) => {
	// const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const user_store = models['User'];

	const query_data = await new Promise<any>(async (res) => {
		await user_store.aggregate([{
				$match: {}
			}, {
				$group: {
					_id: "user count",
					count: { $sum: 1 },
					last_insert: { $max: "$created" }
				}
			}], (err, data: any[]) => {

			if(data.length > 0) { res(data); }
			else {
				res();
			}
		});
	});

	if(query_data) { ctx.body = query_data[0]; }
	else {
		ctx.status = noContentToProcess.status;
		ctx.body = noContentToProcess;
	}
});

const Controller: Router = router;

export default Controller;
