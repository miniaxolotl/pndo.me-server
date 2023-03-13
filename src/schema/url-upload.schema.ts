import joi from "joi";

const URLUploadSchema = joi.object({
	url: joi.array().required(),

	password: joi.string().min(3),

	album: joi.string().default(null),

	protected: joi.boolean().required(),

	hidden: joi.boolean().required(),
});

export default URLUploadSchema;
