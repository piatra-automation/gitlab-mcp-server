#!/usr/bin/env node
  
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import type { Response } from './types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  GitLabForkSchema,
  GitLabReferenceSchema,
  GitLabRepositorySchema,
  GitLabIssueSchema,
  GitLabMergeRequestSchema,
  GitLabContentSchema,
  GitLabCreateUpdateFileResponseSchema,
  GitLabSearchResponseSchema,
  GitLabTreeSchema,
  GitLabCommitSchema,
  GitLabTimeStatsSchema,
  GitLabNoteSchema,
  GitLabEnhancedIssueSchema,
  CreateRepositoryOptionsSchema,
  CreateIssueOptionsSchema,
  CreateMergeRequestOptionsSchema,
  CreateBranchOptionsSchema,
  CreateOrUpdateFileSchema,
  SearchRepositoriesSchema,
  CreateRepositorySchema,
  GetFileContentsSchema,
  PushFilesSchema,
  CreateIssueSchema,
  CreateMergeRequestSchema,
  ForkRepositorySchema,
  CreateBranchSchema,
  DeleteProjectSchema,
  UpdateProjectSchema,
  GetIssuesSchema,
  GetIssueSchema,
  GetTimeStatsSchema,
  TimeTrackingSchema,
  GetNotesSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  DeleteNoteSchema,
  type GitLabFork,
  type GitLabReference,
  type GitLabRepository,
  type GitLabIssue,
  type GitLabMergeRequest,
  type GitLabContent,
  type GitLabCreateUpdateFileResponse,
  type GitLabSearchResponse,
  type GitLabTree,
  type GitLabCommit,
  type GitLabTimeStats,
  type GitLabNote,
  type GitLabEnhancedIssue,
  type FileOperation,
} from './schemas.js';

const server = new Server({
  name: "gitlab-mcp-server",
  version: "1.1.2",
}, {
  capabilities: {
    tools: {}
  }
});

const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
  console.error("GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set");
  process.exit(1);
}

/**
 * Utility function to properly encode file paths for GitLab API
 * Keeps forward slashes as-is while encoding other special characters
 */
function encodeGitLabPath(filePath: string): string {
  return encodeURIComponent(filePath).replace(/%2F/g, '/');
}

/**
 * Helper function to handle API errors with better messages
 */
async function handleApiError(response: Response): Promise<never> {
  const errorText = await response.text();
  let errorMessage = `GitLab API error (${response.status}): ${response.statusText}`;
  
  try {
    // Try to parse the error as JSON
    const errorJson = JSON.parse(errorText);
    if (errorJson.message) {
      errorMessage += ` - ${errorJson.message}`;
      
      // Special handling for file path errors
      if (errorJson.message.includes('file_path') && response.status === 400) {
        errorMessage += `. Make sure the file path is correct and properly formatted. Remember that paths are case-sensitive.`;
      }
    } else if (errorJson.error) {
      errorMessage += ` - ${errorJson.error}`;
    }
  } catch (e) {
    // If we can't parse as JSON, just use the raw text
    if (errorText) {
      errorMessage += ` - ${errorText}`;
    }
  }
  
  throw new Error(errorMessage);
}

