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

- **Issues and Time Tracking**
  - Get issues with filtering options
  - Get detailed issue information
  - Manage time tracking (estimates and spent time)
  - View time tracking statistics
  - Update issue attributes
  - Close and reopen issues

- **Notes (Comments)**
  - Retrieve issue comments
  - Create new comments
  - Update existing comments
  - Delete comments

- **Label Management**
  - Get project labels
  - Create, update, and delete labels
  - Add labels to issues
  - Remove labels from issues

- **Milestone Management**
  - Get project milestones
  - Create new milestones

- **User Assignment**
  - Assign users to issues
  - Remove assignees from issues

- **Issue Relationships**
  - Create links between issues
  - Delete issue links

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
| `get_issues` | Get issues from a project with filtering options |
| `get_issue` | Get a single issue with details |
| `get_issue_time_stats` | Get time tracking statistics for an issue |
| `set_time_estimate` | Set time estimate for an issue |
| `reset_time_estimate` | Reset time estimate for an issue |
| `add_spent_time` | Add spent time to an issue |
| `reset_spent_time` | Reset spent time for an issue |
| `get_notes` | Get comments/notes for an issue |
| `create_note` | Create a comment on an issue |
| `update_note` | Update an existing comment |
| `delete_note` | Delete a comment from an issue |
| `update_issue` | Update various issue attributes |
| `close_issue` | Close an issue |
| `reopen_issue` | Reopen a closed issue |
| `get_project_labels` | Retrieve all labels for a project |
| `create_project_label` | Create a new label for a project |
| `update_project_label` | Update an existing label |
| `delete_project_label` | Delete a label from a project |
| `add_labels_to_issue` | Add specific labels to an issue |
| `remove_labels_from_issue` | Remove specific labels from an issue |
| `get_project_milestones` | Retrieve all milestones for a project |
| `create_project_milestone` | Create a new milestone for a project |
| `assign_issue` | Assign users to an issue |
| `unassign_issue` | Remove all assignees from an issue |
| `create_issue_link` | Create a link between two issues |
| `delete_issue_link` | Remove a link between issues |

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

// Example: Get all issues with time tracking stats
const issues = await claude.callMcp("gitlab", "get_issues", {
  project_id: "12345678",
  state: "opened",
  with_time_stats: true
});

// Example: Add spent time to an issue
const timeStats = await claude.callMcp("gitlab", "add_spent_time", {
  project_id: "12345678", 
  issue_iid: 42,
  duration: "1h 30m" // Format: Xh Ym
});

// Example: Get all comments on an issue
const notes = await claude.callMcp("gitlab", "get_notes", {
  project_id: "12345678",
  issue_iid: 42,
  sort: "desc",
  order_by: "created_at"
});

// Example: Update an issue
const updatedIssue = await claude.callMcp("gitlab", "update_issue", {
  project_id: "12345678",
  issue_iid: 42,
  title: "Updated issue title",
  description: "This is the updated description"
});

// Example: Create a label
const newLabel = await claude.callMcp("gitlab", "create_project_label", {
  project_id: "12345678",
  name: "enhancement",
  color: "#428BCA",
  description: "Enhancement requests"
});

// Example: Add labels to an issue
const issueWithLabels = await claude.callMcp("gitlab", "add_labels_to_issue", {
  project_id: "12345678",
  issue_iid: 42,
  labels: ["bug", "enhancement"]
});

// Example: Create a milestone
const milestone = await claude.callMcp("gitlab", "create_project_milestone", {
  project_id: "12345678",
  title: "v1.0 Release",
  description: "First stable release",
  due_date: "2025-06-30"
});

// Example: Assign users to an issue
const assignedIssue = await claude.callMcp("gitlab", "assign_issue", {
  project_id: "12345678",
  issue_iid: 42,
  assignee_ids: [123, 456]
});

// Example: Create a link between issues
const issueLink = await claude.callMcp("gitlab", "create_issue_link", {
  project_id: "12345678",
  issue_iid: 42,
  target_project_id: "12345678",
  target_issue_iid: 43,
  link_type: "relates_to"
});
```

## Improvements Over Original Implementation

This implementation includes several enhancements over the original MCP GitLab server:

1. **Comprehensive API endpoints**:
   - `delete_project`: Properly delete GitLab projects
   - `update_project`: Update project settings including visibility
   - `get_issues` & `get_issue`: Retrieve issues with filtering options
   - Time tracking endpoints: Set/reset estimates and spent time
   - Notes endpoints: Create, read, update, delete comments
   - Label management: Create, retrieve, update, and delete labels
   - Milestone management: Get milestones and create new ones
   - User assignment: Assign and unassign users to/from issues
   - Issue relationships: Create and delete links between issues

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
