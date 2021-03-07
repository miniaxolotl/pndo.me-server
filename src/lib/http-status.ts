 /**
 * http-status.ts
 * Collection of status codes.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-17
 */

/************************************************
 * ANCHOR error
 ************************************************/

 /*** 1xx ***/

 /*** 2xx ***/

 export const SUCCESS = {
	OK: {
		status: 200,
		message: "Success: Ok."
	},
	CREATED: {
		status: 201,
		message: "Success: Created."
	},
	ACCEPTED: {
		status: 202,
		message: "Success: Accepted."
	},
	NO_CONTENT: {
		status: 204,
		message: "Success: No content."
	},
	PARTIAL_CONTENT: {
		status: 206,
		message: "Success: Partial content."
	}
};

 /*** 4xx ***/

 export const CLIENT_ERROR = {
	BAD_REQUEST: {
		status: 400,
		message: "Client Error: Bad request."
	},
	UNAUTHORIZED: {
		status: 401,
		message: "Client Error: Unauthoriszed."
	},
	NOT_FOUND: {
		status: 404,
		message: "Client Error: Not found."
	}
};

/*** 5xx ***/

export const SERVER_ERROR = {
	INTERNAL: {
		status: 500,
		message: "Server Error: Internal server error."
	},
	NOT_IMPLEMENTED: {
		status: 501,
		message: "Server Error: Gateway not implemented."
	},
	BAD_GATEWAY: {
		status: 502,
		message: "Server Error: Bad gateway."
	}
};