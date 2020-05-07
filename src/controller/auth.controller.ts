/**
 * auth.controller.ts
 * Controller for handling user authentication (login/logout).
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import { Connection } from "typeorm";
import validator from "validator";


import { ProfileModel } from "../model/mysql";
import { ProfileSchema } from "../schema/mysql";

import { bcrypt } from "../util";
import TimedJWT from "../util/timed-jwt";

import { serverError, duplicateUsername, validationError, databaseError, unauthorizedAccess, userNotFound } from "../util/status";

import { ProfileData, AuthResponce} from "types";
import config from "../../res/config.json";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/


router.post("/login", async (ctx: ParameterizedContext) => {
	const body: ProfileData = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const profile_repository = db.manager.getRepository(ProfileModel);

	const { value, error } = ProfileSchema.validate(body);

	if(error) {
		ctx.status = validationError.status;
		ctx.body = validationError.message;
	} else {
		const v_profile: ProfileData = value;

		const profile_res = await profile_repository
			.findOne({ username: v_profile.username! });

		if(profile_res && v_profile.username && v_profile.password) {
			if(await bcrypt.compare(v_profile.password, profile_res.password)) {
				const payload: ProfileData = {
					username: profile_res.username,
					display_name: profile_res.display_name,
					flags: {
						admin: profile_res.admin,
						moderator: profile_res.moderator,
						banned: profile_res.banned,
					},
				};
				
				const token = TimedJWT.sign(payload, config.crypt.secret);

				const res: AuthResponce = {
					payload,
					authorization: token,
				};

				ctx.body = res;
			} else {
				ctx.status = unauthorizedAccess.status;
				ctx.body = unauthorizedAccess.message;
			}

		} else {
			ctx.status = userNotFound.status;
			ctx.body = userNotFound.message;
		}
	}
});

router.post("/register", async (ctx: ParameterizedContext) => {
	const body: ProfileData = ctx.request.body;
	const db: Connection = ctx.mysql;

	const { value, error } = ProfileSchema.validate(body);

	if(error) {
		ctx.status = validationError.status;
		ctx.body = validationError.message;
	} else {
		const password_hash: string | null
		= await bcrypt.gen_hash(validator.escape(body.password!));

		if(!password_hash) {
			ctx.status = serverError.status;
			ctx.body = serverError.message;
		} else {
			const v_profile: ProfileData = value;
			const profile = new ProfileModel();
			profile.username = body.username!;
			profile.password = password_hash;
			profile.display_name = v_profile.username!;

			const profile_repo = db.manager.getRepository(ProfileModel);

			const dupeStatus = await profile_repo
			.findOne({ username: body.username! });

			if(dupeStatus) {
				ctx.status = duplicateUsername.status;
				ctx.body = duplicateUsername.message;
			} else {
				const profile_res = await profile_repo
				.save(profile)
				.catch(() => {
					ctx.status = serverError.status;
					ctx.body = serverError.message;
				});
				
				if(profile_res) {
					const payload: ProfileData = {
						username: profile_res.username,
						display_name: profile_res.display_name,
						flags: {
							admin: profile_res.admin,
							moderator: profile_res.moderator,
							banned: profile_res.banned,
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
					ctx.status = databaseError.status;
					ctx.body = databaseError.message;
				}
			}
		}
	}
});

const Controller: Router = router;
	
export default Controller;
