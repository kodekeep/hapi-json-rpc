import "jest-extended";

import Hapi from "@hapi/hapi";
import Joi, { Schema } from "@hapi/joi";
import Ajv from "ajv";
import { plugin } from "../src";

export const sendRequest = async (method: string, options: Record<string, any> = {}) => {
	const server: Hapi.Server = new Hapi.Server({
		host: "localhost",
		port: 8000,
	});

	await server.register({
		// @ts-ignore
		options: {
			...options,
			...{
				methods: [
					{
						name: "hello",
						async method() {
							return { data: [] };
						},
					},
					{
						name: "ajv",
						async method(params) {
							return { data: { name: params.name } };
						},
						schema: {
							properties: {
								name: {
									type: "string",
								},
							},
							required: ["name"],
							type: "object",
						},
					},
					{
						name: "joi",
						async method(params) {
							return { data: { name: params.name } };
						},
						schema: Joi.object()
							.keys({
								name: Joi.string().required(),
							})
							.required(),
					},
				],
			},
		},
		plugin,
	});

	const response = await server.inject({
		headers: {
			"Content-Type": "application/vnd.api+json",
			accept: "application/vnd.api+json",
		},
		method: "POST",
		payload: {
			id: Math.random().toString(36),
			jsonrpc: "2.0",
			method,
		},
		url: "/",
	});

	let { payload } = response;
	try {
		payload = JSON.parse(response.payload);
	} catch (e) {
		//
	}

	return {
		headers: response.headers,
		payload,
		query: response.request.query,
		response,
	};
};

function expectPass(response, payload) {
	expect(response.statusCode).toBe(200);
	expect(payload.jsonrpc).toBe("2.0");
	expect(payload.result.data).toEqual([]);
}

function expectFail(response, payload, code, message) {
	expect(response.statusCode).toBe(200);
	expect(payload.jsonrpc).toBe("2.0");
	expect(payload.error.code).toBe(code);
	expect(payload.error.message).toBe(message);
}

test("should send a successful request", async () => {
	const { response, payload } = await sendRequest("hello");

	expectPass(response, payload);
});

test("should receive a response failure due to validation error (AJV)", async () => {
	const { response, payload } = await sendRequest("ajv", {
		processor: {
			schema: {
				properties: {
					id: {
						type: ["number", "string"],
					},
					jsonrpc: {
						pattern: "2.0",
						type: "string",
					},
					method: {
						type: "string",
					},
					params: {
						type: "object",
					},
				},
				required: ["jsonrpc", "method", "id"],
				type: "object",
			},
			validate(data: object, schema: object) {
				try {
					const ajv = new Ajv({
						$data: true,
						extendRefs: true,
						removeAdditional: true,
					});

					ajv.validate(schema, data);

					return { value: data, error: ajv.errors !== null ? ajv.errorsText() : null };
				} catch (error) {
					return { value: null, error: error.stack };
				}
			},
		},
	});

	expectFail(response, payload, -32602, "data should be object");
});

test("should receive a response failure due to validation error (Joi)", async () => {
	const { response, payload } = await sendRequest("joi", {
		processor: {
			schema: Joi.object().keys({
				id: Joi.alternatives()
					.try(Joi.number(), Joi.string())
					.required(),
				jsonrpc: Joi.string()
					.allow("2.0")
					.required(),
				method: Joi.string().required(),
				params: Joi.object(),
			}),
			validate(data: object, schema: Schema) {
				return schema.validate(data);
			},
		},
	});

	expectFail(response, payload, -32602, 'ValidationError: "value" is required');
});
