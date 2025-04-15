# GitLab MCP Server

A Model Context Protocol (MCP) server for interacting with GitLab repositories with enhanced functionality.

## Overview

This MCP server allows AI assistants (like Claude) to interact with GitLab repositories, manage projects, issues, merge requests, and more. It extends the original implementation with additional endpoints and improved error handling.

## Features

- **Project Management**
  - Create new repositories (with improved group namespace support)
  - Update project settings (including visibility)
  - Delete projects
  - Fork projects
  - Search for repositories

- **File Operations**
  - Fetch file contents
  - Create or update files
  - Commit multiple files at once

- **Repository Management**
  - Create branches
  - Create issues
  - Create merge requests

## Installation

### Global Installation

```bash
npm install -g @piatra-open-source/gitlab-mcp-server
```

### Project Installation

```bash
npm install @piatra-open-source/gitlab-mcp-server
```

## Usage

### Environment Variables

You need to set the following environment variables:

- `GITLAB_PERSONAL_ACCESS_TOKEN`: Your GitLab personal access token with appropriate permissions
- `GITLAB_API_URL` (optional): Custom GitLab API URL if not using gitlab.com (defaults to 'https://gitlab.com/api/v4')

### Running the Server

```bash
export GITLAB_PERSONAL_ACCESS_TOKEN='your_token_here'
gitlab-mcp-server
```

Or in your application:

```javascript
import { execFileSync } from 'child_process';
import { join } from 'path';

// Path to the GitLab MCP Server binary
const serverPath = join(require.resolve('@piatra-open-source/gitlab-mcp-server'), '..', '..', 'bin', 'gitlab-mcp-server');

// Start the server
const childProcess = execFileSync(serverPath, {
  env: {
    ...process.env,
    GITLAB_PERSONAL_ACCESS_TOKEN: 'your_token_here'
  }
});
```

## API Reference

### Functions

| Function Name | Description |
|---------------|-------------|
| `create_repository` | Create a new GitLab project |
| `update_project` | Update project settings including visibility |
| `delete_project` | Delete a GitLab project |
| `search_repositories` | Search for GitLab projects |
| `get_file_contents` | Get file or directory contents |
| `create_or_update_file` | Create or update a single file |
| `push_files` | Commit multiple files at once |
| `create_branch` | Create a new branch |
| `fork_repository` | Fork a project |
| `create_issue` | Create a new issue |
| `create_merge_request` | Create a new merge request |

## Example Usage

```typescript
// Example: Create a repository in a specific group
const repo = await claude.callMcp("gitlab", "create_repository", {
  name: "my-new-project",
  description: "A new project created via MCP",
  visibility: "private",
  initialize_with_readme: true,
  namespace_id: "12345678"  // Group ID where the project should be created
});

// Example: Change project visibility
const updatedRepo = await claude.callMcp("gitlab", "update_project", {
  project_id: "12345678",
  visibility: "private"
});

// Example: Delete a project
const deleteResult = await claude.callMcp("gitlab", "delete_project", {
  project_id: "12345678"
});
```

## Improvements Over Original Implementation

This implementation includes several enhancements over the original MCP GitLab server:

1. **Additional API endpoints**:
   - `delete_project`: Properly delete GitLab projects
   - `update_project`: Update project settings including visibility

2. **Fixed namespace_id handling**:
   - Properly supports creating projects in group namespaces
   - Validates and passes namespace_id to the GitLab API

3. **Enhanced error handling**:
   - Detailed error messages including API response data
   - Improved validation of input parameters
   - Better feedback on authentication and permission issues

4. **Updated documentation**:
   - Clear documentation of all supported parameters
   - More complete type definitions

## Troubleshooting

### "file_path should be a valid file path" Error

If you encounter the error `GitLab API error (400): Bad Request - file_path should be a valid file path`, there are several possible causes:

1. **File Path Format**: GitLab expects file paths to be valid and properly formatted. Make sure your file path:
   - Does not contain invalid characters like `*`, `?`, `[`, `]` etc.
   - Uses forward slashes (`/`) not backslashes (`\`)
   - Is properly URL-encoded (handled by this library)

2. **Case Sensitivity**: GitLab file paths are case-sensitive. Ensure your paths match the exact case of existing files.

3. **Repository Structure**: The file path must exist in the repository structure for updates, or be valid for new files.

4. **Special Characters**: Avoid using special characters in file names when possible. If you need to use characters like `#`, `?`, `[`, `]`, be aware that they might require special handling.

### Other Common Issues

- **Authentication Failures**: Make sure your `GITLAB_PERSONAL_ACCESS_TOKEN` has the necessary permissions.
- **Permission Denied**: Ensure you have proper access rights to the repository and group.
- **Rate Limiting**: GitLab API has rate limits that may temporarily block your access if exceeded.

## License

MIT

## Attribution

This project is an enhanced version of the original [Model Context Protocol GitLab server](https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab) by Anthropic, modified and extended under the MIT license.
