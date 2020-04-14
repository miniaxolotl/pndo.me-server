/**
 * User.ts
 * Schema for User collection.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-14
 */

import { Schema } from 'mongoose';

const CommentModel = new Schema({
	form_id: {
		type: String,
		required: true,
		trim: true,
	},
	message: {
		type: String,
		required: true,
		trim: true,
	},
	sender: {
		type: String,
		default: null,
		trim: true,
	},
	created: {
		type: Date,
		default: Date.now,
	},
});

export default CommentModel;
