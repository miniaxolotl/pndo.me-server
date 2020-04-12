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
import Body from 'koa-body';
import json from 'koa-json'
import session from 'koa-session'
import websocket from 'koa-websocket'

import mongoose from 'mongoose';

import { api, authentication } from "./controller";
import { JWTAuthenticate } from './middleware';

import { UserModel, MetadataModel } from "./model"

import config from "../res/config.json";

/************************************************
 * ANCHOR setup
 ************************************************/

const app: Koa = new Koa();
websocket(app); //! enables websockets

const router: Router = new Router();
const socket_router = new Router();

/************************************************
 * ANCHOR database
 ************************************************/

mongoose.connect(config.db.url, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true }, (err) => {
		console.log(`mongodb connected`, err);
	}
);

mongoose.model(`User`, UserModel);
mongoose.model(`uploads.metadata`, MetadataModel);

app.context.db = mongoose;
app.context.models = mongoose.models;

/************************************************
 * ANCHOR cors
 ************************************************/

const whitelist = config.whitelist;

const checkOriginAgainstWhitelist = (ctx: Koa.DefaultContext): string => {
	const requestOrigin = ctx.accept.headers.origin;
	if (!whitelist.includes(requestOrigin)) {
		return ctx.throw(`🙈 ${requestOrigin} is not a valid origin`);
	}
	return requestOrigin;
}

app.use(cors({
	origin: checkOriginAgainstWhitelist,
	credentials: true,
	allowMethods: [ 'post', 'get', 'put', 'delete' ],
}));

/************************************************
 * ANCHOR middleware
 ************************************************/

app.use(json({ pretty: false, param: 'pretty' }));

app.use(Body({
	formidable: { maxFileSize: 2**32, uploadDir: config.tmp_path },
    multipart: true,
	urlencoded: true,
}));

/************************************************
 * ANCHOR sessions
 ************************************************/

const CONFIG: Partial<session.opts> = {
	key: config.key,
	maxAge: 1000 * 60 * 60 * 24 * 30, /* 30 days */
	overwrite: true, /** (boolean) can overwrite or not (default true) */
	httpOnly: true, /** (boolean) httpOnly or not (default true) */
	signed: true
};

app.keys = config.crypt.keys;
app.use(session(CONFIG, app));

/************************************************
 * ANCHOR auth
 ************************************************/

 app.context.auth = {};
 
/************************************************
 * ANCHOR routes
 ************************************************/
  
{ /* HTTP */
	router.use("/auth", authentication.AuthController.routes());
	{ /* api */
		router.use("/api/user", api.UserController.routes());
		router.use("/api/file", api.FileController.routes());
		router.use("/api/meta", api.MetaController.routes());
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

{ /* WEBSOCKET */
	socket_router.get('/socket', async (ctx: any) => {
		ctx.websocket.send('Hey!');

		ctx.websocket.on('message', function (message) {
			console.log(message);
		});

		console.log(ctx);
	});

	app.use(socket_router.routes()).use(socket_router.allowedMethods());
}

/************************************************
 * ANCHOR start server
 ************************************************/

app.listen(config.port, () => {
	console.log(`Server listening: http://localhost:${config.port}`);
});

