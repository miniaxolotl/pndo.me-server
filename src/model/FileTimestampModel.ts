/**
 * User.ts
 * Schema for User collection.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import { Schema, Types } from 'mongoose';

const FileTimestampModel = new Schema({
	hash: {
		type: String,
		required: true,
		trim: true,
	},
	time: {
		type: Date,
		default: Date.now,
	}
});

export default FileTimestampModel;
