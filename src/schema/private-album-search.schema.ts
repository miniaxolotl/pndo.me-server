import joi, { object } from "joi";

const PrivateAlbumSearchSchema = object({

	sort: joi.string()
	.optional()
	.insensitive()
	.valid('albumname', 'bytes', 'd_count', 'v_count', 'create_date')
	.default('albumname'),

	direction: joi.string()
	.optional()
	.insensitive()
	.valid('asc', 'dec')
	.default('asc'),

	albumname: joi.string()
	.optional()
	.allow('')
	.default(''),

	page: joi.number()
	.optional()
	.greater(0)
	.default(1),

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

export default PrivateAlbumSearchSchema;