/**
 * server.ts
 * Entrypoint for server.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import Koa, { ParameterizedContext } from 'koa';
import cors from '@koa/cors';
import Router from 'koa-router';
import BodyParser from 'koa-bodyparser';
import json from 'koa-json'
import session from 'koa-session'

import mongoose from 'mongoose';

import { AuthController } from "./controller/Authentication";
import { UserModel } from "./model"

import config from "../res/config.json";
import { UserController } from './controller/api';
import { JWTAuthenticate } from './middleware';

/*****************************
 * setup
 *****************************/

const app: Koa = new Koa();
const router: Router = new Router();

/*****************************
 * database
 *****************************/

mongoose.connect(config.db.url, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true }, (err) => {
		// console.log(`mongodb connected`, err);
	}
);

mongoose.model(`User`, UserModel);

const Models = mongoose.models;
app.context.db = Models;

/*****************************
 * cors
 *****************************/

const whitelist = config.whitelist;

const checkOriginAgainstWhitelist = (ctx: Koa.DefaultContext): string => {
	const requestOrigin = ctx.accept.headers.origin;
	if (!whitelist.includes(requestOrigin)) {
		return ctx.throw(`🙈 ${requestOrigin} is not a valid origin`);
	}
	return requestOrigin;
}

/*****************************
 * middleware
 *****************************/

app.use(json({ pretty: false, param: 'pretty' }))
app.use(BodyParser());
app.use(cors({
	origin: checkOriginAgainstWhitelist,
	credentials: true,
	allowMethods: [ 'post', 'get', 'put', 'delete' ],
}));

/*****************************
 * sessions
 *****************************/

const CONFIG: Partial<session.opts> = {
	key: config.key,
	maxAge: 1000 * 60 * 60 * 24 * 30, /* 30 days */
	overwrite: true, /** (boolean) can overwrite or not (default true) */
	httpOnly: true, /** (boolean) httpOnly or not (default true) */
	signed: true
};

app.keys = config.crypt.keys;
app.use(session(CONFIG, app));

/*****************************
 * auth
 *****************************/

/*****************************
 * routes
 *****************************/
{
	router.use("/auth", AuthController.routes());
	{ /* api */
		router.use("/api/user", UserController.routes());
		router.use("/admin/user", JWTAuthenticate, UserController.routes());
	}
	// router.use("/api", Controller.Api);

	router.get('/hello', async (ctx: ParameterizedContext) => {
		// ignore favicon
		if (ctx.path === '/favicon.ico') return;

		let n = ctx.session.views || 0;
		ctx.session.views = ++n;
		ctx.body = n + ' views';
		ctx.body = 'Hello World!';
	});

	app.use(router.routes());
}
/*****************************
 * fin
 *****************************/

app.listen(config.port, () => {
	console.log(`Server listening: http://localhost:${config.port}`);
});

