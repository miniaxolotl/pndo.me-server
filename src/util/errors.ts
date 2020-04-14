 /**
 * errors.ts
 * Collection of error objects.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-17
 */

export interface StatusMessage {
	status: number;
	message: string;
}

export const invalidBody: StatusMessage = {
	status: 400 ,
	message: "Invalid body, server cannot process.",
};

export const unauthorizedAccess: StatusMessage = {
	status: 401,
	message: "Unauthorized access.",
};

export const resourceNotFound: StatusMessage = {
	status: 404,
	message: "Resource does not exist.",
};

export const resourceDeleted: StatusMessage = {
	status: 200,
	message: "Resource successfully deleted.",
};

export const resourceQueuefDeleted: StatusMessage = {
	status: 200,
	message: "Resource successfully added to deletion queue.",
};

export const noContentToProcess: StatusMessage = {
	status: 204,
	message: "No content to process.",
};

export const invalidCredentials: StatusMessage = {
	status: 401,
	message: "Invalid credentials.",
};

export const duplicateUsername: StatusMessage = {
	status: 403,
	message: "Duplicate username.",
};

export const invalidForm: StatusMessage = {
	status: 403,
	message: "Required form field was null.",
};

export const invalidRequest: StatusMessage = {
	status: 400,
	message: "Requst action was invalid.",
};

export const serverError: StatusMessage = {
	status: 500,
	message: "Unspecified server error.",
};
