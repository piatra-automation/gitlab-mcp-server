# GitLab MCP Server - Desktop Extension (DXT)

This is a Desktop Extension (DXT) package for the GitLab MCP Server, enabling seamless integration with AI assistants like Claude for GitLab repository management.

## Installation

### From Release
1. Download the latest `.dxt` file from the releases
2. Install using the DXT CLI:
   ```bash
   dxt install gitlab-mcp-server.dxt
   ```

### From Source
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Package as DXT:
   ```bash
   dxt pack .
   ```

## Configuration

The extension requires GitLab authentication credentials. You can configure these through:

### Environment Variables
```bash
export GITLAB_PERSONAL_ACCESS_TOKEN="your-token-here"
export GITLAB_API_URL="https://gitlab.com/api/v4"  # Optional, defaults to gitlab.com
```

### DXT Configuration
When installing through DXT, you'll be prompted to configure:
- `gitlab_personal_access_token` (required): Your GitLab personal access token
- `gitlab_api_url` (optional): Custom GitLab API URL for self-hosted instances

## Creating a GitLab Personal Access Token

1. Log in to your GitLab account
2. Go to **User Settings** → **Access Tokens**
3. Create a new token with the following scopes:
   - `api` - Full API access
   - `read_repository` - Read repository content
   - `write_repository` - Write repository content
4. Copy the generated token and use it in the configuration

## Features

This DXT extension provides comprehensive GitLab integration including:

### Repository Management
- Create, update, delete repositories
- Fork projects
- Search repositories
- Manage project visibility

### File Operations
- Read file contents
- Create/update files
- Commit multiple files at once
- Create branches

### Issue Management
- Create, update, close/reopen issues
- Time tracking (estimates and spent time)
- Add/remove labels
- Assign/unassign users
- Create issue relationships

### Collaboration
- Create merge requests
- Manage comments/notes on issues
- Create and manage milestones
- Label management

## Debugging

Enable debug logging by setting the environment variable:
```bash
export DXT_DEBUG=true
```

This will output detailed logs to help troubleshoot any issues.

## Error Handling

The extension includes:
- Automatic retry logic for rate-limited requests
- Timeout handling (30s default)
- Detailed error messages with GitLab API responses
- Graceful shutdown on SIGINT/SIGTERM

## Example Usage

Once installed, the extension will be available to AI assistants. Here are some example commands:

```typescript
// Create a new repository
await createRepository({
  name: "my-project",
  description: "A new project",
  visibility: "private"
});

// Create an issue with time tracking
await createIssue({
  project_id: "12345",
  title: "Implement new feature",
  description: "Feature description",
  labels: ["enhancement"]
});

// Add time estimate
await setTimeEstimate({
  project_id: "12345",
  issue_iid: 42,
  duration: "2h"
});
```

## Troubleshooting

### Authentication Errors
- Ensure your personal access token has the required scopes
- Check that the token hasn't expired
- Verify the API URL is correct for your GitLab instance

### Rate Limiting
The extension automatically handles rate limiting by:
- Waiting for the specified retry-after period
- Retrying requests up to 3 times
- Logging warnings when rate limited

### Connection Issues
- Check your internet connection
- Verify the GitLab API URL is accessible
- Ensure any corporate proxies are properly configured

## License

MIT - See LICENSE file for details

## Support

For issues or feature requests, please visit:
https://gitlab.com/piatra-automation/gitlab-mcp-server/-/issues