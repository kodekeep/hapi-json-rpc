import { Server } from "@hapi/hapi";
import { Schema } from "@hapi/joi";
import get from "dlv";

import { IProcessorOptions, IRequestParameters, IResponse, IResponseError, IValidationResult } from "./interfaces";

export class Processor {
	public constructor(private readonly server: Server, private readonly options: IProcessorOptions) {}

	public async resource<T = any>(payload: IRequestParameters): Promise<IResponse<T> | IResponseError> {
		const { method, params, id } = payload;

		try {
			const { error } = this.options.validate
				? this.options.validate(payload || {}, this.options?.schema as object)
				: (((this.options.schema as Schema).validate(payload || {}) as unknown) as IValidationResult);

			if (error) {
				return this.createErrorResponse(payload?.id, -32600, new Error(error));
			}

			const targetMethod = get(this.server.methods, method);

			if (!targetMethod) {
				return this.createErrorResponse(id, -32601, new Error("The method does not exist / is not available."));
			}

			// @ts-ignore
			const schema = this.server.app.schemas[method];

			if (schema) {
				// @ts-ignore
				const { error } = this.options.validate(params, schema);

				if (error) {
					return this.createErrorResponse(id, -32602, new Error(error));
				}
			}

			const result = await targetMethod(params);

			return result.isBoom
				? this.createErrorResponse(id, result.output.statusCode, result.output.payload)
				: this.createSuccessResponse(id, result);
		} catch (error) {
			return this.createErrorResponse(id, -32603, error);
		}
	}

	public async collection<T = any>(payloads: IRequestParameters[]): Promise<Array<IResponse<T>> | IResponseError[]> {
		const results = [];

		for (const payload of payloads) {
			// @ts-ignore
			results.push(await this.resource<T>(payload));
		}

		return results;
	}

	private createSuccessResponse<T = any>(id: string | number, result: T): IResponse<T> {
		return {
			id,
			jsonrpc: "2.0",
			result,
		};
	}

	private createErrorResponse(id: string | number, code: number, error: Error): IResponseError {
		return {
			error: {
				code,
				data: error.stack,
				message: error.message,
			},
			id,
			jsonrpc: "2.0",
		};
	}
}
