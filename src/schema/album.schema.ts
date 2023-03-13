import joi from "joi";

const AlbumSchema = joi.object({
	title: joi.string().optional().allow("").default(""),

	password: joi.string().optional().min(3).default(null),

	protected: joi.boolean().required(),

	hidden: joi.boolean().required(),
});

export default AlbumSchema;
