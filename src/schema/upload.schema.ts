import joi, { object } from "joi";

const UploadSchema = object({
	file: joi.string()
	.uri(),

	protected: joi.boolean(),

	hidden: joi.boolean(),
});

export default UploadSchema;