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
import { auth_responce_t } from "types";
const router: Router = new Router();

const errorWrongAuthentication = "Incorrect email and/or password.";
const errorNull = "Authorization fields must not be null.";
const errorDuplicate = "Duplicate email address.";

router.post("/login", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const db = ctx.db;
	let user: any = null;

	if(req || (!req.password || !req.email)) {
		ctx.throw(401, errorNull);
	}

	await db.User.findOne({ email: req.email }, async (err, res) => {
		if(res === null)
		{
			// do nothing
		}
		else
		{
			user = res;
		}
	});

	if(user === null)
	{
		ctx.throw(401, errorWrongAuthentication);
	}
	else
	{
		if(await bcrypt.compare(req.password, user.password))
		{
			const payload = {
				email: user.email
			};

			const token = TimedJWT.sign(payload, config.crypt.secret);

			const responce: auth_responce_t = {
				user: {
					profile: user.profile,
					email: user.email,
					name: user.name
				},
				authorization: token,
			};

			{
				ctx.session.profile = user.profile;
				ctx.session.email = user.email;
				ctx.session.name = user.name;

				ctx.body = responce;

				ctx.cookies.set('authorized', 'true', {httpOnly: false});
				ctx.cookies.set('name', user.name, { httpOnly: false });
			}
		}
		else
		{
			ctx.throw(401, errorWrongAuthentication);
		}
	}
});

router.post("/register", async (ctx: ParameterizedContext) => {
	const req = ctx.request.body;
	const db = ctx.db;

	let password_hash: string | null = null;

	const profile_hash = crypto.randomBytes(4).toString('hex');

	if(!req.name || !req.email || !req.password || !profile_hash) {
		ctx.throw(401, "dsa");
	}

	await bcrypt.gen_hash(req.password)
	.then((hash: string) => { password_hash = hash });

	if(password_hash) {
		const user_data = {
			profile: profile_hash,
			email: req.email,
			name: req.name,
			password: password_hash
		};

		const user = db.User(user_data);

		await user.save().then(async (e: any) => {
			if(e) {
				console.log(e);
			}

			const payload = {
				email: user.email
			};

			const token = TimedJWT.sign(payload, config.crypt.secret);

			const responce: auth_responce_t = {
				user: {
					profile: user.profile,
					email: user.email,
					name: user.name
				},
				authorization: token,
			};

			ctx.body = responce;

			ctx.session.authorization = {
				token,
				email: user.email,
				name: user.name,
			}

			{
				ctx.session.profile = user.profile;
				ctx.session.email = user.email;
				ctx.session.name = user.name;

				ctx.body = responce;

				ctx.cookies.set('authorized', 'true', { httpOnly: false });
				ctx.cookies.set('name', user.name, { httpOnly: false });
			}
		}).catch(() => {
			ctx.throw(401, errorDuplicate);
		});
	} else {
		if(!req.username || !req.password) {
			ctx.throw(501);
		}
	}
});


const AuthController: Router = router;

export default AuthController;
