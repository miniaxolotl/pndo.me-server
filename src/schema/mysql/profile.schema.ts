import joi, { object } from "@hapi/joi";

const ProfileSchema = object({
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

	username_display: joi.string()
		.alphanum()
		.min(3)
		.max(128),
});

export default ProfileSchema;