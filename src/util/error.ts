 /**
 * error.ts
 * Collection of error objects.
 * Notes:
 * - N/A
 * @author Elias Mawa <elias@emawa.io>
 * Created 20-02-17
 */

const authorization = {
	invalidAuthentication: {
		message: "Incorrect email and/or password.",
		status: 401
	},
	duplicateEmail: {
		message: "Duplicate email address.",
		status: 400
	},
	nullField: {
		message: "Authorization fields must not be null.",
		status: 400
	}
};

export default {
	authorization,
};
