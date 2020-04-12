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
	const db = ctx.db;

	const metadata_store = db['uploads.metadata'];
	let stats: MetaFile;

	await metadata_store.aggregate([{
			$match: {}
		}, {
			$group: {
				_id: "file count",
				bytes: { $sum: "$bytes" },
				count: { $sum: 1 } 
			}
		}], (err, data) => {

		stats = {
			count: data,
			size: -1,
		}

		ctx.body = data;
		// ctx.body = stats;
	}).then(async (e: any) => {
		// do nothing
	}).catch((e) => {
	});

});

router.all("/userstats", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const db = ctx.db;

	const user_store = db['User'];
	let stats: MetaFile;

	await user_store.aggregate([{
			$match: {}
		}, {
			$group: {
				_id: "user count",
				count: { $sum: 1 } 
			}
		}], (err, data) => {

		stats = {
			count: data,
			size: -1,
		}

		ctx.body = data;
		// ctx.body = stats;
	}).then(async (e: any) => {
		// do nothing
	}).catch((e) => {
	});
});

const Controller: Router = router;

export default Controller;
