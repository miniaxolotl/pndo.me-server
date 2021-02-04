import joi, { object } from "@hapi/joi";

const UploadSchema = object({
	file: joi.string()
	.uri(),

	protected: joi.boolean(),

	hidden: joi.boolean(),
});

export default UploadSchema;