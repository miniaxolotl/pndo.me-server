import joi from "joi";

const UploadSchema = joi.object({
	password: joi.string().min(3),

	album: joi.string().default(null),

	protected: joi.boolean().required(),

	hidden: joi.boolean().required(),
});

export default UploadSchema;
