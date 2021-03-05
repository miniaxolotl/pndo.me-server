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
import Session from 'koa-session';
import websockify from 'koa-websocket'

import { createConnection } from "typeorm";
import * as ModelsMysql from './model/mysql';
import * as ModelsMongo from './model/mongo';

import { AuthController } from "./controller";
import { V1AuthController } from './controller/v1';

import config from "../res/config.json";

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
			ModelsMongo.MetadataTimestampModel,
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
			ModelsMysql.AlbumMetadataModel,
			ModelsMysql.AlbumModel,
			ModelsMysql.CommentModel,
			ModelsMysql.MetadataModel,
			ModelsMysql.SessionModel,
			ModelsMysql.UserModel,
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

 //! TODO

/************************************************
 * ANCHOR middleware
 ************************************************/

app.keys = config.crypt.secrets;
app.use(Session({
		key: 'session',
		maxAge: 1000*60*60*24*30,
		renew: true,
	}, 
	app
));

app.use(CORS({ origin: "*" }));

app.use(KoaJSON({ pretty: false, param: 'pretty' }));

app.use(Body({
	formidable: { maxFileSize: 2**32, uploadDir: config.dir.data },
    multipart: true,
	urlencoded: true,
}));

/************************************************
 * ANCHOR authentication
 ************************************************/

	session_id: null,
 
/************************************************
 * ANCHOR routes
 ************************************************/
  
{ /* HTTP */
	router.use("/auth", AuthController.routes());

	{ /* api */
		router.use("/api/v1/auth", V1AuthController.routes());
		
	}

	app.use(router.routes());
}

{ /* WEBSOCKET */
	const sleep = (ms: number) => {
		return new Promise((resolve) => {
		  setTimeout(resolve, ms);
		});
	};

	{
		socket_router.all('/meta/usage', async (ctx: any) => {

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

