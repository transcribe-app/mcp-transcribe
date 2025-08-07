#!/usr/bin/env node

// Transcribe.com MCP Server
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { CallToolResult, McpError, ErrorCode, ReadResourceResult, ResourceLink } from "@modelcontextprotocol/sdk/types.js";
// import getPath from 'platform-folders'; // Not working in restricted NodeJS envs (chat client)
import FormData from 'form-data';
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import * as jsutils from './jsutils.js';

let g_mcp_server_version = '1.0.3'; // Auto-replaced (by regex)
let g_api_url = jsutils.safeStr(process.env["MCP_INTEGRATION_URL"]);
let g_debug_file = jsutils.safeStr(process.env["MCP_DEBUG_FILE"]);
let g_max_upload_size = 300*1000*1000;
let kMcpMaxLastOps = 100;
// let g_files:any = {};
const mcp_query_oplist_wscheme = z.object({
	transcriptions: z.array(z.object({
		title: z.string().describe("Transcription title"),
		lang: z.string().describe("Transcription language (BCP-47 language code)"),
		creation_date: z.string().describe("Transcription creation date in ISO format"),
		unique_id: z.string().describe("Transcription ID, should be used for deleting and renaming transcriptions"),
		text_content: z.string().optional().describe("Transcription text"),
	}))
})

// Create an MCP server
const mcpServer = new McpServer(
	{
		name: 'Transcribe.com-mcp-local-server',
		title: 'Transcribe.com tools',
		version: g_mcp_server_version
	}, 
	{ 
		capabilities: { 
			logging: {}
		},
		instructions: "Transcribe.com MCP Server for converting speech to text\n"+
		"⚠️ IMPORTANT: This server provides access to Transcribe.com endpoints which may incur costs.\n"+
		"Each tool that makes an API call is marked with a cost warning.\n"+
		"Tools without cost warnings in their description are free to use as they only read existing data."
	}
);

