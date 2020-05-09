import joi, { object } from "@hapi/joi";

const UploadSchema = object({
	upload_file: joi.string()
	.uri(),

	protected: joi.boolean(),

	hidden: joi.boolean(),
});

export default UploadSchema;