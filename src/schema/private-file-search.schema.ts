import joi from "joi";

const PrivateFileSearchSchema = joi.object({
	sort: joi
		.string()
		.optional()
		.insensitive()
		.valid("filename", "type", "bytes", "d_count", "v_count", "create_date")
		.default("filename"),

	direction: joi
		.string()
		.optional()
		.insensitive()
		.valid("asc", "dec")
		.default("asc"),

	filename: joi.string().optional().allow("").default(""),

	type: joi.string().optional().allow("").default(""),

	page: joi.number().optional().greater(0).default(1),

	limit: joi.number().optional().greater(0).max(150).default(25),

	skip: joi.number().optional().positive().default(1),
});

export default PrivateFileSearchSchema;
