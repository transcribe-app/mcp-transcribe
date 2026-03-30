<h3 align="center">Transcribe MCP</h3>

<p align="center">
  Automate your transcriptions with AI.
  <br />
  <a href="https://transcribe.com"><strong>Website</strong></a> 
</p>

# About

Transcribe MCP instantly connects your account to assistants like Claude, Windsurf, Cursor, and more so they can automate tasks on your behalf. The Local Server can add local files for transcription and return result to your Assistant in seconds.

# Features
- ⚡ Fast, lightweight and LLM-friendly. No special ASR models needed, no setup and fighting python packages, results in seconds.
- 🏆 High-quality transcriptions. Works with noisy audio, over 100 languages supported, featuring word-level timestamps and speaker separation.
- 🔋 Wide variety of formats out-of-the-box and Cloud storage for your audio notes and records.
- 👥 Collaboration support via Transcribe.com teams feature

## 🚀 Local installation: Claude Desktop

🔹 Get your private MCP integration URL
- Sign in to the Transcribe [online editor](https://transcribe.com/app)
- Copy your private URL from Automation popup

🔹 Download pre-built MCP Bundle (MCPB): [Click Here](https://transcribe.com/mcp-integration#jumpto=mcp_download_mcpb)

📦 The MCPB includes:

- ✅ One-click installation in Claude Desktop
- ✅ Secure environment variable configuration
- ✅ Automatic dependency management
- ✅ Built-in error handling and debugging
- ✅ The MCPB file is automatically updated for the latest features and fixes

### Option 1: Double-Click Installation (Recommended)
- Double-click the .mcpb file
- Claude Desktop will automatically install the extension
- Follow the configuration prompts

### Option 2: Manual Installation
- Open Claude Desktop
- Go to Settings → Extensions
- Click "Install Extension" and select the .mcpb file

### Configuration
During installation, you'll be prompted to configure MCP integration URL. Paste your private URL.

## 🚀 Local installation: Other assistants

🔹 Get your private MCP integration URL
- Sign in to the Transcribe [online editor](https://transcribe.com/app)
- Copy your private URL from Automation popup

🔹 Before installing the server, ensure you have Node.js and Git
- Download from: https://nodejs.org/
- Verify Node with: node --version
- Verify NPX with: npx --version

🔹 Add Local Server via your assistant settings and use this snippet for server setup:

```
{
  "key": "transcribe-local",
  "command": "npx",
  "args": [
    "args": ["-y", "github:transcribe-app/mcp-transcribe"],
  ],
  "env": {
    "MCP_INTEGRATION_URL": "<your-MCP-integration-URL>"
  }
}
```

### Configuration
Replace \<your-MCP-integration-URL\> with your private URL.

---

## ⚡ Available Tools

List of tools is expanded with each new version.

1\. `convert-to-text`: converts audio to text and returns the text immediately.
- Note: This tool use your time credits.
- Note: Remote server expect public-accessible URL, Local Server can use both URL and a path to local file in your file system.

2\. `get-balance`: returns balance of your account.

3\. `read-transcriptions`: returns content of ready transcriptions with optional filtering/search.

4\. `update-transcription`: renames or deletes transcriptions in your account at Transcribe.com


## 💡 Security Notes

- **Private URL**: Store your private URL securely, do not share it with others

## ⚠️ Troubleshooting

### "MCP_INTEGRATION_URL environment variable is required"
- Sign in to the Transcribe [online editor](https://transcribe.com/app)
- Copy your private URL from Automation popup
- Add it as server's "MCP_INTEGRATION_URL" environment variable in your AI assistant settings

### Extension Won't Install
- Ensure you have the latest Claude Desktop version
- Check that `node` is installed and in your PATH

## Hosted deployment

A hosted deployment is available on [Fronteir AI](https://fronteir.ai/mcp/transcribe-app-mcp-transcribe).

