/**
 * auth.controller.ts
 * Controller for handling user authentication.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-04-23
 */

import { ParameterizedContext } from "koa";
import Router from "koa-router";

import { Bcrypt, HttpStatus } from "../lib";
import { SessionResponce } from "../lib/types";
import { LoginSchema, RegisterSchema } from "../schema";

import { SessionModel, UserModel } from "../model/mysql";
import { Connection } from "typeorm";

import { uid } from 'uid/secure';
import { v4 as uuid } from 'uuid';

const router: Router = new Router();

/************************************************
 * * routes
 ************************************************/

router.post("/register", async (ctx: ParameterizedContext, next) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const session_collection = db.manager.getRepository(SessionModel);

	const { value, error } = RegisterSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});

	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
		return;
	} else {
		const password_hash: string | null = await Bcrypt.gen_hash(value.password!);

		const collisions: string[] = [];
		if(await user_collection.findOne({ username: value.username })) {
			collisions.push(`Duplicate username ${value.username}`)
		}
		if(await user_collection.findOne({ email: value.email })) {
			collisions.push(`Duplicate email ${value.email}`)
		}
		if(collisions.length > 0) {
			ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
			ctx.body = collisions;
			return;
		} else {
			const user = new UserModel();
			user.user_id = uid(16);
			user.email = value.email;
			user.username = value.username;
			user.password = password_hash;

			const session = new SessionModel();
			session.session_id = uuid();
			session.user = user;
			session.expire_date = new Date(new Date().getTime() + (1000*60*60*24*30));

			const user_data = await user_collection.save(user);
			const session_data = await session_collection.save(session);
			if(user_data && session_data) {
				const responce: SessionResponce = {
					session_id: session_data.session_id,
					payload: {
						user_id: user_data.user_id,
						username: user_data.username,
						email: user_data.email,
						admin: user_data.admin,
						banned: user_data.banned,
					}
				};
				ctx.cookies.set("session_id", session_data.session_id);
				ctx.cookies.set("username", user_data.username);
				ctx.body = responce;
				return;
			} else {
				ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
				ctx.body = HttpStatus.CLIENT_ERROR.BAD_REQUEST.message;
				return;
			}
		}
	}
});

router.post("/login", async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const user_collection = db.manager.getRepository(UserModel);
	const session_collection = db.manager.getRepository(SessionModel);

	const { value, error } = LoginSchema.validate(body, {
		abortEarly: false,
		errors: { escapeHtml: true }
	});

	if(error) {
		ctx.status = HttpStatus.CLIENT_ERROR.BAD_REQUEST.status;
		ctx.body = { errors: [] };
		error.details.forEach(e => { (ctx.body as any).errors.push(e.message); });
	} else {
		const user_data = await user_collection.findOne({ email: value.email });
		if(user_data) {
			if(await Bcrypt.compare(value.password, user_data.password)) {
				const session = new SessionModel();
				session.session_id = uuid();
				session.user = user_data;
				session.expire_date = new Date(new Date().getTime() + (1000*60*60*24*30));
				const session_data = await session_collection.save(session);

				await session_collection.update({
					session_id: ctx.cookies.get("session_id"),
				}, {
					valid: false,
				});

				const responce: SessionResponce = {
					session_id: session_data.session_id,
					payload: {
						user_id: user_data.user_id,
						username: user_data.username,
						email: user_data.email,
						admin: user_data.admin,
						banned: user_data.banned,
					}
				};
				ctx.cookies.set("session_id", session_data.session_id);
				ctx.cookies.set("username", user_data.username);
				ctx.body = responce;
				return;
			} else {
				ctx.status = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.status;
				ctx.body = HttpStatus.CLIENT_ERROR.UNAUTHORIZED.message;
				return;
			}
		}
	}
});

router.post("/logout", async (ctx: ParameterizedContext) => {

	const body = ctx.request.body;
	const db: Connection = ctx.mysql;
	
	const session_collection = db.manager.getRepository(SessionModel);

	const session_id = ctx.cookies.get("session_id");
	await session_collection.update({
		session_id: session_id,
	}, {
		valid: false,
	});

	ctx.cookies.set("session_id");
	ctx.cookies.set("username");

	ctx.status = HttpStatus.SUCCESS.OK.status;
	ctx.body = HttpStatus.SUCCESS.OK.message;
	return;
});

const Controller: Router = router;
	
export default Controller;
