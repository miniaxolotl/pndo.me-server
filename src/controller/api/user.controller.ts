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

import { userNotFound, unauthorizedAccess, actionSuccessful, actionUnsuccessful, serverError, validationError } from "../../util/status";

import { ProfileModel } from "../../model/mysql";
import { LoginSchema, RegisterSchema, ProfileUpdateSchema } from "../../schema";

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
	
	if(ctx.auth.username == ctx.params.username) {
		const { value, error } = ProfileUpdateSchema.validate(body);
		
		const profile_repository = db.manager.getRepository(ProfileModel);

		if(error) {
			ctx.status = validationError.status;
			ctx.body = validationError.message;
		} else {

			const profile = await profile_repository
			.findOne({ username: ctx.params.username });

			let password_hash: string | null | undefined = undefined;
			if(value.password) {
				password_hash
				= await bcrypt.gen_hash(validator.escape(body.password!));
				if(!password_hash) {
					password_hash = undefined;
				}
			}

			if(profile) {
				const profile_update = new ProfileModel();
				profile_update.id = profile?.id!;
				// profile_update.password = password_hash!;
				profile_update.display_name 
				= value.display_name 
				&& value.display_name.toLowerCase() == profile.username
				? value.display_name : undefined;
				// profile_update.email = profile?.email!;
				
				const profile_res = await profile_repository
				.save(profile_update)
				.catch((err) => {
					console.log(err);
				});
			} else {
				ctx.status = actionUnsuccessful.status;
				ctx.body = actionUnsuccessful.message;
			}
		}

		const profile_data = await profile_repository
		.findOne({ username: ctx.params.username });

		if(profile_data) {
			const payload: ProfileData = {
				username: profile_data.username,
				profile_id: profile_data.profile_id,
				display_name: profile_data.display_name,
				email: profile_data.email,
				flags: {
					admin: profile_data.admin,
					moderator: profile_data.moderator,
					banned: profile_data.banned,
				},
			};
			
			const token
			= TimedJWT.sign(payload, config.crypt.secret);
			
			const res: AuthResponce = {
				payload,
				authorization: token,
			};
			
			ctx.body = res;
		} else {
			ctx.status = actionUnsuccessful.status;
			ctx.body = actionUnsuccessful.message;
		}
	} else {
		ctx.status = unauthorizedAccess.status;
		ctx.body = unauthorizedAccess.message;
	}
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