async function forkProject(
  projectId: string,
  namespace?: string
): Promise<GitLabFork> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/fork`;
  const queryParams = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';

  const response = await fetch(url + queryParams, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabForkSchema.parse(await response.json());
}

async function createBranch(
  projectId: string,
  options: z.infer<typeof CreateBranchOptionsSchema>
): Promise<GitLabReference> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/branches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        branch: options.name,
        ref: options.ref
      })
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabReferenceSchema.parse(await response.json());
}

async function getDefaultBranchRef(projectId: string): Promise<string> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    {
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
      }
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  const project = GitLabRepositorySchema.parse(await response.json());
  return project.default_branch;
}

async function getFileContents(
  projectId: string,
  filePath: string,
  ref?: string
): Promise<GitLabContent> {
  // Check for potentially problematic file paths
  if (filePath.includes('#') || filePath.includes('?') || filePath.includes('[') || filePath.includes(']')) {
    console.warn(`Warning: File path '${filePath}' contains special characters that may cause issues with GitLab API. Consider renaming the file.`);
  }
  
  // Ensure file path is properly encoded
  const encodedPath = encodeGitLabPath(filePath);
  let url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;
  if (ref) {
    url += `?ref=${encodeURIComponent(ref)}`;
  }

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  const data = GitLabContentSchema.parse(await response.json());
  
  if (!Array.isArray(data) && data.content) {
    data.content = Buffer.from(data.content, 'base64').toString('utf8');
  }

  return data;
}

async function createIssue(
  projectId: string,
  options: z.infer<typeof CreateIssueOptionsSchema>
): Promise<GitLabIssue> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        assignee_ids: options.assignee_ids,
        milestone_id: options.milestone_id,
        labels: options.labels?.join(',')
      })
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabIssueSchema.parse(await response.json());
}

async function createMergeRequest(
  projectId: string,
  options: z.infer<typeof CreateMergeRequestOptionsSchema>
): Promise<GitLabMergeRequest> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/merge_requests`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: options.title,
        description: options.description,
        source_branch: options.source_branch,
        target_branch: options.target_branch,
        allow_collaboration: options.allow_collaboration,
        draft: options.draft
      })
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabMergeRequestSchema.parse(await response.json());
}

async function createOrUpdateFile(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch: string,
  previousPath?: string
): Promise<GitLabCreateUpdateFileResponse> {
  // Ensure file path is properly encoded
  const encodedPath = encodeGitLabPath(filePath);
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;

  const body = {
    branch,
    content,
    commit_message: commitMessage,
    ...(previousPath ? { previous_path: previousPath } : {})
  };

  // Add better error handling for file path issues
  let method = "POST";
  
  try {
    await getFileContents(projectId, filePath, branch);
    method = "PUT";
  } catch (error) {
    // File doesn't exist, use POST
    // But if the error is not a 404, it could be a file path issue
    if (error instanceof Error && !error.message.includes("404")) {
      // Check if it's likely a file path error
      if (error.message.includes("file_path") || error.message.includes("Bad Request")) {
        throw new Error(`Invalid file path format for '${filePath}'. Make sure the path is correct and properly formatted.`);
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabCreateUpdateFileResponseSchema.parse(await response.json());
}

async function createTree(
  projectId: string,
  files: FileOperation[],
  ref?: string
): Promise<GitLabTree> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/tree`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: files.map(file => ({
          file_path: file.path,
          content: file.content
        })),
        ...(ref ? { ref } : {})
      })
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTreeSchema.parse(await response.json());
}

async function createCommit(
  projectId: string,
  message: string,
  branch: string,
  actions: FileOperation[]
): Promise<GitLabCommit> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/commits`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        branch,
        commit_message: message,
        actions: actions.map(action => ({
          action: "create",
          file_path: action.path,
          content: action.content
        }))
      })
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabCommitSchema.parse(await response.json());
}

