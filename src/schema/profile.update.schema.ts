import joi, { object } from "@hapi/joi";

const ProfileUpdateSchema = object({
	display_name: joi.string()
		.alphanum()
		.min(3)
		.max(128),

	password: joi.string()
		.min(6)
		.max(128),
});

export default ProfileUpdateSchema;