/**
 * authentication.controller.ts
 * Controller for handling user authentication (login/logout).
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";
import Router from 'koa-router';

import { LoginSchema, RegisterSchema } from "../schema";
import { UserModel } from "../model/mysql";
import { Connection } from "typeorm";

import crypto from "crypto";
import { AuthenticationResponce, UserData } from "types";
import { bcrypt, TimedJWT } from "../util";

import config from "../../res/config.json";
import { databaseError, duplicateUsername, serverError, unauthorizedAccess, userNotFound, validationError } from "../util/status";

const router: Router = new Router();

/************************************************
 * * routes
 ************************************************/

router.post("/register", async (ctx: ParameterizedContext, next) => {

	const body: UserData = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const { value, error } = RegisterSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = validationError.status;
		ctx.body = { invalid: [] };
		error.details.forEach(e => {
			if(e.context)
				ctx.body.invalid.push(e.context.key);
		});
	} else {
			const form: UserModel = value;
			const user_id = crypto.randomBytes(8).toString('hex');
		const password_hash: string | null
		= await bcrypt.gen_hash(form.password!);
		
		if(!password_hash || !user_id) {
			ctx.status = serverError.status;
			ctx.body = serverError.message;
		} else {
			const user = new UserModel();
			user.user_id = user_id;
			user.email = form.email;
			user.username = form.username!;
			user.password = password_hash;

			const checkUsername = await user_collection
			.findOne({ username: form.username! });
			const checkEmail = await user_collection
			.findOne({ email: form.email! });

			if(checkUsername && checkEmail) {
				ctx.throw(400, "duplicate email & username.");
			} else if(checkUsername) {
				ctx.throw(400, "duplicate username.");
			} else if (checkEmail) {
				ctx.throw(400, "duplicate email.");
			} else {
				const user_data = await user_collection.save(user);
				if(user_data) {
					const payload: UserData = {
						username: user_data.username,
						email: user_data.email,
						user_id: user_data.user_id,
						admin: user_data.admin
					};

					const token = TimedJWT.sign(payload, config.crypt.secret);
					const res: AuthenticationResponce = {
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

router.post("/login", async (ctx: ParameterizedContext) => {

	const body: UserData = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const { value, error } = LoginSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});
	if(error) {
		ctx.status = validationError.status;
		ctx.body = { invalid: [] };
		error.details.forEach(e => {
			if(e.context)
				ctx.body.invalid.push(e.context.key);
		});
	} else {
		const form: UserModel = value;
		const user = await user_collection
			.findOne({ email: form.email! });

		if(user) {
			if(await bcrypt.compare(form.password, user.password)) {
				const payload: UserData = {
					username: user.username,
					email: user.email,
					user_id: user.user_id,
					admin: user.admin
				};
				
				const token = TimedJWT.sign(payload, config.crypt.secret);
				const res: AuthenticationResponce = {
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

const Controller: Router = router;
	
export default Controller;
