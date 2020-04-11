/**
 * JWTAuthenticate.ts
 * Middleware for authenticating timed JWT's
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-15
 */

import config from "../../res/config.json";
import { TimedJWT } from "../util";

const secret = config.crypt.secret;

/**
 * Validates authorization token and user.
 */
export default async (ctx: any, next: any): Promise<void> => {
	let token: string | null = null;
	// const req = ctx.request.body;
	const db = ctx.db;

	const authorization =
	ctx.headers.authorization ? ctx.headers.authorization : null;

	if(authorization != null) {
		token = ctx.headers.authorization.split(' ')[1];
	} else {
		if(ctx.session.authorization.token != null) {
			token = ctx.session.authorization.token;
		}
	}

	if(token == null) {
		ctx.throw(403, 'No token.');
	} else {
		try {
			const authorization = TimedJWT.verify(token, secret);
			const payload: any | null =
				authorization ? authorization.payload : null;
			let user: any;

			ctx.request.authorization = authorization;


			await db.User.findOne({ email: payload.email },
				async (err, res) => {
				user = await res;
			});

			if(user == null) {
				ctx.throw(403, "Invalid Token");
			}
		}
		catch(err) {
			ctx.throw(err.status || 403, err.text);
		}
	}

	await next();
  };
