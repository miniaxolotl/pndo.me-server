import joi from "joi";

const AlbumUpdateSchema = joi.object({
	title: joi.string().optional(),

	password: joi.string().optional().min(3),

	protected: joi.boolean().optional(),

	hidden: joi.boolean().optional(),
});

export default AlbumUpdateSchema;
