#!/usr/bin/env node
  
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
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
  UpdateIssueSchema,
  IssueStateUpdateSchema,
  GetProjectLabelsSchema,
  CreateProjectLabelSchema,
  UpdateProjectLabelSchema,
  DeleteProjectLabelSchema,
  ManageIssueLabelsSchema,
  GetProjectMilestonesSchema,
  CreateProjectMilestoneSchema,
  AssignIssueSchema,
  UnassignIssueSchema,
  CreateIssueLinkSchema,
  DeleteIssueLinkSchema,
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
  type UpdateIssue,
  type IssueStateUpdate,
} from './schemas.js';

// Logger utility for DXT debugging
class Logger {
  private debugMode: boolean;

  constructor() {
    this.debugMode = process.env.DXT_DEBUG === 'true' || process.env.DEBUG === 'true';
  }

  debug(message: string, data?: any) {
    if (this.debugMode) {
      console.error(`[DXT-GitLab] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }

  info(message: string) {
    console.error(`[DXT-GitLab] INFO: ${message}`);
  }

  error(message: string, error?: any) {
    console.error(`[DXT-GitLab] ERROR: ${message}`, error);
  }

  warn(message: string) {
    console.error(`[DXT-GitLab] WARN: ${message}`);
  }
}

const logger = new Logger();

const server = new Server({
  name: "gitlab-mcp-server",
  version: "1.3.0",
}, {
  capabilities: {
    tools: {}
  }
});

const GITLAB_PERSONAL_ACCESS_TOKEN = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
const GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
  logger.error("GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set");
  logger.info("Please set your GitLab personal access token in the environment or through the DXT configuration");
  process.exit(1);
}

logger.info(`GitLab MCP Server starting with API URL: ${GITLAB_API_URL}`);

/**
 * Enhanced timeout wrapper for API requests
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Utility function to properly encode file paths for GitLab API
 * Keeps forward slashes as-is while encoding other special characters
 */
function encodeGitLabPath(filePath: string): string {
  return encodeURIComponent(filePath).replace(/%2F/g, '/');
}

/**
 * Enhanced API request wrapper with retry logic
 */
async function makeGitLabRequest(
  url: string,
  options: any = {},
  retries: number = 3
): Promise<any> {
  const headers = {
    'Authorization': `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  logger.debug(`Making GitLab API request to: ${url}`, { method: options.method || 'GET' });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response: Response = await withTimeout(
        fetch(url, {
          ...options,
          headers
        }),
        30000
      );

      if (!response.ok) {
        let errorMessage = `GitLab API error (${response.status}): ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch {}
        
        if (response.status === 429 && attempt < retries) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get('retry-after') || '60');
          logger.warn(`Rate limited. Waiting ${retryAfter}s before retry ${attempt}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug(`GitLab API response received`, { status: response.status });
      return data;
    } catch (error) {
      if (attempt === retries) {
        logger.error(`GitLab API request failed after ${retries} attempts`, error);
        throw error;
      }
      logger.warn(`Request attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
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
    logger.warn(`File path '${filePath}' contains special characters that may cause issues with GitLab API. Consider renaming the file.`);
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

/**
 * Update an issue with various attributes
 */
async function updateIssue(
  projectId: string,
  issueIid: number | string,
  options: {
    title?: string,
    description?: string,
    state_event?: 'close' | 'reopen',
    labels?: string,
    assignee_ids?: number[],
    milestone_id?: number,
    due_date?: string
  }
): Promise<GitLabEnhancedIssue> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return GitLabEnhancedIssueSchema.parse(await response.json());
}

/**
 * Close an issue
 */
async function closeIssue(
  projectId: string,
  issueIid: number | string
): Promise<GitLabEnhancedIssue> {
  return updateIssue(projectId, issueIid, { state_event: 'close' });
}

/**
 * Reopen an issue
 */
async function reopenIssue(
  projectId: string,
  issueIid: number | string
): Promise<GitLabEnhancedIssue> {
  return updateIssue(projectId, issueIid, { state_event: 'reopen' });
}

/**
 * Get project labels
 */
async function getProjectLabels(
  projectId: string
): Promise<any[]> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return z.array(z.any()).parse(await response.json());
}

/**
 * Create a new project label
 */
async function createProjectLabel(
  projectId: string,
  name: string,
  color: string,
  description?: string
): Promise<any> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels`;

  const body: Record<string, any> = {
    name,
    color
  };

  if (description) {
    body.description = description;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return await response.json();
}

/**
 * Update a project label
 */
async function updateProjectLabel(
  projectId: string,
  labelId: number | string,
  options: {
    new_name?: string,
    color?: string,
    description?: string
  }
): Promise<any> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels/${labelId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return await response.json();
}

/**
 * Delete a project label
 */
async function deleteProjectLabel(
  projectId: string,
  labelId: number | string
): Promise<{ message: string }> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels/${labelId}`;

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
    return { message: "Label deleted successfully" };
  }

  // If for some reason there's content, try to parse it
  try {
    const result = await response.json();
    return { message: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Label deleted' };
  } catch {
    return { message: "Label deleted successfully" };
  }
}

/**
 * Add labels to an issue
 */
async function addLabelsToIssue(
  projectId: string,
  issueIid: number | string,
  labels: string[]
): Promise<GitLabEnhancedIssue> {
  // Get current issue first to get existing labels
  const issue = await getIssue(projectId, issueIid);
  
  // Extract current label names
  const currentLabels = Array.isArray(issue.labels) ? 
    issue.labels.map(label => typeof label === 'string' ? label : label.name) : 
    [];
    
  // Combine current labels with new ones, avoiding duplicates
  const updatedLabels = [...new Set([...currentLabels, ...labels])].join(',');
  
  // Update the issue with new labels
  return updateIssue(projectId, issueIid, { labels: updatedLabels });
}

/**
 * Remove labels from an issue
 */
async function removeLabelsFromIssue(
  projectId: string,
  issueIid: number | string,
  labels: string[]
): Promise<GitLabEnhancedIssue> {
  // Get current issue first to get existing labels
  const issue = await getIssue(projectId, issueIid);
  
  // Extract current label names
  const currentLabels = Array.isArray(issue.labels) ? 
    issue.labels.map(label => typeof label === 'string' ? label : label.name) : 
    [];
    
  // Filter out labels to remove
  const updatedLabels = currentLabels
    .filter(label => !labels.includes(label))
    .join(',');
  
  // Update the issue with new labels
  return updateIssue(projectId, issueIid, { labels: updatedLabels });
}

/**
 * Get project milestones
 */
async function getProjectMilestones(
  projectId: string,
  state?: 'active' | 'closed'
): Promise<any[]> {
  const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/milestones`);
  
  if (state) {
    url.searchParams.append('state', state);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`
    }
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return z.array(z.any()).parse(await response.json());
}

/**
 * Create a project milestone
 */
async function createProjectMilestone(
  projectId: string,
  title: string,
  description?: string,
  due_date?: string,
  start_date?: string
): Promise<any> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/milestones`;

  const body: Record<string, any> = { title };
  
  if (description) body.description = description;
  if (due_date) body.due_date = due_date;
  if (start_date) body.start_date = start_date;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return await response.json();
}

/**
 * Assign users to an issue
 */
async function assignIssue(
  projectId: string,
  issueIid: number | string,
  assigneeIds: number[]
): Promise<GitLabEnhancedIssue> {
  return updateIssue(projectId, issueIid, { assignee_ids: assigneeIds });
}

/**
 * Remove all assignees from an issue
 */
async function unassignIssue(
  projectId: string,
  issueIid: number | string
): Promise<GitLabEnhancedIssue> {
  return updateIssue(projectId, issueIid, { assignee_ids: [] });
}

/**
 * Create a link between two issues
 */
async function createIssueLink(
  projectId: string,
  issueIid: number | string,
  targetProjectId: string,
  targetIssueIid: number | string,
  linkType?: string
): Promise<any> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/links`;

  const body: Record<string, any> = {
    target_project_id: targetProjectId,
    target_issue_iid: targetIssueIid
  };

  if (linkType) {
    body.link_type = linkType;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return handleApiError(response);
  }

  return await response.json();
}

/**
 * Delete a link between issues
 */
async function deleteIssueLink(
  projectId: string,
  issueIid: number | string,
  linkId: number | string
): Promise<{ message: string }> {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues/${issueIid}/links/${linkId}`;

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
    return { message: "Issue link deleted successfully" };
  }

  // If for some reason there's content, try to parse it
  try {
    const result = await response.json();
    return { message: typeof result === 'object' && result !== null && 'message' in result ? String(result.message) : 'Issue link deleted' };
  } catch {
    return { message: "Issue link deleted successfully" };
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
      },
      // New tools for issue management
      {
        name: "update_issue",
        description: "Update various issue attributes including state, labels, assignees, etc.",
        inputSchema: zodToJsonSchema(UpdateIssueSchema)
      },
      {
        name: "close_issue",
        description: "Close an issue",
        inputSchema: zodToJsonSchema(IssueStateUpdateSchema)
      },
      {
        name: "reopen_issue",
        description: "Reopen a closed issue",
        inputSchema: zodToJsonSchema(IssueStateUpdateSchema)
      },
      // Label management
      {
        name: "get_project_labels",
        description: "Retrieve all labels for a project",
        inputSchema: zodToJsonSchema(GetProjectLabelsSchema)
      },
      {
        name: "create_project_label",
        description: "Create a new label for a project",
        inputSchema: zodToJsonSchema(CreateProjectLabelSchema)
      },
      {
        name: "update_project_label",
        description: "Update an existing label",
        inputSchema: zodToJsonSchema(UpdateProjectLabelSchema)
      },
      {
        name: "delete_project_label",
        description: "Delete a label from a project",
        inputSchema: zodToJsonSchema(DeleteProjectLabelSchema)
      },
      {
        name: "add_labels_to_issue",
        description: "Add specific labels to an issue",
        inputSchema: zodToJsonSchema(ManageIssueLabelsSchema)
      },
      {
        name: "remove_labels_from_issue",
        description: "Remove specific labels from an issue",
        inputSchema: zodToJsonSchema(ManageIssueLabelsSchema)
      },
      // Milestone management
      {
        name: "get_project_milestones",
        description: "Retrieve all milestones for a project",
        inputSchema: zodToJsonSchema(GetProjectMilestonesSchema)
      },
      {
        name: "create_project_milestone",
        description: "Create a new milestone for a project",
        inputSchema: zodToJsonSchema(CreateProjectMilestoneSchema)
      },
      // User assignment
      {
        name: "assign_issue",
        description: "Assign users to an issue",
        inputSchema: zodToJsonSchema(AssignIssueSchema)
      },
      {
        name: "unassign_issue",
        description: "Remove all assignees from an issue",
        inputSchema: zodToJsonSchema(UnassignIssueSchema)
      },
      // Issue relationships
      {
        name: "create_issue_link",
        description: "Create a link between two issues",
        inputSchema: zodToJsonSchema(CreateIssueLinkSchema)
      },
      {
        name: "delete_issue_link",
        description: "Remove a link between issues",
        inputSchema: zodToJsonSchema(DeleteIssueLinkSchema)
      }
    ]
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  logger.debug(`Tool called: ${name}`, args);

  try {
    if (!args) {
      throw new McpError(ErrorCode.InvalidParams, "Arguments are required");
    }

    switch (name) {
      case "fork_repository": {
        const validatedArgs = ForkRepositorySchema.parse(args);
        const fork = await forkProject(validatedArgs.project_id, validatedArgs.namespace);
        return { content: [{ type: "text", text: JSON.stringify(fork, null, 2) }] };
      }

      case "create_branch": {
        const validatedArgs = CreateBranchSchema.parse(args);
        let ref = validatedArgs.ref;
        if (!ref) {
          ref = await getDefaultBranchRef(validatedArgs.project_id);
        }

        const branch = await createBranch(validatedArgs.project_id, {
          name: validatedArgs.branch,
          ref
        });

        return { content: [{ type: "text", text: JSON.stringify(branch, null, 2) }] };
      }

      case "search_repositories": {
        const validatedArgs = SearchRepositoriesSchema.parse(args);
        const results = await searchProjects(validatedArgs.search, validatedArgs.page, validatedArgs.per_page);
        return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      }

      case "create_repository": {
        const validatedArgs = CreateRepositorySchema.parse(args);
        const repository = await createRepository(validatedArgs);
        return { content: [{ type: "text", text: JSON.stringify(repository, null, 2) }] };
      }

      case "get_file_contents": {
        const validatedArgs = GetFileContentsSchema.parse(args);
        const contents = await getFileContents(validatedArgs.project_id, validatedArgs.file_path, validatedArgs.ref);
        return { content: [{ type: "text", text: JSON.stringify(contents, null, 2) }] };
      }

      case "create_or_update_file": {
        const validatedArgs = CreateOrUpdateFileSchema.parse(args);
        const result = await createOrUpdateFile(
          validatedArgs.project_id,
          validatedArgs.file_path,
          validatedArgs.content,
          validatedArgs.commit_message,
          validatedArgs.branch,
          validatedArgs.previous_path
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "push_files": {
        const validatedArgs = PushFilesSchema.parse(args);
        const result = await createCommit(
          validatedArgs.project_id,
          validatedArgs.commit_message,
          validatedArgs.branch,
          validatedArgs.files.map(f => ({ path: f.file_path, content: f.content }))
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "create_issue": {
        const validatedArgs = CreateIssueSchema.parse(args);
        const { project_id, ...options } = validatedArgs;
        const issue = await createIssue(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }

      case "create_merge_request": {
        const validatedArgs = CreateMergeRequestSchema.parse(args);
        const { project_id, ...options } = validatedArgs;
        const mergeRequest = await createMergeRequest(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(mergeRequest, null, 2) }] };
      }

      case "delete_project": {
        const validatedArgs = DeleteProjectSchema.parse(args);
        const result = await deleteProject(validatedArgs.project_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "update_project": {
        const validatedArgs = UpdateProjectSchema.parse(args);
        const { project_id, ...options } = validatedArgs;
        const result = await updateProject(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // New cases for issues and time tracking
      case "get_issues": {
        const validatedArgs = GetIssuesSchema.parse(args);
        const { project_id, ...options } = validatedArgs;
        const issues = await getIssues(project_id, options);
        return { content: [{ type: "text", text: JSON.stringify(issues, null, 2) }] };
      }
      
      case "get_issue": {
        const validatedArgs = GetIssueSchema.parse(args);
        const issue = await getIssue(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.with_time_stats);
        return { content: [{ type: "text", text: JSON.stringify(issue, null, 2) }] };
      }
      
      case "get_issue_time_stats": {
        const validatedArgs = GetTimeStatsSchema.parse(args);
        const timeStats = await getIssueTimeStats(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(timeStats, null, 2) }] };
      }
      
      case "set_time_estimate": {
        const validatedArgs = TimeTrackingSchema.parse(args);
        const result = await setTimeEstimate(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.duration);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "reset_time_estimate": {
        const validatedArgs = GetTimeStatsSchema.parse(args);
        const result = await resetTimeEstimate(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "add_spent_time": {
        const validatedArgs = TimeTrackingSchema.parse(args);
        const result = await addSpentTime(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.duration);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "reset_spent_time": {
        const validatedArgs = GetTimeStatsSchema.parse(args);
        const result = await resetSpentTime(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // Cases for notes (comments)
      case "get_notes": {
        const validatedArgs = GetNotesSchema.parse(args);
        const { project_id, issue_iid, ...options } = validatedArgs;
        const notes = await getNotes(project_id, issue_iid, options);
        return { content: [{ type: "text", text: JSON.stringify(notes, null, 2) }] };
      }
      
      case "create_note": {
        const validatedArgs = CreateNoteSchema.parse(args);
        // Note: body can now be a string or an object
        const note = await createNote(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.body);
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }
      
      case "update_note": {
        const validatedArgs = UpdateNoteSchema.parse(args);
        // Note: body can now be a string or an object
        const note = await updateNote(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.note_id, validatedArgs.body);
        return { content: [{ type: "text", text: JSON.stringify(note, null, 2) }] };
      }
      
      case "delete_note": {
        const validatedArgs = DeleteNoteSchema.parse(args);
        const result = await deleteNote(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.note_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // New cases for issue management
      case "update_issue": {
        const validatedArgs = UpdateIssueSchema.parse(args);
        const { project_id, issue_iid, ...options } = validatedArgs;
        const result = await updateIssue(project_id, issue_iid, options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "close_issue": {
        const validatedArgs = IssueStateUpdateSchema.parse(args);
        const result = await closeIssue(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "reopen_issue": {
        const validatedArgs = IssueStateUpdateSchema.parse(args);
        const result = await reopenIssue(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // Label management cases
      case "get_project_labels": {
        const validatedArgs = GetProjectLabelsSchema.parse(args);
        const result = await getProjectLabels(validatedArgs.project_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "create_project_label": {
        const validatedArgs = CreateProjectLabelSchema.parse(args);
        const result = await createProjectLabel(validatedArgs.project_id, validatedArgs.name, validatedArgs.color, validatedArgs.description);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "update_project_label": {
        const validatedArgs = UpdateProjectLabelSchema.parse(args);
        const { project_id, label_id, ...options } = validatedArgs;
        const result = await updateProjectLabel(project_id, label_id, options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "delete_project_label": {
        const validatedArgs = DeleteProjectLabelSchema.parse(args);
        const result = await deleteProjectLabel(validatedArgs.project_id, validatedArgs.label_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "add_labels_to_issue": {
        const validatedArgs = ManageIssueLabelsSchema.parse(args);
        const result = await addLabelsToIssue(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.labels);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "remove_labels_from_issue": {
        const validatedArgs = ManageIssueLabelsSchema.parse(args);
        const result = await removeLabelsFromIssue(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.labels);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // Milestone management cases
      case "get_project_milestones": {
        const validatedArgs = GetProjectMilestonesSchema.parse(args);
        const result = await getProjectMilestones(validatedArgs.project_id, validatedArgs.state);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "create_project_milestone": {
        const validatedArgs = CreateProjectMilestoneSchema.parse(args);
        const { project_id, title, description, due_date, start_date } = validatedArgs;
        const result = await createProjectMilestone(project_id, title, description, due_date, start_date);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // User assignment cases
      case "assign_issue": {
        const validatedArgs = AssignIssueSchema.parse(args);
        const result = await assignIssue(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.assignee_ids);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "unassign_issue": {
        const validatedArgs = UnassignIssueSchema.parse(args);
        const result = await unassignIssue(validatedArgs.project_id, validatedArgs.issue_iid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      // Issue relationships cases
      case "create_issue_link": {
        const validatedArgs = CreateIssueLinkSchema.parse(args);
        const result = await createIssueLink(
          validatedArgs.project_id,
          validatedArgs.issue_iid,
          validatedArgs.target_project_id,
          validatedArgs.target_issue_iid,
          validatedArgs.link_type
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      
      case "delete_issue_link": {
        const validatedArgs = DeleteIssueLinkSchema.parse(args);
        const result = await deleteIssueLink(validatedArgs.project_id, validatedArgs.issue_iid, validatedArgs.link_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool not found: ${name}`
        );
    }
  } catch (error) {
    logger.error(`Tool execution failed: ${name}`, error);
    
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

async function main() {
  try {
    const transport = new StdioServerTransport();
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down GitLab MCP Server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down GitLab MCP Server...');
      await server.close();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
      process.exit(1);
    });

    await server.connect(transport);
    logger.info('GitLab MCP Server (DXT) started successfully');
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();