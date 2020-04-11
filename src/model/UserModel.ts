/**
 * User.ts
 * Schema for User collection.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import { Schema } from 'mongoose';

export type flag_t = {
	admin: boolean;
	moderator: boolean;
};

const default_flags: flag_t = {
	admin: false,
	moderator: false,
};

const UserModel = new Schema({
	profile: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	name: {
		type: String,
		required: true,
		trim: true,
	},
	password: {
		type: String,
		required: true,
		trim: true,
	},
	flags: {
		type: Object,
		default: default_flags,
	},
	created: {
		type: Date,
		default: Date.now,
	},
});

export default UserModel;
