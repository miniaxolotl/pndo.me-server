/**
 * User.ts
 * Schema for User collection.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import { Schema } from 'mongoose';
import { UserFlags } from 'types';


const default_flags: UserFlags = {
	admin: false,
	moderator: false,
	banned: false,
};

const UserModel = new Schema({
	profile: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	username: {
		type: String,
		required: true,
		unique: true,
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
