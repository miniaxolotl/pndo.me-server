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

import { Api, AuthController } from "./controller";
import { V1AuthController } from './controller/v1';

import config from "../res/config.json";
import { JWTIdentify, SessionIdentify } from './middleware';
import { UserState } from './lib/types';

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
			ModelsMysql.AlbumUserModel,
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
	formidable: {
		maxFileSize: 2**32,
		uploadDir: `${config.dir.data}/temp`,
		multiples: true,
	},
    multipart: true,
	urlencoded: true,
}));

/************************************************
 * ANCHOR authentication
 ************************************************/

(app.context as Koa.BaseContext & { state: UserState }).state = {
	session_id: null,
	user_id: null,
	username: null,
	email: null,
	admin: null,
	banned: null,
};
 
/************************************************
 * ANCHOR routes
 ************************************************/
  
{ /* HTTP */
	{ /* api */
		const api: Router = new Router();

		api.use("/auth", V1AuthController.routes());
		api.use([
			"/album",
			"/a"
		], SessionIdentify, Api.AlbumController.routes());
		api.use([
			"/file",
			"/f"
		], SessionIdentify, Api.FileController.routes());
		api.use([
			"/info",
			"/i"
		], SessionIdentify, Api.InfoController.routes());
		api.use([
			"/meta",
			"/b"
		], SessionIdentify, Api.MetaController.routes());
		api.use([
			"/search",
			"/s"
		], SessionIdentify, Api.SearchController.routes());
		api.use([
			"/stream",
			"/str"
		], SessionIdentify, Api.StreamController.routes());
		api.use([
			"/user",
			"/u"
		], SessionIdentify, Api.UserController.routes());
		
		router.use("/api", api.routes());
	}

	{ /* api/v1 */
		const v1: Router = new Router();

		v1.use("/auth", V1AuthController.routes());
		v1.use([
			"/album",
			"/a"
		], JWTIdentify, Api.AlbumController.routes());
		v1.use([
			"/file",
			"/f"
		], JWTIdentify, Api.FileController.routes());
		v1.use([
			"/info",
			"/i"
		], JWTIdentify, Api.InfoController.routes());
		v1.use([
			"/meta",
			"/b"
		], JWTIdentify, Api.MetaController.routes());
		v1.use([
			"/search",
			"/s"
		], JWTIdentify, Api.SearchController.routes());
		v1.use([
			"/stream",
			"/str"
		], JWTIdentify, Api.StreamController.routes());
		v1.use([
			"/user",
			"/u"
		], JWTIdentify, Api.UserController.routes());
		
		router.use("/api/v1", v1.routes());
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

