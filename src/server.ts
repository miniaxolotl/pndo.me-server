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

import { UserModel, MetadataModel, FileTimestampModel,
	CommentModel } from "./model"

import config from "../res/config.json";
import { system_usage } from './util/sys-util';

/************************************************
 * ANCHOR setup
 ************************************************/

const koaApp: Koa = new Koa();

const wsOptions = {};
const app = websocket(koaApp, wsOptions); //! enables websockets

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
mongoose.model(`uploads.timestamp`, FileTimestampModel);
mongoose.model(`uploads.comment`, CommentModel);

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
	formidable: { maxFileSize: 2**32, uploadDir: config.temp_store },
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
		router.use("/api/user", JWTAuthenticate, api.UserController.routes());
		router.use("/api/file", api.FileController.routes());
		router.use("/api/meta", api.MetaController.routes());
	}

	{ /* admin */ // TODO
		// router.use("/admin/user", api.UserController.routes());
	}
	
	{ /* conversations / comments */ // TODO
		router.use("/api/comment",
			JWTAuthenticate, api.CommentController.routes());
	}

	app.use(router.routes());
}

{ /* WEBSOCKET */
	const sleep = (ms) => {
		return new Promise((resolve) => {
		  setTimeout(resolve, ms);
		});
	  }   

	{
		socket_router.all('/meta/usage', async (ctx: any) => {

			while(true) { 
				const usage_data = await system_usage();
				const payload = {
					memory_usage: usage_data.memory_usage,
					cpu_usage: usage_data.cpu_usage,
					disk_usage: usage_data.disk_usage,
				};

				ctx.websocket.send(JSON.stringify(payload));
				
				  await sleep(1000);
			}
		});
	}

	app.ws.use(socket_router.routes());
}

/************************************************
 * ANCHOR start server
 ************************************************/

app.listen(config.port, () => {
	console.log(`Server listening: http://localhost:${config.port}`);
});

