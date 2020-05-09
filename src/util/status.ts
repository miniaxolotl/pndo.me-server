 /**
 * status.ts
 * Collection of status codes.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-17
 */

import { StatusMessage } from "types";

/************************************************
 * ANCHOR error
 ************************************************/

 /*** 4xx ***/

export const validationError: StatusMessage = {
	status: 400 ,
	message: "Validation Error: Passed invalid body.",
};

export const duplicatedUsername: StatusMessage = {
	status: 400 ,
	message: "Duplication Error: Passed duplicate username.",
};

export const unauthorizedAccess: StatusMessage = {
	status: 401,
	message: "Authorization Error: Unauthorized access to resource.",
};

export const userNotFound: StatusMessage = {
	status: 400,
	message: "Not Found Error: User not found.",
};
/*** 5xx ***/

export const noContent: StatusMessage = {
	status: 500,
	message: "Server Error: No content to serve.",
};

export const serverError: StatusMessage = {
	status: 500,
	message: "Server Error: Unexpected server malfuntion.",
};

export const databaseError: StatusMessage = {
	status: 500,
	message: "Server Error: Unexpected malfuntion when accessing database.",
};
/************************************************
 * ANCHOR error
 ************************************************/

export const invalidRequest: StatusMessage = {
	status: 400,
	message: "Requested action was invalid.",
};

export const resourceNotFound: StatusMessage = {
	status: 404,
	message: "Resource not found.",
};

export const invalidForm: StatusMessage = {
	status: 400,
	message: "Invalid form data.",
};

export const duplicateUsername: StatusMessage = {
	status: 409,
	message: "Duplicate username.",
};

export const duplicateEmail: StatusMessage = {
	status: 409,
	message: "Duplicate email.",
};

export const duplicateForm: StatusMessage = {
	status: 409,
	message: "Duplicate form data.",
};

export const duplicateResource: StatusMessage = {
	status: 409,
	message: "Resource already exists.",
};

export const actionSuccessful: StatusMessage = {
	status: 200,
	message: "Success.",
};

export const actionUnsuccessful: StatusMessage = {
	status: 500,
	message: "Failure.",
};

/************************************************
 * ANCHOR success
 ************************************************/