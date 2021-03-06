import joi, { object } from "joi";

const UploadSchema = object({
	password: joi.string()
	.min(3),

	album: joi.string()
	.default(null),

	protected: joi.boolean()
	.required(),

	hidden: joi.boolean()
	.required(),
});

export default UploadSchema;