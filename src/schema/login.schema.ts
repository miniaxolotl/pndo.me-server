import joi, { object } from "@hapi/joi";

const LoginSchema = object({
	email: joi.email({ tlds: { allow: true } })
		.required(),

	password: joi.string()
		.min(6)
		.max(32)
		.required(),
});

export default LoginSchema;