/**
 * user.controller.ts
 * Controller for handling users.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import { Connection } from "typeorm";
import validator from "validator";

import { userNotFound, unauthorizedAccess, actionSuccessful, actionUnsuccessful, serverError } from "../../util/status";

import { ProfileModel } from "../../model/mysql";
import { LoginSchema, RegisterSchema } from "../../schema";

import { bcrypt, TimedJWT } from "../../util";
import { ProfileData, AuthResponce } from "types";

import config from "../../../res/config.json";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.get("/:username", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const profile_repository = db.manager.getRepository(ProfileModel);
	const profile = await profile_repository
	.findOne({ username: ctx.params.username });

	if(profile) {
		if(profile.username == ctx.auth.username) {
			delete profile.id;
			delete profile.password;

			ctx.body = profile;
		} else {
			delete profile.id;
			delete profile.username;
			delete profile.password;

			ctx.body = profile;
		}
	} else {
		ctx.status = userNotFound.status;
		ctx.body = userNotFound.message;
	}
});

router.patch("/:username", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	ctx.body = "todo";
});

router.delete("/:username", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const profile_repository = db.manager.getRepository(ProfileModel);

	if(ctx.params.username == ctx.auth.username) {
		const profile = await profile_repository
		.delete({ username: ctx.params.username });

		if(profile) {
			ctx.status = actionSuccessful.status;
			ctx.body = actionSuccessful.message;
		} else {
			ctx.status = actionUnsuccessful.status;
			ctx.body = actionUnsuccessful.message;
		}
	} else {
		ctx.status = unauthorizedAccess.status;
		ctx.body = unauthorizedAccess.message;
	}
});

const Controller: Router = router;

export default Controller;
