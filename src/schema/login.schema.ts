import joi from "joi";

export default joi.object({
	email: joi
		.string()
		.email({ tlds: { allow: true } })
		.required(),

	password: joi.string().min(6).max(32).required(),
});
