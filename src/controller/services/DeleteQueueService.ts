import mongoose from 'mongoose';
import { Models } from "../../server";
import fs, { createReadStream, stat } from "fs";
import Agenda from 'agenda';

export const DeleteFileService
	= async (job: Agenda.Job<Agenda.JobAttributesData>) => {
	
	const models: { [index: string]: mongoose.Model<any, {}> } = Models;

	const action = job.attrs.data;

	await models['uploads.metadata']
	.findOneAndDelete({ file_id: action.file_id })
	.catch(() => {
		// TODO oof
	});

	try {
		fs.unlinkSync(action.file_path);
	} catch(err) {
		// TODO oof
	}	
};