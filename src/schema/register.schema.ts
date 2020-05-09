import joi, { object } from "@hapi/joi";

const RegisterSchema = object({
	username: joi.string()
		.alphanum()
		.lowercase()
		.min(3)
		.max(128)
		.required(),

	email: joi.string()
		.email()
		.required(),

	password: joi.string()
		.min(6)
		.max(128)
		.required(),

	username_display: joi.string()
		.alphanum()
		.min(3)
		.max(128),
});

export default RegisterSchema;