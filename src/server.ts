/**
 * server.ts
 * Entrypoint & configuration for server.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import Koa from 'koa';
import cors from '@koa/cors';
import Router from 'koa-router';
import Body from 'koa-body';
import json from 'koa-json'
import websocket from 'koa-websocket'

import "reflect-metadata";
import { createConnection } from "typeorm";

import { auth, api } from "./controller/";

import config from "../res/config.json";
import { invalidRequest } from './util/status';

import * as ModelsMysql from './model/mysql';
import * as ModelsMongo from './model/mongo';

import { jwtAuthenticate, jwtIdentify } from './middleware';
import { system_usage } from './util/sys-util';

/************************************************
 * ANCHOR setup
 ************************************************/

const koaApp: Koa = new Koa();

const wsOptions = {};
const app = websocket(koaApp, wsOptions);

const router: Router = new Router();
const socket_router = new Router();

/************************************************
 * ANCHOR database
 ************************************************/

/**** mongo *****/

(async () => {
	createConnection({
		type: "mongodb",
		host: config.db.mongo.url,
		port: config.db.mongo.port,
		username: config.db.mongo.username,
		password: config.db.mongo.password,
		database: config.db.mongo.schema,
		entities: [
			ModelsMongo.FileTimestampModel,
		],
		useUnifiedTopology: true,
		authSource: "admin",
		synchronize: true,
	}).then((connection) => {
		app.context.mongo = connection;
		console.log("connected to database: mongodb");
	}).catch((error) => {
		console.log(error);
	});
})();

/**** mysql *****/

(async () => {
	createConnection({
		type: "mysql",
		host: config.db.mysql.url,
		port: config.db.mysql.port,
		username: config.db.mysql.username,
		password: config.db.mysql.password,
		database: config.db.mysql.schema,
		entities: [
			ModelsMysql.ProfileModel,
			ModelsMysql.MetadataModel,
			ModelsMysql.CommentModel,
		],
		synchronize: true,
	}).then((connection) => {
		app.context.mysql = connection;
		console.log("connected to database: mysql");
	}).catch((error) => {
		console.log(error);
	});
})();

/************************************************
 * ANCHOR services
 ************************************************/

 // ! TODO

/************************************************
 * ANCHOR cors
 ************************************************/

const whitelist = config.whitelist;

const checkOriginAgainstWhitelist = (ctx: Koa.DefaultContext): string => {
	const requestOrigin = ctx.accept.headers.origin;
	if (!whitelist.includes(requestOrigin)) {
		ctx.body = `🙈 ${requestOrigin} is not a valid origin`;
		ctx.status = invalidRequest.status;
		
		return JSON.stringify(invalidRequest.message);
	}
	return requestOrigin;
}

app.use(cors({
	origin: checkOriginAgainstWhitelist,
	credentials: true,
	allowMethods: [ 'post', 'get', 'put', 'patch', 'delete' ],
}));

/************************************************
 * ANCHOR middleware
 ************************************************/

app.use(json({ pretty: false, param: 'pretty' }));

app.use(Body({
	formidable: { maxFileSize: 2**32, uploadDir: config.data_dir },
    multipart: true,
	urlencoded: true,
}));

/************************************************
 * ANCHOR auth
 ************************************************/

 app.context.auth = {};
 
/************************************************
 * ANCHOR routes
 ************************************************/
  
{ /* HTTP */
	router.use("/auth", auth.routes());

	{ /* api */
		router.use("/api/user", jwtIdentify, api.UserController.routes());
		router.use("/api/comment", jwtIdentify, api.CommentController.routes());
		router.use("/api/file", api.FileController.routes());
		router.use("/api/meta", api.MetaController.routes());
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

	app.ws.use(socket_router.routes() as any);
}

/************************************************
 * ANCHOR start server
 ************************************************/

app.listen(config.port, () => {
	console.log(`Server listening: http://localhost:${config.port}`);
});

