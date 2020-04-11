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

import crypto from "crypto";
import { bcrypt } from "../../util";
import TimedJWT from "../../util/timed-jwt";

import config from "../../../res/config.json"
import { AuthenticationResponce, ResgisterRequest, UserData, UserPayload } from "types";
import { invalidCredentials, invalidForm, serverError, duplicateUsername, invalidBody } from "../../util/errors";

const router: Router = new Router();

router.post("/login", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).fields;
	if(!req) { ctx.throw(invalidBody.status, invalidBody); }

	const db = ctx.db;
	let user: any = null;

	if(!req.username || !req.password) {
		/* validate username/password */
		ctx.throw(invalidForm.status, invalidForm);
	}  else {
		/* find user in database */
		await db.User.findOne({ username: req.username }, async (err, res) => {
			if(res === null) {
				// do nothing
			} else {
				user = res;
			}
		});

		if(user === null) {
			/* validate user */
			ctx.throw(invalidCredentials.status, invalidCredentials);
		} else {
			/* create token */
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
			}
			else
			{
				ctx.throw(invalidCredentials.status, invalidCredentials);
			}
		}
	}
});

router.post("/register", async (ctx: ParameterizedContext) => {
	const req: ResgisterRequest = (ctx.request as any).fields;
	if(!req) { ctx.throw(invalidBody.status, invalidBody); }

	const db = ctx.db;
	
	if(!req.username || !req.password) {
		/* validate username/password */
		ctx.throw(invalidForm.status, invalidForm);
	}  else {
		/* create password hash */
		const profile_hash = crypto.randomBytes(8).toString('hex');
		const password_hash: string | null
			= await bcrypt.gen_hash(req.password);
		
		if(!profile_hash) {
			/* validate password hash */
			ctx.throw(serverError.status, serverError);
		} else {
			/* add user to database */
			const user_data: UserData = {
				profile: profile_hash,
				username: req.username,
				password: password_hash
			};
			
			const user = db.User(user_data);
			
			await user.save().then(async (e: any) => {
				const payload: UserPayload = {
					profile: user.profile,
					username: user.username,
				};
				const token = TimedJWT.sign(payload, config.crypt.secret);
				const responce: AuthenticationResponce = {
					user: payload,
					authorization: token,
				};
				ctx.body = responce;
			}).catch(() => {
				ctx.throw(duplicateUsername.status, duplicateUsername);
			});
		}
	}
});

const Controller: Router = router;

export default Controller;
