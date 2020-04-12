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

import mongoose from 'mongoose';

import crypto from "crypto";

import { bcrypt } from "../../util";
import TimedJWT from "../../util/timed-jwt";
import { AuthenticationResponce, UserData, UserPayload } from "types";
import config from "../../../res/config.json"
import { invalidCredentials, invalidForm,
	serverError, duplicateUsername, invalidBody } from "../../util/errors";

/************************************************
 * ANCHOR routes
 ************************************************/

const router: Router = new Router();

router.post("/login", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	if(!req) { ctx.throw(invalidBody.status, invalidBody); }

	if(!req.username || !req.password) {
		/* validate username/password */
		ctx.throw(invalidForm.status, invalidForm);
	}  else {
		/* find user in database */
		const user: UserData
			= await new Promise<UserData>(async (res, rej) => {

			await models.User.findOne({ username: req.username },
				async (err, data) => {

				if(res === null) {
					rej();
				} else {
					res(data);
				}
			});
		}).catch(() => {
			ctx.throw(invalidCredentials.status, invalidCredentials);
		});

		/* create jwt */
		if(await bcrypt.compare(req.password, user.password)) {
			const payload: UserPayload = {
				username: user.username,
				profile: user.profile
			};
			const token = TimedJWT.sign(payload, config.crypt.secret);
			const responce: AuthenticationResponce = {
				user: payload,
				authorization: token,
			};

			ctx.body = responce;
		} else {
			ctx.throw(invalidCredentials.status, invalidCredentials);
		}
	}
});

router.post("/register", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const models: { [index: string]: mongoose.Model<any, {}> } = ctx.models;

	if(!req) { ctx.throw(invalidBody.status, invalidBody); }

	if(!req.username || !req.password) {
		/* validate username/password */
		ctx.throw(invalidForm.status, invalidForm);
	}  else {
		/* create password hash */
		const profile_hash = crypto.randomBytes(8).toString('hex');
		const password_hash: string | null
			= await bcrypt.gen_hash(req.password);
		
		if(!profile_hash) { ctx.throw(serverError.status, serverError); }

		const user_data: UserData = {
			profile: profile_hash,
			username: req.username,
			password: password_hash
		};
		
		const user_store = new models.User(user_data);
		
		await user_store.save().catch(() => {
			ctx.throw(duplicateUsername.status, duplicateUsername);
		});
		
		const payload: UserPayload = {
			profile: user_store.profile,
			username: user_store.username,
		};
		const token = TimedJWT.sign(payload, config.crypt.secret);
		const responce: AuthenticationResponce = {
			user: payload,
			authorization: token,
		};

		ctx.body = responce;
	}
});

const Controller: Router = router;

export default Controller;
