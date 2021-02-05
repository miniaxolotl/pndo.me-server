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

import { UserModel } from "../../model/mysql";
import { LoginSchema, RegisterSchema, UserUpdateSchema } from "../../schema";

import { bcrypt, TimedJWT } from "../../util";
import { UserData, AuthenticationResponce } from "types";

import config from "../../../res/config.json";
import { jwt } from "../../middleware";

const router: Router = new Router();

/************************************************
 * ANCHOR routes
 ************************************************/

router.get("/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const user = await user_collection
	.findOne({
		where: {
			user_id: ctx.params.id,
		},
		select: [ "username", "banned", "admin", "user_id" ]
	});

	if(user) {
		ctx.body = user;
	} else {
		ctx.status = userNotFound.status;
		ctx.body = userNotFound.message;
	}
});

router.get("/username/:id", async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const user = await user_collection
	.findOne({
		where: {
			username: ctx.params.id,
		},
		select: [ "username", "banned", "admin", "user_id" ]
	});

	if(user) {
		ctx.body = user;
	} else {
		ctx.status = userNotFound.status;
		ctx.body = userNotFound.message;
	}
});

router.patch("/:id", jwt.authenticate, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const user_collection = db.manager.getRepository(UserModel);
	
	if((ctx.state.user_id == ctx.params.id) || ctx.state.admin) {
		const { value, error } = UserUpdateSchema.validate(body);
		if(error) {
			ctx.status = validationError.status;
			ctx.body = validationError.message;
		} else {
			let password_hash: string | null | undefined = undefined;
			if(value.password) {
				password_hash
				= await bcrypt.gen_hash(validator.escape(body.password!));
				if(!password_hash) {
					password_hash = undefined;
				}
			}

			const user_update = new UserModel();
			user_update.username = body?.username;
			user_update.password = password_hash!;
			user_update.email = body?.email;
			
			const update_res = await user_collection
			.save(user_update)
			.catch((err) => {
				console.log(err);
			});
		}
		{
			const user = await user_collection
				.findOne({ user_id: ctx.state.user_id });
	
			if(user) {
				const payload: UserData = {
					username: user.username,
					email: user.email,
					user_id: user.user_id,
					admin: user.admin,
					banned: user.banned
				};
				
				const token
					= TimedJWT.sign(payload, config.crypt.secret);
				const res: AuthenticationResponce = {
					payload,
					authorization: token,
				};

				ctx.body = res;
			} else {			
				ctx.status = userNotFound.status;
				ctx.body = userNotFound.message;
			}
		}
	} else {
		ctx.status = unauthorizedAccess.status;
		ctx.body = unauthorizedAccess.message;
	}
});

router.delete("/:id", jwt.authenticate, async (ctx: ParameterizedContext) => {
	const body: any = ctx.request.body;
	const db: Connection = ctx.mysql;

	const user_collection = db.manager.getRepository(UserModel);

	if((ctx.params.id == ctx.state.user_id) || ctx.state.admin) {
		const user = await user_collection
		.delete({ user_id: ctx.params.id });

		if(user) {
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
