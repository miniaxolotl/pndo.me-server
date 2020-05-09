import joi, { object } from "@hapi/joi";

const LoginSchema = object({
	username: joi.string()
		.alphanum()
		.lowercase()
		.min(3)
		.max(128)
		.required(),

	password: joi.string()
		.min(6)
		.max(128)
		.required(),

});

export default LoginSchema;