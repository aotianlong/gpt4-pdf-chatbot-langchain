"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SageMakerEndpoint = exports.BaseSageMakerContentHandler = void 0;
const client_sagemaker_runtime_1 = require("@aws-sdk/client-sagemaker-runtime");
const base_js_1 = require("./base.cjs");
/**
 * A handler class to transform input from LLM to a format that SageMaker
 * endpoint expects. Similarily, the class also handles transforming output from
 * the SageMaker endpoint to a format that LLM class expects.
 *
 * Example:
 * ```
 * class ContentHandler implements ContentHandlerBase<string, string> {
 *   contentType = "application/json"
 *   accepts = "application/json"
 *
 *   transformInput(prompt: string, modelKwargs: Record<string, unknown>) {
 *     const inputString = JSON.stringify({
 *       prompt,
 *      ...modelKwargs
 *     })
 *     return Buffer.from(inputString)
 *   }
 *
 *   transformOutput(output: Uint8Array) {
 *     const responseJson = JSON.parse(Buffer.from(output).toString("utf-8"))
 *     return responseJson[0].generated_text
 *   }
 *
 * }
 * ```
 */
class BaseSageMakerContentHandler {
    constructor() {
        /** The MIME type of the input data passed to endpoint */
        Object.defineProperty(this, "contentType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "text/plain"
        });
        /** The MIME type of the response data returned from endpoint */
        Object.defineProperty(this, "accepts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "text/plain"
        });
    }
}
exports.BaseSageMakerContentHandler = BaseSageMakerContentHandler;
class SageMakerEndpoint extends base_js_1.LLM {
    constructor(fields) {
        super(fields ?? {});
        Object.defineProperty(this, "endpointName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "contentHandler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "modelKwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "endpointKwargs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const regionName = fields.clientOptions.region;
        if (!regionName) {
            throw new Error(`Please pass a "clientOptions" object with a "region" field to the constructor`);
        }
        const endpointName = fields?.endpointName;
        if (!endpointName) {
            throw new Error(`Please pass an "endpointName" field to the constructor`);
        }
        const contentHandler = fields?.contentHandler;
        if (!contentHandler) {
            throw new Error(`Please pass a "contentHandler" field to the constructor`);
        }
        this.endpointName = fields.endpointName;
        this.contentHandler = fields.contentHandler;
        this.endpointKwargs = fields.endpointKwargs;
        this.modelKwargs = fields.modelKwargs;
        this.client = new client_sagemaker_runtime_1.SageMakerRuntimeClient(fields.clientOptions);
    }
    _llmType() {
        return "sagemaker_endpoint";
    }
    /** @ignore */
    async _call(prompt, options) {
        const body = await this.contentHandler.transformInput(prompt, this.modelKwargs ?? {});
        const { contentType, accepts } = this.contentHandler;
        const response = await this.caller.call(() => this.client.send(new client_sagemaker_runtime_1.InvokeEndpointCommand({
            EndpointName: this.endpointName,
            Body: body,
            ContentType: contentType,
            Accept: accepts,
            ...this.endpointKwargs,
        }), { abortSignal: options.signal }));
        if (response.Body === undefined) {
            throw new Error("Inference result missing Body");
        }
        return this.contentHandler.transformOutput(response.Body);
    }
}
exports.SageMakerEndpoint = SageMakerEndpoint;
