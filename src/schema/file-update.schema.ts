import joi from "joi";

const FileUpdateSchema = joi.object({
	filename: joi.string().required(),
});

export default FileUpdateSchema;
