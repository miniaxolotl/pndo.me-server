import joi, { object } from "joi";

const AlbumSchema = object({
	title: joi.string()
	.optional()
	.allow('')
	.default(''),

	password: joi.string()
	.optional()
	.min(3)
	.default(null),

	protected: joi.boolean()
	.required(),

	hidden: joi.boolean()
	.required(),
});

export default AlbumSchema;