async function searchProjects(
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<GitLabSearchResponse> {
  const url = new URL(`${GITLAB_API_URL}/projects`);
  url.searchParams.append("search", query);
  url.searchParams.append("page", page.toString());
  url.searchParams.append("per_page", perPage.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  const projects = await response.json();
  return GitLabSearchResponseSchema.parse({
    count: parseInt(response.headers.get("X-Total") || "0"),
    items: projects
  });
}

async function createRepository(
  options: z.infer<typeof CreateRepositoryOptionsSchema>
): Promise<GitLabRepository> {
  // Create the request body with all valid parameters
  const requestBody: Record<string, any> = {
    name: options.name,
    description: options.description,
    visibility: options.visibility,
    initialize_with_readme: options.initialize_with_readme
  };

  // Add namespace_id if it exists
  if (options.namespace_id !== undefined) {
    requestBody.namespace_id = options.namespace_id;
  }

  // Make the API request
  const response = await fetch(`${GITLAB_API_URL}/projects`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabRepositorySchema.parse(await response.json());
}

/**
 * Delete a GitLab project
 */
async function deleteProject(
  projectId: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  // GitLab returns either a 204 No Content or a JSON message
  if (response.status === 204) {
    return { message: "Project deleted successfully" };
  }

  const result = await response.json();
  return { message: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Project deleted' };
}

/**
 * Update a GitLab project's settings
 */
async function updateProject(
  projectId: string,
  options: {
    name?: string,
    description?: string,
    visibility?: 'private' | 'internal' | 'public',
    default_branch?: string,
    topics?: string[]
  }
): Promise<GitLabRepository> {
  const response = await fetch(
    `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(options)
    }
  );

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabRepositorySchema.parse(await response.json());
}

/**
 * Get issues for a project with various filters
 */
async function getIssues(
  projectId: string,
  options: {
    state?: 'opened' | 'closed' | 'all',
    with_labels_details?: boolean,
    milestone?: string,
    scope?: 'created_by_me' | 'assigned_to_me' | 'all',
    author_id?: number,
    assignee_id?: number,
    my_reaction_emoji?: string,
    order_by?: 'created_at' | 'updated_at' | 'priority',
    sort?: 'asc' | 'desc',
    search?: string,
    created_after?: string,
    created_before?: string,
    updated_after?: string,
    updated_before?: string,
    confidential?: boolean,
    with_time_stats?: boolean,
    page?: number,
    per_page?: number
  }
): Promise<GitLabEnhancedIssue[]> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`);
  
  // Add all query parameters that are provided
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return z.array(GitLabEnhancedIssueSchema).parse(await response.json());
}

/**
 * Get a single issue with detailed information
 */
async function getIssue(
  projectId: string,
  issueIid: number | string,
  withTimeStats: boolean = false
): Promise<GitLabEnhancedIssue> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`);
  
  if (withTimeStats) {
    url.searchParams.append('with_time_stats', 'true');
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabEnhancedIssueSchema.parse(await response.json());
}

/**
 * Get time tracking stats for an issue
 */
async function getIssueTimeStats(
  projectId: string,
  issueIid: number | string
): Promise<GitLabTimeStats> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/time_stats`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTimeStatsSchema.parse(await response.json());
}

/**
 * Set time estimate for an issue
 */
async function setTimeEstimate(
  projectId: string,
  issueIid: number | string,
  duration: string
): Promise<GitLabTimeStats> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/time_estimate`);
  url.searchParams.append('duration', duration);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTimeStatsSchema.parse(await response.json());
}

/**
 * Reset time estimate for an issue
 */
async function resetTimeEstimate(
  projectId: string,
  issueIid: number | string
): Promise<GitLabTimeStats> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/reset_time_estimate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTimeStatsSchema.parse(await response.json());
}

/**
 * Add spent time to an issue
 */
async function addSpentTime(
  projectId: string,
  issueIid: number | string,
  duration: string
): Promise<GitLabTimeStats> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/add_spent_time`);
  url.searchParams.append('duration', duration);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTimeStatsSchema.parse(await response.json());
}

/**
 * Reset spent time for an issue
 */
async function resetSpentTime(
  projectId: string,
  issueIid: number | string
): Promise<GitLabTimeStats> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/reset_spent_time`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabTimeStatsSchema.parse(await response.json());
}

/**
 * Get notes (comments) for an issue
 */
async function getNotes(
  projectId: string,
  issueIid: number | string,
  options: {
    sort?: 'asc' | 'desc',
    order_by?: 'created_at' | 'updated_at',
    page?: number,
    per_page?: number
  } = {}
): Promise<GitLabNote[]> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`);
  
  // Add all query parameters that are provided
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString());
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return z.array(GitLabNoteSchema).parse(await response.json());
}

/**
 * Create a new note (comment) on an issue
 */
async function createNote(
  projectId: string,
  issueIid: number | string,
  body: string | Record<string, any>
): Promise<GitLabNote> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes`;

  // Handle the case when body is an object by converting it to JSON string
  const bodyContent = typeof body === 'object' ? JSON.stringify(body) : body;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body: bodyContent })
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabNoteSchema.parse(await response.json());
}

/**
 * Update an existing note (comment) on an issue
 */
async function updateNote(
  projectId: string,
  issueIid: number | string,
  noteId: number | string,
  body: string | Record<string, any>
): Promise<GitLabNote> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes/${noteId}`;

  // Handle the case when body is an object by converting it to JSON string
  const bodyContent = typeof body === 'object' ? JSON.stringify(body) : body;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body: bodyContent })
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabNoteSchema.parse(await response.json());
}

