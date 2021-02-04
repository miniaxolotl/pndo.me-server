import joi, { object } from "@hapi/joi";

const ProfileUpdateSchema = object({
	email: joi.email({ tlds: { allow: true } })
		.required(),
		
	username: joi.string()
		.alphanum()
		.min(3)
		.max(32),

	password: joi.string()
		.min(6)
		.max(32),
});

export default ProfileUpdateSchema;