async function clog(message:any) {
	try{
		// // Testing debug paths
		// if(g_debug_file.length == 0){
		// 	if(fs.existsSync("/Users/***/Downloads/")){
		// 		g_debug_file = "/Users/***/Downloads/mcp_dbg.log";
		// 	}else if(fs.existsSync("/Users/***/Downloads/")){
		// 		g_debug_file = "/Users/***/Downloads/mcp_dbg.log";
		// 	}
		// }
		if(g_debug_file.length == 0){
			return;
		}
		if(!message || (typeof message !== "string")){
			message = JSON.stringify(message);
		}
		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} - ${message}\n`;
		fs.appendFileSync(g_debug_file, logEntry);
	}catch(e){
		console.error("clog failed",e);
	}
}

function mcp_sys_error(message:string, so:any=null){
	clog(['mcp_error', message]);
	let result:any = {
		content: [
			{
				type: 'text',
				text: "Error: "+message,
			},
		],
		isError: true,
	}
	if(so){
		result["structuredContent"] = so;
	}
	return result;
}
function mcp_sys_text(message:string, so:any=null){
	clog(['mcp_text', message]);
	let result:any = {
		content: [
			{
				type: 'text',
				text: message,
			},
		],
	}
	if(so){
		result["structuredContent"] = so;
	}
	return result;
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
// 		clog(['resource-request', uri, args]);
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
mcpServer.registerTool('get-balance',
	{
		title: 'Get Transcribe.com balance',
		description: "Use this to read user balance, returns amount of time credits in hours."
		+ "\nTool retrieves account balance of the user at Transcribe.com",
		annotations: {
			readOnlyHint: true,
			idempotentHint: true
		}
	},
	async (args, req_extra): Promise<any> => {
		let tool_name = 'get-balance';
		clog([tool_name+':init', args, req_extra]);
		try{
			if(g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0){
				return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
			}
			let api_url = g_api_url.replace("/remote_tools","/remote_exec");
			let output_json:any = null;
			const formData = new FormData();// Blob madness => any
			formData.append('remote_tool', tool_name);
			formData.append('remote_sender', g_mcp_server_version);
			const { default: nfetch } = await import('node-fetch');
			const response = await nfetch(api_url, {
				method: 'POST',
				body: formData,
				headers: formData.getHeaders()
			})
			output_json = await response.json();
			clog(["api_result", output_json]);
			let balance_h = output_json.text
			return mcp_sys_text(balance_h)
		}catch(error){
			clog(["internal_error", jsutils.dbgJSON(error)]);
			return mcp_sys_error("Unexpected interruption.");
		}
	}
);
mcpServer.registerTool('convert-to-text',
	{
		title: 'Transcribe file to text',
		description: "Use this to transcribe speech to text from an audio file located in file system, to convert audio file into text."
		+ "\nTool adds transcription to user transcriptions at Transcribe.com."
		+ "\n⚠️ COST WARNING: This tool makes an API call which may incur costs.",
		inputSchema: { 
			audio_file_path: z.string().describe('Path of the audio File'),
			language_code: z.string().describe('BCP-47 language code for transcription (default: "en-US" for US English)').default('en-US'),
			should_save_text_to_output_directory: z.boolean().describe('Whether to save the text to a file in output directory').default(false),
			should_return_text_to_client: z.boolean().describe('Whether to return the text to the client directly').default(true),
			output_directory: z.string().describe('Output directory where text file should be saved.'),
		},
		annotations: {
			readOnlyHint: false,
			idempotentHint: false
		}
	},
	async (args, req_extra): Promise<any> => {
		let tool_name = 'convert-to-text';
		clog([tool_name+':init', args, req_extra]);
		try{
			if(g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0){
				return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
			}
			let api_url = g_api_url.replace("/remote_tools","/remote_exec");
			if(!args.should_save_text_to_output_directory && !args.should_return_text_to_client){
				return mcp_sys_error("Must save text to file or return it to the client directly.");
			}
			if(args.should_save_text_to_output_directory && jsutils.safeLen(args.output_directory) == 0){
				return mcp_sys_error("Output directory must be specified.");
			}
			let input_lang = jsutils.safeStr(args?.language_code);
			if(input_lang.length == 0){
				input_lang = "en-US";
			}
			let input_path = jsutils.safeStr(args?.audio_file_path);
			if(input_path.length == 0){
				return mcp_sys_error("Input file path is not provided or path not valid.");
			}
			let input_filename:string = input_path;
			let input_filedata:Buffer|null = null;
			if(input_path.indexOf("http://") < 0 && input_path.indexOf("https://") < 0){
				input_filename = path.basename(input_path);
				try {
					const stats = fs.statSync(input_path);
					const fileSizeInBytes = stats.size;
					if(fileSizeInBytes > g_max_upload_size){
						return mcp_sys_error("Input file too big. The maximum size for upload is 300mb.");
					}
					input_filedata = await fs.readFileSync(input_path);
				} catch (error) {
					clog(["file_error", jsutils.dbgJSON(error)]);
					return mcp_sys_error("Input file path is not valid or not accessible.");
				}
			}
			let output_json:any = {};
			try{
				const formData = new FormData();// Blob madness => any
				formData.append('remote_tool', tool_name);
				formData.append('remote_sender', g_mcp_server_version);
				formData.append('file_name', input_filename);
				formData.append('file_lang', input_lang);
				if(input_filedata != null){
					formData.append('file_data', input_filedata, input_filename);
					clog(["api_request_file", input_filename, input_lang, input_filedata.length]);
				}else{
					clog(["api_request_url", input_filename, input_lang]);
				}
				const { default: nfetch } = await import('node-fetch');
				const response = await nfetch(api_url, {
					method: 'POST',
					body: formData,
					headers: formData.getHeaders()
				})
				output_json = await response.json();
				clog(["api_result", output_json]);
			}catch(error){
				clog(["upload_error", jsutils.dbgJSON(error)]);
				return mcp_sys_error("Failed to upload file for further processing.");
			}
			if(!output_json || output_json?.status != 'ok'){
				return mcp_sys_error("Failed to process file.");
			}
			let output_result = jsutils.safeStr(output_json.text);
			if(args.should_save_text_to_output_directory){
				let output_path = "???";
				try{
					let downloads_path:string = args.output_directory;
					// downloads_path = jsutils.safeStr(getPath('downloads'));
					// if(downloads_path.length == 0){
					// 	downloads_path = jsutils.safeStr(getPath('desktop'));
					// }
					if(downloads_path.length == 0){
						return mcp_sys_error("Failed to get output folder.");
					}
					let downloads_name = input_filename+".txt";
					output_path = path.join(downloads_path,downloads_name);
					clog(["return_file v1", output_path]);
					fs.writeFileSync(output_path, output_result);
				}catch(error){
					clog(["save_error", jsutils.dbgJSON(error)]);
					return mcp_sys_error(`Failed to save file into ${output_path}.`);
				}
				args.should_return_text_to_client = false;
				output_result = `Transcription saved to ${output_path}`;
			}
			if(args.should_return_text_to_client){
				return mcp_sys_text(output_result);
				// ??? https://github.com/tkellogg/pagefind-mcp/blob/4b4b426d895b9830e4d5a0c0787af578f3f3ca61/pagefind-mcp.js#L18
				
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
			return mcp_sys_text(output_result);
		}catch(error){
			clog(["internal_error", jsutils.dbgJSON(error)]);
			return mcp_sys_error("Unexpected interruption.");
		}
	}
);

mcpServer.registerTool(
	"read-transcriptions",
	{
		title: "Retrieve text content of ready transcriptions",
		description: "Use this to get text content and titles of ready transcriptions."
		+ "\nTool can read and retrieve user transcriptions saved at Transcribe.com."
		+ "\nResults may be limited by a keyword-focused search query applied to the transcription title or the transcription content."
		+ "\nSearch query is case-insensitive. Most recently added transcriptions are returned first.",
		// + "\nResults are numbered continuously, so that a user may be able to refer to a result by a specific number.",
		inputSchema: z.object({
			search_query: z.string().optional().describe('One or more keyword-focused search query for looking in transcription title or content. Leave this blank when requesting all transcriptions.').default(''),
			limit: z.number().describe('Maximum number of recent transcriptions to return. Maximum: '+kMcpMaxLastOps+' transcriptions').default(10),
		}).shape,
		outputSchema: mcp_query_oplist_wscheme.shape,
		annotations: {
			readOnlyHint: true,
			idempotentHint: true
		}
	},
	async (args, req_extra) => {
		let tool_name = 'read-transcriptions';
		clog([tool_name+':init', args, req_extra]);
		try{
			if(g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0){
				return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
			}
			let api_url = g_api_url.replace("/remote_tools","/remote_exec");
			let output_json:any = null;
			const formData = new FormData();
			formData.append('remote_tool', tool_name);
			formData.append('remote_sender', g_mcp_server_version);
			for(const [arg_name, arg_value] of Object.entries(args)){
				formData.append(arg_name, arg_value);
			}
			const { default: nfetch } = await import('node-fetch');
			const response = await nfetch(api_url, {
				method: 'POST',
				body: formData,
				headers: formData.getHeaders()
			})
			output_json = await response.json();
			clog(["api_result", output_json]);
			let mcp_reply = output_json.mcp;
			if(!mcp_reply){
				return mcp_sys_error("Remote service unaviable.");
			}
			return mcp_reply;
		}catch(error){
			clog(["internal_error", jsutils.dbgJSON(error)]);
			return mcp_sys_error("Unexpected interruption.");
		}
	}
);

mcpServer.registerTool(
	"update-transcription",
	{
		title: "Update or delete transcription",
		description: "Use this to rename transcription or delete transcription."
		+ "\nTool can update user transcriptions saved at Transcribe.com.",
		inputSchema: z.object({
			unique_id: z.string().nonempty().describe('Unique Transcription ID or full title of the transcription. Unique Transcription ID is preferable'),
			action: z.string().nonempty().describe('The type of Update operation. Possible values are: "rename", "delete"'),
			action_rename_new_name: z.string().describe('New name for "rename" type of update'),
		}).shape,
		annotations: {
			readOnlyHint: false,
			idempotentHint: false,
			destructiveHint: true
		}
	},
	async (args, req_extra) => {
		let tool_name = 'update-transcription';
		clog([tool_name+':init', args, req_extra]);
		try{
			if(g_api_url.length == 0 || g_api_url.indexOf("/remote_tools") < 0){
				return mcp_sys_error("MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.");
			}
			let api_url = g_api_url.replace("/remote_tools","/remote_exec");
			let output_json:any = null;
			const formData = new FormData();
			formData.append('remote_tool', tool_name);
			formData.append('remote_sender', g_mcp_server_version);
			for(const [arg_name, arg_value] of Object.entries(args)){
				formData.append(arg_name, arg_value);
			}
			const { default: nfetch } = await import('node-fetch');
			const response = await nfetch(api_url, {
				method: 'POST',
				body: formData,
				headers: formData.getHeaders()
			})
			output_json = await response.json();
			clog(["api_result", output_json]);
			let mcp_reply = output_json.mcp;
			if(!mcp_reply){
				return mcp_sys_error("Remote service unaviable.");
			}
			return mcp_reply;
		}catch(error){
			clog(["internal_error", jsutils.dbgJSON(error)]);
			return mcp_sys_error("Unexpected interruption.");
		}
	}
);

async function main() {
	clog(["MCP server: Starting", process.versions]);
	// Access validation: on tool invocation only
	// - https://smithery.ai/docs/build/deployments#best-practices
	// if(api_url.length == 0){
	// 	// throw new Error('MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.');
	// 	throw new McpError(
	// 		ErrorCode.InvalidParams,
	// 		'MCP_INTEGRATION_URL environment variable is not set. Please configure the server correctly.'
	// 	);
	// }
	const transport = new StdioServerTransport();
	await mcpServer.connect(transport);
}
main().catch((error) => {
	clog(["main_error", jsutils.dbgJSON(error)])
	console.error("MCPServer error:", error);
	process.exit(1);
});
