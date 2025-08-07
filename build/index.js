#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const form_data_1 = __importDefault(require("form-data"));
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsutils = __importStar(require("./jsutils.js"));
let g_mcp_server_version = '1.0.3';
let g_api_url = jsutils.safeStr(process.env["MCP_INTEGRATION_URL"]);
let g_debug_file = jsutils.safeStr(process.env["MCP_DEBUG_FILE"]);
let g_max_upload_size = 300 * 1000 * 1000;
let kMcpMaxLastOps = 100;
const mcp_query_oplist_wscheme = zod_1.z.object({
    transcriptions: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().describe("Transcription title"),
        lang: zod_1.z.string().describe("Transcription language (BCP-47 language code)"),
        creation_date: zod_1.z.string().describe("Transcription creation date in ISO format"),
        unique_id: zod_1.z.string().describe("Transcription ID, should be used for deleting and renaming transcriptions"),
        text_content: zod_1.z.string().optional().describe("Transcription text"),
    }))
});
const mcpServer = new mcp_js_1.McpServer({
    name: 'Transcribe.com-mcp-local-server',
    title: 'Transcribe.com tools',
    version: g_mcp_server_version
}, {
    capabilities: {
        logging: {}
    },
    instructions: "Transcribe.com MCP Server for converting speech to text\n" +
        "⚠️ IMPORTANT: This server provides access to Transcribe.com endpoints which may incur costs.\n" +
        "Each tool that makes an API call is marked with a cost warning.\n" +
        "Tools without cost warnings in their description are free to use as they only read existing data."
});
async function clog(message) {
    try {
        if (g_debug_file.length == 0) {
            return;
        }
        if (!message || (typeof message !== "string")) {
            message = JSON.stringify(message);
        }
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${message}\n`;
        fs.appendFileSync(g_debug_file, logEntry);
    }
    catch (e) {
        console.error("clog failed", e);
    }
}
function mcp_sys_error(message, so = null) {
    clog(['mcp_error', message]);
    let result = {
        content: [
            {
                type: 'text',
                text: "Error: " + message,
            },
        ],
        isError: true,
    };
    if (so) {
        result["structuredContent"] = so;
    }
    return result;
}
function mcp_sys_text(message, so = null) {
    clog(['mcp_text', message]);
    let result = {
        content: [
            {
                type: 'text',
                text: message,
            },
        ],
    };
    if (so) {
        result["structuredContent"] = so;
    }
    return result;
}
mcpServer.registerTool('get-balance', {
    title: 'Get Transcribe.com balance',
    description: "Use this to read user balance, returns amount of time credits in hours."
        + "\nTool retrieves account balance of the user at Transcribe.com",
    annotations: {
        readOnlyHint: true,
        idempotentHint: true
    }
}, async (args, req_extra) => {
    let tool_name = 'get-balance';
    clog([tool_name + ':init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        let output_json = null;
        const formData = new form_data_1.default();
        formData.append('remote_tool', tool_name);
        formData.append('remote_sender', g_mcp_server_version);
        const { default: nfetch } = await import('node-fetch');
        const response = await nfetch(api_url, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        output_json = await response.json();
        clog(["api_result", output_json]);
        let balance_h = output_json.text;
        return mcp_sys_text(balance_h);
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return mcp_sys_error("Unexpected interruption.");
    }
});
mcpServer.registerTool('convert-to-text', {
    title: 'Transcribe file to text',
    description: "Use this to transcribe speech to text from an audio file located in file system, to convert audio file into text."
        + "\nTool adds transcription to user transcriptions at Transcribe.com."
        + "\n⚠️ COST WARNING: This tool makes an API call which may incur costs.",
    inputSchema: {
        audio_file_path: zod_1.z.string().describe('Path of the audio File'),
        language_code: zod_1.z.string().describe('BCP-47 language code for transcription (default: "en-US" for US English)').default('en-US'),
        should_save_text_to_output_directory: zod_1.z.boolean().describe('Whether to save the text to a file in output directory').default(false),
        should_return_text_to_client: zod_1.z.boolean().describe('Whether to return the text to the client directly').default(true),
        output_directory: zod_1.z.string().describe('Output directory where text file should be saved.'),
    },
    annotations: {
        readOnlyHint: false,
        idempotentHint: false
    }
}, async (args, req_extra) => {
    let tool_name = 'convert-to-text';
    clog([tool_name + ':init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        if (!args.should_save_text_to_output_directory && !args.should_return_text_to_client) {
            return mcp_sys_error("Must save text to file or return it to the client directly.");
        }
        if (args.should_save_text_to_output_directory && jsutils.safeLen(args.output_directory) == 0) {
            return mcp_sys_error("Output directory must be specified.");
        }
        let input_lang = jsutils.safeStr(args?.language_code);
        if (input_lang.length == 0) {
            input_lang = "en-US";
        }
        let input_path = jsutils.safeStr(args?.audio_file_path);
        if (input_path.length == 0) {
            return mcp_sys_error("Input file path is not provided or path not valid.");
        }
        let input_filename = input_path;
        let input_filedata = null;
        if (input_path.indexOf("http://") < 0 && input_path.indexOf("https://") < 0) {
            input_filename = path.basename(input_path);
            try {
                const stats = fs.statSync(input_path);
                const fileSizeInBytes = stats.size;
                if (fileSizeInBytes > g_max_upload_size) {
                    return mcp_sys_error("Input file too big. The maximum size for upload is 300mb.");
                }
                input_filedata = await fs.readFileSync(input_path);
            }
            catch (error) {
                clog(["file_error", jsutils.dbgJSON(error)]);
                return mcp_sys_error("Input file path is not valid or not accessible.");
            }
        }
        let output_json = {};
        try {
            const formData = new form_data_1.default();
            formData.append('remote_tool', tool_name);
            formData.append('remote_sender', g_mcp_server_version);
            formData.append('file_name', input_filename);
            formData.append('file_lang', input_lang);
            if (input_filedata != null) {
                formData.append('file_data', input_filedata, input_filename);
                clog(["api_request_file", input_filename, input_lang, input_filedata.length]);
            }
            else {
                clog(["api_request_url", input_filename, input_lang]);
            }
            const { default: nfetch } = await import('node-fetch');
            const response = await nfetch(api_url, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            });
            output_json = await response.json();
            clog(["api_result", output_json]);
        }
        catch (error) {
            clog(["upload_error", jsutils.dbgJSON(error)]);
            return mcp_sys_error("Failed to upload file for further processing.");
        }
        if (!output_json || output_json?.status != 'ok') {
            return mcp_sys_error("Failed to process file.");
        }
        let output_result = jsutils.safeStr(output_json.text);
        if (args.should_save_text_to_output_directory) {
            let output_path = "???";
            try {
                let downloads_path = args.output_directory;
                if (downloads_path.length == 0) {
                    return mcp_sys_error("Failed to get output folder.");
                }
                let downloads_name = input_filename + ".txt";
                output_path = path.join(downloads_path, downloads_name);
                clog(["return_file v1", output_path]);
                fs.writeFileSync(output_path, output_result);
            }
            catch (error) {
                clog(["save_error", jsutils.dbgJSON(error)]);
                return mcp_sys_error(`Failed to save file into ${output_path}.`);
            }
            args.should_return_text_to_client = false;
            output_result = `Transcription saved to ${output_path}`;
        }
        if (args.should_return_text_to_client) {
            return mcp_sys_text(output_result);
        }
        return mcp_sys_text(output_result);
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return mcp_sys_error("Unexpected interruption.");
    }
});
mcpServer.registerTool("read-transcriptions", {
    title: "Retrieve text content of ready transcriptions",
    description: "Use this to get text content and titles of ready transcriptions."
        + "\nTool can read and retrieve user transcriptions saved at Transcribe.com."
        + "\nResults may be limited by a keyword-focused search query applied to the transcription title or the transcription content."
        + "\nSearch query is case-insensitive. Most recently added transcriptions are returned first.",
    inputSchema: zod_1.z.object({
        search_query: zod_1.z.string().optional().describe('One or more keyword-focused search query for looking in transcription title or content. Leave this blank when requesting all transcriptions.').default(''),
        limit: zod_1.z.number().describe('Maximum number of recent transcriptions to return. Maximum: ' + kMcpMaxLastOps + ' transcriptions').default(10),
    }).shape,
    outputSchema: mcp_query_oplist_wscheme.shape,
    annotations: {
        readOnlyHint: true,
        idempotentHint: true
    }
}, async (args, req_extra) => {
    let tool_name = 'read-transcriptions';
    clog([tool_name + ':init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        let output_json = null;
        const formData = new form_data_1.default();
        formData.append('remote_tool', tool_name);
        formData.append('remote_sender', g_mcp_server_version);
        for (const [arg_name, arg_value] of Object.entries(args)) {
            formData.append(arg_name, arg_value);
        }
        const { default: nfetch } = await import('node-fetch');
        const response = await nfetch(api_url, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        output_json = await response.json();
        clog(["api_result", output_json]);
        let mcp_reply = output_json.mcp;
        if (!mcp_reply) {
            return mcp_sys_error("Remote service unaviable.");
        }
        return mcp_reply;
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return mcp_sys_error("Unexpected interruption.");
    }
});
mcpServer.registerTool("update-transcription", {
    title: "Update or delete transcription",
    description: "Use this to rename transcription or delete transcription."
        + "\nTool can update user transcriptions saved at Transcribe.com.",
    inputSchema: zod_1.z.object({
        unique_id: zod_1.z.string().nonempty().describe('Unique Transcription ID or full title of the transcription. Unique Transcription ID is preferable'),
        action: zod_1.z.string().nonempty().describe('The type of Update operation. Possible values are: "rename", "delete"'),
        action_rename_new_name: zod_1.z.string().describe('New name for "rename" type of update'),
    }).shape,
    annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        destructiveHint: true
    }
}, async (args, req_extra) => {
    let tool_name = 'update-transcription';
    clog([tool_name + ':init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        let output_json = null;
        const formData = new form_data_1.default();
        formData.append('remote_tool', tool_name);
        formData.append('remote_sender', g_mcp_server_version);
        for (const [arg_name, arg_value] of Object.entries(args)) {
            formData.append(arg_name, arg_value);
        }
        const { default: nfetch } = await import('node-fetch');
        const response = await nfetch(api_url, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        output_json = await response.json();
        clog(["api_result", output_json]);
        let mcp_reply = output_json.mcp;
        if (!mcp_reply) {
            return mcp_sys_error("Remote service unaviable.");
        }
        return mcp_reply;
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return mcp_sys_error("Unexpected interruption.");
    }
});
async function main() {
    clog(["MCP server: Starting", process.versions]);
    const transport = new stdio_js_1.StdioServerTransport();
    await mcpServer.connect(transport);
}
main().catch((error) => {
    clog(["main_error", jsutils.dbgJSON(error)]);
    console.error("MCPServer error:", error);
    process.exit(1);
});
