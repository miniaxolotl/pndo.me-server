/**
 * User.ts
 * Schema for User collection.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import { Schema, Types } from 'mongoose';

const MetadataModel = new Schema({
	file_id: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	sha256: {
		type: String,
		required: true,
		trim: true,
	},
	md5: {
		type: String,
		required: true,
		trim: true,
	},
	filename: {
		type: String,
		required: true,
		trim: true,
	},
	type: {
		type: String,
		required: true,
		trim: true,
	},
	owner: {
		type: String,
		trim: true,
	},
	protected: {
		type: Boolean,
		default: false,
		trim: true,
	},
	hidden: {
		type: Boolean,
		default: true,
		trim: true,
	},
	deleted: {
		type: Boolean,
		default: false,
		trim: true,
	},
	downloads: {
		type: Number,
		default: 0,
		trim: true,
	},
	views: {
		type: Number,
		default: 0,
		trim: true,
	},
	bytes: {
		type: Number,
		required: true,
		trim: true,
	},
	uploaded: {
		type: Date,
		default: Date.now,
	},
	expires: {
		type: Date,
		default: null,
	},
});

export default MetadataModel;
