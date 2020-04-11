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
import { unauthorizedAccess } from "util/errors";
import { UserPayload } from "types";

const secret = config.crypt.secret;

/**
 * Validates authorization token and user.
 */
export default async (ctx: any, next: any): Promise<void> => {
	const token = ctx.headers.authorization;
	const db = ctx.db;

	if(token == null) {
		ctx.throw(unauthorizedAccess.status, unauthorizedAccess);
	} else {
		try {
			const authorization = TimedJWT.verify(token, secret);
			const payload: UserPayload | null =
				authorization ? authorization.payload : null;
			let user: any;

			await db.User.findOne({ username: payload?.username },
				async (err, res) => {
				user = await res;
			});

			if(user == null) {
				ctx.throw(unauthorizedAccess.status, unauthorizedAccess);
			} else {
				ctx.request.authorization = authorization;
			}
		}
		catch(err) {
			ctx.throw(err.status || 403, err.text);
		}
	}

	
	await next();
  };
