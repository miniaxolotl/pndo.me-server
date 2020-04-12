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
import { MetaFile } from "types";

const router: Router = new Router();

router.all("/filestats", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const metadata_store = models['uploads.metadata'];
	let stats: MetaFile;

	await metadata_store.aggregate([{
			$match: {}
		}, {
			$group: {
				_id: "file count",
				bytes: { $sum: "$bytes" },
				count: { $sum: 1 },
				last_insert: { $max: "$uploaded" }
			}
		}], (err, data) => {

		stats = {
			count: data,
			size: -1,
		}

		ctx.body = data[0];
		// ctx.body = stats;
	}).then(async (e: any) => {
		// do nothing
	}).catch((e) => {
	});

});

router.all("/userstats", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const user_store = models['User'];
	let stats: MetaFile;

	await user_store.aggregate([{
			$match: {}
		}, {
			$group: {
				_id: "user count",
				count: { $sum: 1 },
				last_insert: { $max: "$created" }
			}
		}], (err, data) => {

		stats = {
			count: data,
			size: -1,
		}

		ctx.body = data[0];
		// ctx.body = stats;
	}).then(async (e: any) => {
		// do nothing
	}).catch((e) => {
	});
});

const Controller: Router = router;

export default Controller;
