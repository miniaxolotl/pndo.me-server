/**
 * server.ts
 * Entrypoint & configuration for server.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import Koa from 'koa';

import CORS from '@koa/cors';
import Router from 'koa-router';
import Body from 'koa-body';
import KoaJSON from 'koa-json';
import websockify from 'koa-websocket'

import { createConnection } from "typeorm";
import * as ModelsMysql from './model/mysql';
import * as ModelsMongo from './model/mongo';

import { api, authentication } from "./controller";
import { jwt }  from "./middleware";

import config from "../res/config.json";

import { system_usage } from './util/sys-util';

/************************************************
 * ANCHOR setup
 ************************************************/

const koaApp: Koa = new Koa();

const wsOptions = {};
const app = websockify(koaApp as any, wsOptions);

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
		synchronize: !config.production,
	}).then((connection) => {
		(app.context as any).mongo = connection;
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
			ModelsMysql.UserModel,
			ModelsMysql.MetadataModel,
			ModelsMysql.CommentModel,
		],
		synchronize: !config.production,
	}).then((connection) => {
		(app.context as any).mysql = connection;
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

app.use(CORS({origin: "*"}));

/************************************************
 * ANCHOR middleware
 ************************************************/

app.use(KoaJSON({ pretty: false, param: 'pretty' }));

app.use(Body({
	formidable: { maxFileSize: 2**32, uploadDir: config.data_dir },
    multipart: true,
	urlencoded: true,
}));

/************************************************
 * ANCHOR auth
 ************************************************/

 (app.context as any).state = {};
 
/************************************************
 * ANCHOR routes
 ************************************************/
  
{ /* HTTP */
	router.use("/auth", authentication.routes());

	{ /* api */
		// router.use("/api/user", jwt.authenticate, api.UserController.routes());
		// router.use("/api/comment", jwt.identify, api.CommentController.routes());
		router.use("/api/file", api.FileController.routes());
		router.use("/api/stream", api.StreamController.routes());
		router.use("/api/info", api.InfoController.routes());
		// router.use("/api/meta", api.MetaController.routes());
	}

	app.use(router.routes());
}

{ /* WEBSOCKET */
	const sleep = (ms: number) => {
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

