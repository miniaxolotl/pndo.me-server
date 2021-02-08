/**
 * info.controller.ts
 * File info workflows
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created by Elias Mawa on 21-02-04
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import { Connection } from "typeorm";

import { resourceNotFound } from "../../util/status";

import { MetadataModel, UserModel } from "../../model/mysql";

import { fileAccess } from "../../middleware";

import { Metadata } from "types";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.get("/:id", fileAccess, async (ctx: ParameterizedContext) => {
	
	const db: Connection = ctx.mysql;
	
	const file_collection = db.manager.getRepository(MetadataModel);
	const file_data = await file_collection
	.findOne({ file_id: ctx.params.id });
	if(!file_data) {
		ctx.status = resourceNotFound.status;
		ctx.body = resourceNotFound.message;
	} else {
		{ /* update stats */
			const update_query = {
				views: file_data.views ? ++file_data.views : 1,
			}
			await file_collection
			.update({ file_id: ctx.params.id }, update_query);
		}

		const profile_collection = db.manager.getRepository(UserModel);
		
		const profile_data = await profile_collection
		.findOne({ user_id: file_data.user_id! });

		const responce: Metadata = {
			file_id: file_data.file_id,
			sha256: file_data.sha256,
			md5: file_data.md5,
			filename: file_data.filename,
			type: file_data.type,
			user_id: profile_data?.username,
			protected: file_data.protected,
			hidden: file_data.hidden,
			downloads: file_data.downloads,
			views: file_data.views,
			bytes: file_data.bytes,
			create_date: file_data.create_date,
			expires: file_data.expire_date,
		};

		ctx.body = responce;
	}
});

const Controller: Router = router;

export default Controller;