import joi, { object } from "joi";

export default object({
	email: joi.string()
		.email({ tlds: { allow: true } })
		.optional(),
		
	username: joi.string()
		.alphanum()
		.lowercase()
		.min(3)
		.max(32)
		.optional(),

	password: joi.string()
		.min(6)
		.max(32)
		.optional(),
});