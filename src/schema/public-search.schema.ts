import joi, { object } from "joi";

const PublicSearchSchema = object({
	albumname: joi.string()
	.optional()
	.allow('')
	.default(null),

	filename: joi.string()
	.optional()
	.allow('')
	.default(null),

	type: joi.string()
	.optional()
	.allow('')
	.default(null),

	page: joi.number()
	.optional()
	.greater(0)
	.default(0),

	limit: joi.number()
	.optional()
	.greater(0)
	.max(150)
	.default(25),

	skip: joi.number()
	.optional()
	.positive()
	.default(1),
});

export default PublicSearchSchema;