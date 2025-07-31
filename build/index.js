"use strict";
// Transcribe.com MCP Server
// Test PP: Покажи мой баланс
// Test PP: Покажи мой баланс в transcribe.com
// Test PP: Please transcribe audio at "/Users/ipv6/Documents/Denivip/zzz/Transcribe/conf_2speak_20sec.mp3" in English
// Test PP: Сконвертируй аудио в файле "/Users/ipv6/Documents/Denivip/zzz/Transcribe/conf_2speak_20sec.mp3" в текст, язык английский
// Test PP: Сконвертируй аудио в файле “/Users/ipv6/Documents/Denivip/zzz/Transcribe/conf_2speak_20sec.mp3” в текст, язык английский и сохрани в папку Downloads
// Test PP: Сконвертируй аудио в файле “/Users/ipv6/Documents/Denivip/zzz/Transcribe/conf_2speak_20sec.mp3” в текст, язык английский и сохрани в папку Downloads. Баланс можно не проверять
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
// import getPath from 'platform-folders'; // Not working in restricted NodeJS envs (chat client)
const form_data_1 = __importDefault(require("form-data"));
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsutils = __importStar(require("./jsutils.js"));
let g_api_url = jsutils.safeStr(process.env["MCP_INTEGRATION_URL"]);
let g_debug_file = jsutils.safeStr(process.env["MCP_DEBUG_FILE"]);
let g_max_upload_size = 300 * 1000 * 1000;
let g_files = {};
// Create an MCP server
const mcpServer = new mcp_js_1.McpServer({
    name: 'Transcribe.com-mcp-local-server',
    title: 'Transcribe.com tools',
    version: '1.0.0'
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
        // // Testing debug paths
        // if(g_debug_file.length == 0){
        // 	if(fs.existsSync("/Users/ipv6/Downloads/")){
        // 		g_debug_file = "/Users/ipv6/Downloads/mcp_dbg.log";
        // 	}else if(fs.existsSync("/Users/denisbulichenko/Downloads/")){
        // 		g_debug_file = "/Users/denisbulichenko/Downloads/mcp_dbg.log";
        // 	}
        // }
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
function get_mcp_error(message) {
    clog(['mcp_error', message]);
    return {
        content: [
            {
                type: 'text',
                text: "Error: " + message,
            },
        ],
        isError: true,
    };
}
// mcpServer.registerResource(
// 	"transcription",
// 	new ResourceTemplate("tcom-data://{file_name}",{list: undefined}),
// 	{
// 		title: 'Transcription text',
// 		description: 'Audio file transcription',
// 		mimeType: 'text/plain'
// 	},
// 	async (uri, args): Promise<ReadResourceResult> => {
// 		clog(['transcribe-file-resource-request', uri, args]);
// 		let data_text = jsutils.safeStr(g_files[ jsutils.safeStr(args?.file_name) ])
// 		return {
// 			contents: [{
// 				uri: uri?.href,
// 				text: data_text
// 			}]
// 		}
// 	}
// );
// Add an addition tool
mcpServer.registerTool('transcribe-file-get-balance', {
    description: "Use this to retrieve Transcribe.com account balance of the user, returns amount of time credits in hours.",
    annotations: {
        title: 'Get Transcribe.com balance',
        readOnlyHint: true,
        idempotentHint: true
    }
}, async (args, req_extra) => {
    clog(['transcribe-file-get-balance init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return get_mcp_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        let output_json = null;
        const formData = new form_data_1.default(); // Blob madness => any
        formData.append('remote_tool', "transcribe-file-get-balance");
        const { default: nfetch } = await import('node-fetch');
        const response = await nfetch(api_url, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        output_json = await response.json();
        clog(["api_result", output_json]);
        let balance_h = output_json.text;
        return {
            content: [
                {
                    type: 'text',
                    text: balance_h
                },
            ]
        };
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return get_mcp_error("Unexpected interruption.");
    }
});
mcpServer.registerTool('transcribe-file-convert-to-text', {
    description: "Use this to transcribe speech to text from an audio file located in file system, to convert audio file into text."
        + "\n⚠️ COST WARNING: This tool makes an API call which may incur costs.",
    inputSchema: {
        audio_file_path: zod_1.z.string().describe('Path of the audio File'),
        language_code: zod_1.z.string().describe('BCP-47 language code for transcription (default: "en-US" for US English)').default('en-US'),
        should_save_text_to_output_directory: zod_1.z.boolean().describe('Whether to save the text to a file in output directory').default(false),
        should_return_text_to_client: zod_1.z.boolean().describe('Whether to return the text to the client directly').default(true),
        output_directory: zod_1.z.string().describe('Output directory where text file should be saved.'),
    },
    annotations: {
        title: 'Transcribe file to text',
        readOnlyHint: false,
        idempotentHint: false
    }
}, async (args, req_extra) => {
    clog(['transcribe-url-convert-to-text init', args, req_extra]);
    try {
        if (g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0) {
            return get_mcp_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
        }
        let api_url = g_api_url.replace("/remote_tools", "/remote_exec");
        if (!args.should_save_text_to_output_directory && !args.should_return_text_to_client) {
            return get_mcp_error("Must save text to file or return it to the client directly.");
        }
        if (args.should_save_text_to_output_directory && jsutils.safeLen(args.output_directory) == 0) {
            return get_mcp_error("Output directory must be specified.");
        }
        let input_lang = jsutils.safeStr(args?.language_code);
        if (input_lang.length == 0) {
            input_lang = "en-US";
        }
        let input_path = jsutils.safeStr(args?.audio_file_path);
        if (input_path.length == 0) {
            return get_mcp_error("Input file path is not provided or path not valid.");
        }
        let input_filename = input_path;
        let input_filedata = null;
        if (input_path.indexOf("http://") < 0 && input_path.indexOf("https://") < 0) {
            input_filename = path.basename(input_path);
            try {
                const stats = fs.statSync(input_path);
                const fileSizeInBytes = stats.size;
                if (fileSizeInBytes > g_max_upload_size) {
                    return get_mcp_error("Input file too big. The maximum size for upload is 300mb.");
                }
                input_filedata = await fs.readFileSync(input_path);
            }
            catch (error) {
                clog(["file_error", jsutils.dbgJSON(error)]);
                return get_mcp_error("Input file path is not valid or not accessible.");
            }
        }
        let output_json = {};
        try {
            const formData = new form_data_1.default(); // Blob madness => any
            formData.append('remote_tool', "transcribe-file-convert-to-text");
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
            return get_mcp_error("Failed to upload file for further processing.");
        }
        if (!output_json || output_json?.status != 'ok') {
            return get_mcp_error("Failed to process file.");
        }
        let output_result = jsutils.safeStr(output_json.text);
        if (args.should_save_text_to_output_directory) {
            let output_path = "???";
            try {
                let downloads_path = args.output_directory;
                // downloads_path = jsutils.safeStr(getPath('downloads'));
                // if(downloads_path.length == 0){
                // 	downloads_path = jsutils.safeStr(getPath('desktop'));
                // }
                if (downloads_path.length == 0) {
                    return get_mcp_error("Failed to get output folder.");
                }
                let downloads_name = input_filename + ".txt";
                output_path = path.join(downloads_path, downloads_name);
                clog(["return_file v1", output_path]);
                fs.writeFileSync(output_path, output_result);
            }
            catch (error) {
                clog(["save_error", jsutils.dbgJSON(error)]);
                return get_mcp_error(`Failed to save file into ${output_path}.`);
            }
            args.should_return_text_to_client = false;
            output_result = `Transcription saved to ${output_path}`;
        }
        if (args.should_return_text_to_client) {
            clog(["return_text v4", output_result]);
            return {
                content: [
                    {
                        type: 'text',
                        text: output_result,
                    },
                ]
            };
            // let downloads_name = input_filename+".txt";
            // let data_uri = `tcom-data://${downloads_name}`
            // g_files[downloads_name] = output_result;
            // clog(["return_resource_link v5", data_uri);
            // let result: ResourceLink = {
            // 	type: 'resource_link',
            // 	uri: data_uri,
            // 	name: downloads_name,
            // 	mimeType: "text/plain",
            // 	description: 'Audio transcription'
            // };
            // return {
            // 	content: [
            // 		result
            // 	]
            // }
            // clog(["return_resource v4", output_result]);
            // return {
            // 	content: [
            // 		{
            // 			type: 'resource', 
            // 			resource: {
            // 				uri: data_uri,
            // 				mimeType: "text/plain",
            // 				text: output_result
            // 				// blob: Buffer.from(output_result).toString('base64')
            // 			}
            // 		},
            // 	]
            // }
        }
        clog(["unknown_action", output_result]);
        return {
            content: [
                {
                    type: 'text',
                    text: output_result
                },
            ]
        };
    }
    catch (error) {
        clog(["internal_error", jsutils.dbgJSON(error)]);
        return get_mcp_error("Unexpected interruption.");
    }
});
async function main() {
    clog(["MCP server: Starting", process.versions]);
    // if(api_url.length == 0){
    // 	// throw new Error('MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.');
    // 	throw new McpError(
    // 		ErrorCode.InvalidParams,
    // 		'MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.'
    // 	);
    // }
    const transport = new stdio_js_1.StdioServerTransport();
    await mcpServer.connect(transport);
}
main().catch((error) => {
    clog(["main_error", jsutils.dbgJSON(error)]);
    console.error("MCPServer error:", error);
    process.exit(1);
});
