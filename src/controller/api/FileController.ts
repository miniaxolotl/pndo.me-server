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

const router: Router = new Router();

/*************************** route: /:all ***************************/

router.get("/all", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const db = ctx.db;

	const limit = req.limit ? parseInt(req.limit) : 25;
	const page = Math.abs(req.page ? req.page : 0);

	await db.User.find({},
		{ password: 0, _id: 0, __v: 0 })
	.limit(limit)
	.skip(page * limit)
	.then((res: any[]) => {
		ctx.body = res;
		console.log(res);
	});
});

/*************************** route: /:user ***************************/

const Controller: Router = router;

export default Controller;
