import joi, { object } from "joi";

const LoginSchema = object({
	email: joi.string()
		.email({ tlds: { allow: true } })
		.required(),

	password: joi.string()
		.min(6)
		.max(32)
		.required(),
});

export default LoginSchema;