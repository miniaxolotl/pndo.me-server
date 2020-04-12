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

const router: Router = new Router();

/*************************** route: /:all ***************************/

router.get("/all", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const limit = req.limit ? parseInt(req.limit) : 25;
	const page = Math.abs(req.page ? req.page : 0);

	await models.User.find({},
		{ password: 0, _id: 0, __v: 0 })
	.limit(limit)
	.skip(page * limit)
	.then((res: any[]) => {
		ctx.body = res;
	});
});

/*************************** route: /:user ***************************/

router.get("/", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const query: any = {};
	if(req.email) { query.email = req.email; }
	if(req.profile) { query.profile = req.profile; }

	await  models.User.findOne(query,
		{ password: 0, _id: 0, __v: 0 }).then((res: any[]) => {
		ctx.body = res;
	});
});

router.put("/", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const query: any = {};
	if(req.email) { query.email = req.email; }
	if(req.profile) { query.profile = req.profile; }

	await  models.User.updateOne(query, req).then((res: any[]) => {
		ctx.body = res;
	});
});

router.del("/", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	const query: any = {};
	if(req.email) { query.email = req.email; }
	if(req.profile) { query.profile = req.profile; }

	await  models.User.deleteOne(query).then((res: any) => {
		ctx.body = res;
	});
});

const Controller: Router = router;

export default Controller;
