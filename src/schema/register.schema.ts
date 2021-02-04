import joi, { object } from "@hapi/joi";

const RegisterSchema = object({
	email: joi.email({ tlds: { allow: true } })
		.required(),
		
	username: joi.string()
		.alphanum()
		.lowercase()
		.min(3)
		.max(32)
		.required(),

	password: joi.string()
		.min(6)
		.max(32)
		.required(),
});

export default RegisterSchema;