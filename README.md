# @kodekeep/hapi-json-rpc

[![GitHub Tests Action Status](https://img.shields.io/github/workflow/status/kodekeep/hapi-json-rpc/run-tests?label=tests)](https://github.com/kodekeep/hapi-json-rpc/actions?query=workflow%3Arun-tests+branch%3Amaster)
[![Code Coverage](https://badgen.net/codecov/c/github/kodekeep/hapi-json-rpc)](https://codecov.io/gh/kodekeep/hapi-json-rpc)
[![Minimum Node.js Version](https://badgen.net/npm/node/@kodekeep/hapi-json-rpc)](https://www.npmjs.com/package/@kodekeep/hapi-json-rpc)
[![Latest Version](https://badgen.net/npm/v/@kodekeep/hapi-json-rpc)](https://www.npmjs.com/package/@kodekeep/hapi-json-rpc)
[![Total Downloads](https://badgen.net/npm/dt/kodekeep/hapi-json-rpc)](https://npmjs.org/package/@kodekeep/hapi-json-rpc)
[![License](https://badgen.net/npm/license/kodekeep/hapi-json-rpc)](https://npmjs.org/package/@kodekeep/hapi-json-rpc)

> An implementation of the JSON-RPC 2.0 specification for building RPCs with hapi.js

## Installation

```bash
yarn add @kodekeep/hapi-json-rpc
```

## Usage

### Joi (Default)

```ts
import * as plugin from "@kodekeep/hapi-json-rpc";
import Joi from "@hapi/joi";

await server.register({
	plugin,
	options: {
		methods: [...],
		processor: {
			schema: Joi.object().keys({
				id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
				jsonrpc: Joi.string().allow("2.0").required(),
				method: Joi.string().required(),
				params: Joi.object(),
			}),
			validate(data: object, schema: object) {
				return Joi.validate(data, schema);
			},
		},
	},
});
```

### AJV

```ts
import * as plugin from "@kodekeep/hapi-json-rpc";
import Ajv from "ajv";

await server.register({
	plugin,
	options: {
		methods: [...],
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
```

## Testing

```bash
yarn test
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover a security vulnerability within this package, please send an e-mail to hello@kodekeep.com. All security vulnerabilities will be promptly addressed.

## Credits

This project exists thanks to all the people who [contribute](../../contributors).

## License

Mozilla Public License Version 2.0 (MPL-2.0). Please see [License File](LICENSE.md) for more information.