/**
 * Delete a note (comment) from an issue
 */
async function deleteNote(
  projectId: string,
  issueIid: number | string,
  noteId: number | string
): Promise<{ message: string }> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/notes/${noteId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  // GitLab returns 204 No Content on successful deletion
  if (response.status === 204) {
    return { message: "Note deleted successfully" };
  }

  // If for some reason there's content, try to parse it
  try {
    const result = await response.json();
    return { message: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Note deleted' };
  } catch {
    return { message: "Note deleted successfully" };
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_or_update_file",
        description: "Create or update a single file in a GitLab project",
        inputSchema: zodToJsonSchema(CreateOrUpdateFileSchema)
      },
      {
        name: "search_repositories",
        description: "Search for GitLab projects",
        inputSchema: zodToJsonSchema(SearchRepositoriesSchema)
      },
      {
        name: "create_repository",
        description: "Create a new GitLab project",
        inputSchema: zodToJsonSchema(CreateRepositorySchema)
      },
      {
        name: "get_file_contents",
        description: "Get the contents of a file or directory from a GitLab project",
        inputSchema: zodToJsonSchema(GetFileContentsSchema)
      },
      {
        name: "push_files",
        description: "Push multiple files to a GitLab project in a single commit",
        inputSchema: zodToJsonSchema(PushFilesSchema)
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitLab project",
        inputSchema: zodToJsonSchema(CreateIssueSchema)
      },
      {
        name: "create_merge_request",
        description: "Create a new merge request in a GitLab project",
        inputSchema: zodToJsonSchema(CreateMergeRequestSchema)
      },
      {
        name: "fork_repository",
        description: "Fork a GitLab project to your account or specified namespace",
        inputSchema: zodToJsonSchema(ForkRepositorySchema)
      },
      {
        name: "create_branch",
        description: "Create a new branch in a GitLab project",
        inputSchema: zodToJsonSchema(CreateBranchSchema)
      },
      {
        name: "delete_project",
        description: "Delete a GitLab project",
        inputSchema: zodToJsonSchema(DeleteProjectSchema)
      },
      {
        name: "update_project",
        description: "Update a GitLab project's settings including visibility",
        inputSchema: zodToJsonSchema(UpdateProjectSchema)
      },
      // New tools for issues and time tracking
      {
        name: "get_issues",
        description: "Get issues from a GitLab project with various filters",
        inputSchema: zodToJsonSchema(GetIssuesSchema)
      },
      {
        name: "get_issue",
        description: "Get a single issue from a GitLab project",
        inputSchema: zodToJsonSchema(GetIssueSchema)
      },
      {
        name: "get_issue_time_stats",
        description: "Get time tracking statistics for an issue",
        inputSchema: zodToJsonSchema(GetTimeStatsSchema)
      },
      {
        name: "set_time_estimate",
        description: "Set time estimate for an issue",
        inputSchema: zodToJsonSchema(TimeTrackingSchema)
      },
      {
        name: "reset_time_estimate",
        description: "Reset time estimate for an issue",
        inputSchema: zodToJsonSchema(GetTimeStatsSchema)
      },
      {
        name: "add_spent_time",
        description: "Add spent time to an issue",
        inputSchema: zodToJsonSchema(TimeTrackingSchema)
      },
      {
        name: "reset_spent_time",
        description: "Reset spent time for an issue",
        inputSchema: zodToJsonSchema(GetTimeStatsSchema)
      },
      // New tools for notes (comments)
      {
        name: "get_notes",
        description: "Get notes (comments) for an issue",
        inputSchema: zodToJsonSchema(GetNotesSchema)
      },
      {
        name: "create_note",
        description: "Create a new note (comment) on an issue - supports both string and JSON object bodies",
        inputSchema: zodToJsonSchema(CreateNoteSchema)
      },
      {
        name: "update_note",
        description: "Update an existing note (comment) on an issue - supports both string and JSON object bodies",
        inputSchema: zodToJsonSchema(UpdateNoteSchema)
      },
      {
        name: "delete_note",
        description: "Delete a note (comment) from an issue",
        inputSchema: zodToJsonSchema(DeleteNoteSchema)
      }
    ]
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "fork_repository": {
        const args = ForkRepositorySchema.parse(request.params.arguments);
        const fork = await forkProject(args.project_id, args.namespace);
        return { content: [{ type: "text", text: JSON.stringify(fork, null, 2) }] };
      }

      case "create_branch": {
        const args = CreateBranchSchema.parse(request.params.arguments);
        let ref = args.ref;
        if (!ref) {
          ref = await getDefaultBranchRef(args.project_id);
        }

        const branch = await createBranch(args.project_id, {
          name: args.branch,
          ref
        });

        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "search_repositories": {
        const args = SearchRepositoriesSchema.parse(request.params.arguments);
        const results = await searchProjects(args.search, args.page, args.per_page);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_repository": {
        const args = CreateRepositorySchema.parse(request.params.arguments);
        const repository = await createRepository(args);
        return { content: [{ type: "text", text: JSON.stringify(repository, null, 2) }] };
      }

      case "get_file_contents": {
        const args = GetFileContentsSchema.parse(request.params.arguments);
        const contents = await getFileContents(args.project_id, args.file_path, args.ref);
        return { content: [{ type: "text", text: JSON.stringify(contents, null, 2) }] };
      }

      case "create_or_update_file": {
        const args = CreateOrUpdateFileSchema.parse(request.params.arguments);
        const result = await createOrUpdateFile(
          args.project_id,
          args.file_path,
          args.content,
          args.commit_message,
          args.branch,
          args.previous_path
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "push_files": {
        const args = PushFilesSchema.parse(request.params.arguments);
        const result = await createCommit(
          args.project_id,
          args.commit_message,
          args.branch,
          args.files.map(f => ({ path: f.file_path, content: f.content }))
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "create_issue": {
        const args = CreateIssueSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const issue = await createIssue(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_merge_request": {
        const args = CreateMergeRequestSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const mergeRequest = await createMergeRequest(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "delete_project": {
        const args = DeleteProjectSchema.parse(request.params.arguments);
        const result = await deleteProject(args.project_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "update_project": {
        const args = UpdateProjectSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const result = await updateProject(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // New cases for issues and time tracking
      case "get_issues": {
        const args = GetIssuesSchema.parse(request.params.arguments);
        const { project_id, ...options } = args;
        const issues = await getIssues(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issues, null, 2) }] };
      }
      
      case "get_issue": {
        const args = GetIssueSchema.parse(request.params.arguments);
        const issue = await getIssue(args.project_id, args.issue_iid, args.with_time_stats);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }
      
      case "get_issue_time_stats": {
        const args = GetTimeStatsSchema.parse(request.params.arguments);
        const timeStats = await getIssueTimeStats(args.project_id, args.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(timeStats, null, 2) }] };
      }
      
      case "set_time_estimate": {
        const args = TimeTrackingSchema.parse(request.params.arguments);
        const result = await setTimeEstimate(args.project_id, args.issue_iid, args.duration);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "reset_time_estimate": {
        const args = GetTimeStatsSchema.parse(request.params.arguments);
        const result = await resetTimeEstimate(args.project_id, args.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "add_spent_time": {
        const args = TimeTrackingSchema.parse(request.params.arguments);
        const result = await addSpentTime(args.project_id, args.issue_iid, args.duration);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "reset_spent_time": {
        const args = GetTimeStatsSchema.parse(request.params.arguments);
        const result = await resetSpentTime(args.project_id, args.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // Cases for notes (comments)
      case "get_notes": {
        const args = GetNotesSchema.parse(request.params.arguments);
        const { project_id, issue_iid, ...options } = args;
        const notes = await getNotes(project_id, issue_iid, options);
        return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
      }
      
      case "create_note": {
        const args = CreateNoteSchema.parse(request.params.arguments);
        // Note: body can now be a string or an object
        const note = await createNote(args.project_id, args.issue_iid, args.body);
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }
      
      case "update_note": {
        const args = UpdateNoteSchema.parse(request.params.arguments);
        // Note: body can now be a string or an object
        const note = await updateNote(args.project_id, args.issue_iid, args.note_id, args.body);
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }
      
      case "delete_note": {
        const args = DeleteNoteSchema.parse(request.params.arguments);
        const result = await deleteNote(args.project_id, args.issue_iid, args.note_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitLab MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});