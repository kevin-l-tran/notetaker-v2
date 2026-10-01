import { type ApiErrorResponse, ApiErrorResponseSchema } from "@notetaker-v2/contracts";

export class ApiError extends Error {
	readonly code: ApiErrorResponse["code"];
	readonly status: number;
	readonly details: ApiErrorResponse["details"];

	constructor(response: ApiErrorResponse, status: number) {
		super(response.message);

		this.name = "ApiError";
		this.code = response.code;
		this.status = status;
		this.details = response.details;
	}
}

export async function parseApiError(response: Response): Promise<Error> {
	try {
		const body: unknown = await response.json();
		const result = ApiErrorResponseSchema.safeParse(body);

		if (result.success) {
			return new ApiError(result.data, response.status);
		}
	} catch {
		// response was not valid JSON.
	}

	return new Error(`Request failed with status ${response.status}.`);
}
