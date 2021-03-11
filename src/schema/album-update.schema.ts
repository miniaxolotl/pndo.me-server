import joi, { object } from "joi";

const AlbumUpdateSchema = object({
	title: joi.string()
	.optional(),

	password: joi.string()
	.optional()
	.min(3),

	protected: joi.boolean()
	.optional(),

	hidden: joi.boolean()
	.optional(),
});

export default AlbumUpdateSchema;