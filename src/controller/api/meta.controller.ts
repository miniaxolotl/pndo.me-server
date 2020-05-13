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
import { MetadataModel, ProfileModel } from "../../model/mysql";
import { UploadRequest } from "types";
import { Connection } from "typeorm";

const router: Router = new Router();

router.all("/filestats", async (ctx: ParameterizedContext) => {
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const file_repo = db.manager.getRepository(MetadataModel);
	
	const count = await file_repo.count();
	// const private_count = await file_repo.findAndCount({
	// 	protected: true,
	// })

	const bytes = await file_repo.createQueryBuilder()
		.select("SUM(bytes)", "sum").getRawOne();
	const latest = await file_repo.findOne({
		protected: false,
		hidden: false,
	},{
		order: {
			uploaded: "DESC"
		},
		select: [ "filename", "bytes", "uploaded", "file_id"]
	});

	ctx.body = {
		count: count,
		// private_count: private_count[1],
		bytes: bytes.sum,
		latest,
	}
});

router.all("/userstats", async (ctx: ParameterizedContext) => {
	const body: UploadRequest = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const profile_repo = db.manager.getRepository(ProfileModel);

	const count = await profile_repo.count();
	const latest = await profile_repo.findOne({
		order: {
			id: "DESC"
		},
		select: [ "display_name" ]
	});
	
	ctx.body = {
		count: count,
		latest
	}
});

router.all("/usage", async (ctx: ParameterizedContext) => {
	const usage_data = await system_usage();
	const payload = {
		memory_usage: usage_data.memory_usage,
		cpu_usage: usage_data.cpu_usage,
		disk_usage: usage_data.disk_usage,
	};

	ctx.body = payload;
});

router.all("/full_usage", async (ctx: ParameterizedContext) => {
	ctx.body = await system_usage();
});

const Controller: Router = router;

export default Controller;