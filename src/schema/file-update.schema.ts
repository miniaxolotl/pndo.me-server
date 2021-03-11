import joi, { object } from "joi";

const FileUpdateSchema = object({
	filename: joi.string()
	.required(),
});

export default FileUpdateSchema;