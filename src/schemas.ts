import { z } from 'zod';

// Base schemas for common types
export const GitLabAuthorSchema = z.object({
  name: z.string(),
  email: z.string(),
  date: z.string()
});

// Repository related schemas
export const GitLabOwnerSchema = z.object({
  username: z.string(), // Changed from login to match GitLab API
  id: z.number(),
  avatar_url: z.string(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  name: z.string(), // Added as GitLab includes full name
  state: z.string() // Added as GitLab includes user state
});

export const GitLabRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  path_with_namespace: z.string(), // Changed from full_name to match GitLab API
  visibility: z.string(), // Changed from private to match GitLab API
  owner: GitLabOwnerSchema.optional(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  description: z.string().nullable(),
  fork: z.boolean().optional(),
  ssh_url_to_repo: z.string(), // Changed from ssh_url to match GitLab API
  http_url_to_repo: z.string(), // Changed from clone_url to match GitLab API
  created_at: z.string(),
  last_activity_at: z.string(), // Changed from updated_at to match GitLab API
  default_branch: z.string()
});

// File content schemas
export const GitLabFileContentSchema = z.object({
  file_name: z.string(), // Changed from name to match GitLab API
  file_path: z.string(), // Changed from path to match GitLab API
  size: z.number(),
  encoding: z.string(),
  content: z.string(),
  content_sha256: z.string(), // Changed from sha to match GitLab API
  ref: z.string(), // Added as GitLab requires branch reference
  blob_id: z.string(), // Added to match GitLab API
  last_commit_id: z.string() // Added to match GitLab API
});

export const GitLabDirectoryContentSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.string(),
  mode: z.string(),
  id: z.string(), // Changed from sha to match GitLab API
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabContentSchema = z.union([
  GitLabFileContentSchema,
  z.array(GitLabDirectoryContentSchema)
]);

// Operation schemas
export const FileOperationSchema = z.object({
  path: z.string(),
  content: z.string()
});

// Tree and commit schemas
export const GitLabTreeEntrySchema = z.object({
  id: z.string(), // Changed from sha to match GitLab API
  name: z.string(),
  type: z.enum(['blob', 'tree']),
  path: z.string(),
  mode: z.string()
});

export const GitLabTreeSchema = z.object({
  id: z.string(), // Changed from sha to match GitLab API
  tree: z.array(GitLabTreeEntrySchema)
});

export const GitLabCommitSchema = z.object({
  id: z.string(), // Changed from sha to match GitLab API
  short_id: z.string(), // Added to match GitLab API
  title: z.string(), // Changed from message to match GitLab API
  author_name: z.string(),
  author_email: z.string(),
  authored_date: z.string(),
  committer_name: z.string(),
  committer_email: z.string(),
  committed_date: z.string(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  parent_ids: z.array(z.string()) // Changed from parents to match GitLab API
});

// Reference schema
export const GitLabReferenceSchema = z.object({
  name: z.string(), // Changed from ref to match GitLab API
  commit: z.object({
    id: z.string(), // Changed from sha to match GitLab API
    web_url: z.string() // Changed from url to match GitLab API
  })
});

// Input schemas for operations
export const CreateRepositoryOptionsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'internal', 'public']).optional(), // Changed from private to match GitLab API
  initialize_with_readme: z.boolean().optional(), // Changed from auto_init to match GitLab API
  namespace_id: z.union([z.string(), z.number()]).optional() // Added to support creating projects in groups
});

export const CreateIssueOptionsSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(), // Changed from body to match GitLab API
  assignee_ids: z.array(z.number()).optional(), // Changed from assignees to match GitLab API
  milestone_id: z.number().optional(), // Changed from milestone to match GitLab API
  labels: z.array(z.string()).optional()
});

export const CreateMergeRequestOptionsSchema = z.object({ // Changed from CreatePullRequestOptionsSchema
  title: z.string(),
  description: z.string().nullable().optional(), // Changed from body to match GitLab API
  source_branch: z.string(), // Changed from head to match GitLab API
  target_branch: z.string(), // Changed from base to match GitLab API
  allow_collaboration: z.boolean().optional(), // Changed from maintainer_can_modify to match GitLab API
  draft: z.boolean().optional()
});

export const CreateBranchOptionsSchema = z.object({
  name: z.string(), // Changed from ref to match GitLab API
  ref: z.string() // The source branch/commit for the new branch
});

// Response schemas for operations
export const GitLabCreateUpdateFileResponseSchema = z.object({
  file_path: z.string(),
  branch: z.string(),
  commit_id: z.string(), // Changed from sha to match GitLab API
  content: GitLabFileContentSchema.optional()
});

export const GitLabSearchResponseSchema = z.object({
  count: z.number(), // Changed from total_count to match GitLab API
  items: z.array(GitLabRepositorySchema)
});

// Fork related schemas
export const GitLabForkParentSchema = z.object({
  name: z.string(),
  path_with_namespace: z.string(), // Changed from full_name to match GitLab API
  owner: z.object({
    username: z.string(), // Changed from login to match GitLab API
    id: z.number(),
    avatar_url: z.string()
  }),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabForkSchema = GitLabRepositorySchema.extend({
  forked_from_project: GitLabForkParentSchema // Changed from parent to match GitLab API
});

// Issue related schemas
export const GitLabLabelSchema = z.union([
  z.string(),
  z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable().optional()
  })
]);

export const GitLabUserSchema = z.object({
  username: z.string(), // Changed from login to match GitLab API
  id: z.number(),
  name: z.string(),
  avatar_url: z.string(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabMilestoneSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string(),
  state: z.string(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

export const GitLabIssueSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  project_id: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string().nullable(), // Changed from body to match GitLab API
  state: z.string(),
  author: GitLabUserSchema,
  assignees: z.array(GitLabUserSchema),
  labels: z.array(GitLabLabelSchema),
  milestone: GitLabMilestoneSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  web_url: z.string() // Changed from html_url to match GitLab API
});

// Merge Request related schemas (equivalent to Pull Request)
export const GitLabMergeRequestDiffRefSchema = z.object({
  base_sha: z.string(),
  head_sha: z.string(),
  start_sha: z.string()
});

export const GitLabMergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(), // Added to match GitLab API
  project_id: z.number(), // Added to match GitLab API
  title: z.string(),
  description: z.string().nullable(), // Changed from body to match GitLab API
  state: z.string(),
  merged: z.boolean().optional(),
  author: GitLabUserSchema,
  assignees: z.array(GitLabUserSchema),
  source_branch: z.string(), // Changed from head to match GitLab API
  target_branch: z.string(), // Changed from base to match GitLab API
  diff_refs: GitLabMergeRequestDiffRefSchema.nullable(),
  web_url: z.string(), // Changed from html_url to match GitLab API
  created_at: z.string(),
  updated_at: z.string(),
  merged_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  merge_commit_sha: z.string().nullable()
});

// API Operation Parameter Schemas
const ProjectParamsSchema = z.object({
  project_id: z.string().describe("Project ID or URL-encoded path") // Changed from owner/repo to match GitLab API
});

// Delete project schema
export const DeleteProjectSchema = ProjectParamsSchema.extend({});

// Update project schema
export const UpdateProjectSchema = ProjectParamsSchema.extend({
  name: z.string().optional().describe("New project name"),
  description: z.string().optional().describe("New project description"),
  visibility: z.enum(['private', 'internal', 'public']).optional().describe("Change project visibility"),
  default_branch: z.string().optional().describe("Change default branch"),
  topics: z.array(z.string()).optional().describe("Change project topics")
});

export const CreateOrUpdateFileSchema = ProjectParamsSchema.extend({
  file_path: z.string().describe("Path where to create/update the file"),
  content: z.string().describe("Content of the file"),
  commit_message: z.string().describe("Commit message"),
  branch: z.string().describe("Branch to create/update the file in"),
  previous_path: z.string().optional()
    .describe("Path of the file to move/rename")
});

export const SearchRepositoriesSchema = z.object({
  search: z.string().describe("Search query"), // Changed from query to match GitLab API
  page: z.number().optional().describe("Page number for pagination (default: 1)"),
  per_page: z.number().optional().describe("Number of results per page (default: 20)")
});

export const CreateRepositorySchema = z.object({
  name: z.string().describe("Repository name"),
  description: z.string().optional().describe("Repository description"),
  visibility: z.enum(['private', 'internal', 'public']).optional()
    .describe("Repository visibility level"),
  initialize_with_readme: z.boolean().optional()
    .describe("Initialize with README.md"),
  namespace_id: z.union([z.string(), z.number()]).optional()
    .describe("Namespace ID to create project in (group or user)")
});

export const GetFileContentsSchema = ProjectParamsSchema.extend({
  file_path: z.string().describe("Path to the file or directory"),
  ref: z.string().optional().describe("Branch/tag/commit to get contents from")
});

export const PushFilesSchema = ProjectParamsSchema.extend({
  branch: z.string().describe("Branch to push to"),
  files: z.array(z.object({
    file_path: z.string().describe("Path where to create the file"),
    content: z.string().describe("Content of the file")
  })).describe("Array of files to push"),
  commit_message: z.string().describe("Commit message")
});

export const CreateIssueSchema = ProjectParamsSchema.extend({
  title: z.string().describe("Issue title"),
  description: z.string().optional().describe("Issue description"),
  assignee_ids: z.array(z.number()).optional().describe("Array of user IDs to assign"),
  labels: z.array(z.string()).optional().describe("Array of label names"),
  milestone_id: z.number().optional().describe("Milestone ID to assign")
});

export const CreateMergeRequestSchema = ProjectParamsSchema.extend({
  title: z.string().describe("Merge request title"),
  description: z.string().optional().describe("Merge request description"),
  source_branch: z.string().describe("Branch containing changes"),
  target_branch: z.string().describe("Branch to merge into"),
  draft: z.boolean().optional().describe("Create as draft merge request"),
  allow_collaboration: z.boolean().optional()
    .describe("Allow commits from upstream members")
});

export const ForkRepositorySchema = ProjectParamsSchema.extend({
  namespace: z.string().optional()
    .describe("Namespace to fork to (full path)")
});

export const CreateBranchSchema = ProjectParamsSchema.extend({
  branch: z.string().describe("Name for the new branch"),
  ref: z.string().optional()
    .describe("Source branch/commit for new branch")
});

// Export types
export type GitLabAuthor = z.infer<typeof GitLabAuthorSchema>;
export type GitLabFork = z.infer<typeof GitLabForkSchema>;
export type GitLabIssue = z.infer<typeof GitLabIssueSchema>;
export type GitLabMergeRequest = z.infer<typeof GitLabMergeRequestSchema>;
export type GitLabRepository = z.infer<typeof GitLabRepositorySchema>;
export type GitLabFileContent = z.infer<typeof GitLabFileContentSchema>;
export type GitLabDirectoryContent = z.infer<typeof GitLabDirectoryContentSchema>;
export type GitLabContent = z.infer<typeof GitLabContentSchema>;
export type FileOperation = z.infer<typeof FileOperationSchema>;
export type GitLabTree = z.infer<typeof GitLabTreeSchema>;
export type GitLabCommit = z.infer<typeof GitLabCommitSchema>;
export type GitLabReference = z.infer<typeof GitLabReferenceSchema>;
export type CreateRepositoryOptions = z.infer<typeof CreateRepositoryOptionsSchema>;
export type CreateIssueOptions = z.infer<typeof CreateIssueOptionsSchema>;
export type CreateMergeRequestOptions = z.infer<typeof CreateMergeRequestOptionsSchema>;
export type CreateBranchOptions = z.infer<typeof CreateBranchOptionsSchema>;
export type GitLabCreateUpdateFileResponse = z.infer<typeof GitLabCreateUpdateFileResponseSchema>;
export type GitLabSearchResponse = z.infer<typeof GitLabSearchResponseSchema>;

// Types for the new schemas
export type DeleteProject = z.infer<typeof DeleteProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// Issue related schemas for time tracking
export const GitLabTimeStatsSchema = z.object({
  time_estimate: z.number().nullable().optional().describe("Estimated time in seconds"),
  total_time_spent: z.number().nullable().optional().describe("Time spent in seconds"),
  human_time_estimate: z.string().nullable().optional().describe("Human-readable time estimate"),
  human_total_time_spent: z.string().nullable().optional().describe("Human-readable time spent")
});

// System note metadata schemas
export const GitLabSystemNoteMetadataSchema = z.object({
  action: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable()
});

// Note schema
export const GitLabNoteSchema = z.object({
  id: z.number(),
  author: GitLabUserSchema,
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  system: z.boolean().optional().nullable(),
  noteable_id: z.number().optional().nullable(),
  noteable_type: z.string().optional().nullable(),
  noteable_iid: z.number().optional().nullable(),
  position: z.object({}).optional().nullable(),
  resolvable: z.boolean().optional().nullable(),
  resolved: z.boolean().optional().nullable(),
  resolved_by: GitLabUserSchema.nullable().optional(),
  system_note_metadata: GitLabSystemNoteMetadataSchema.optional().nullable()
});

// Enhance issue schema to include time tracking stats
export const GitLabEnhancedIssueSchema = GitLabIssueSchema.extend({
  time_stats: GitLabTimeStatsSchema.optional().nullable(),
  task_completion_status: z.object({
    count: z.number().optional().nullable(),
    completed_count: z.number().optional().nullable()
  }).optional().nullable()
});

// API Operation Parameter Schemas for issues and time tracking

// Get issues in a project
export const GetIssuesSchema = ProjectParamsSchema.extend({
  state: z.enum(['opened', 'closed', 'all']).optional()
    .describe("Return all issues or just those that are opened or closed"),
  with_labels_details: z.boolean().optional()
    .describe("Return detailed labels data"),
  milestone: z.string().optional()
    .describe("Return issues for a specific milestone"),
  scope: z.enum(['created_by_me', 'assigned_to_me', 'all']).optional()
    .describe("Return issues for the given scope"),
  author_id: z.number().optional()
    .describe("Return issues created by the given user id"),
  assignee_id: z.number().optional()
    .describe("Return issues assigned to the given user id"),
  my_reaction_emoji: z.string().optional()
    .describe("Return issues reacted by the authenticated user by the given emoji"),
  order_by: z.enum(['created_at', 'updated_at', 'priority']).optional()
    .describe("Return issues ordered by created_at, updated_at, or priority fields"),
  sort: z.enum(['asc', 'desc']).optional()
    .describe("Return issues sorted in ascending or descending order"),
  search: z.string().optional()
    .describe("Search issues against their title and description"),
  created_after: z.string().optional()
    .describe("Return issues created after the given time"),
  created_before: z.string().optional()
    .describe("Return issues created before the given time"),
  updated_after: z.string().optional()
    .describe("Return issues updated after the given time"),
  updated_before: z.string().optional()
    .describe("Return issues updated before the given time"),
  confidential: z.boolean().optional()
    .describe("Filter confidential or public issues"),
  with_time_stats: z.boolean().optional()
    .describe("Include time tracking stats"),
  page: z.number().optional()
    .describe("Page number"),
  per_page: z.number().optional()
    .describe("Number of items per page")
});

// Get single issue
export const GetIssueSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  with_time_stats: z.boolean().optional()
    .describe("Include time tracking stats")
});

// Get issue time stats
export const GetTimeStatsSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue")
});

// Time tracking schema for estimate and spent operations
export const TimeTrackingSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  duration: z.string()
    .describe("The duration in human-readable format (e.g., '3h 30m')")
});

// Notes parameter schemas

// Get notes for an issue
export const GetNotesSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  sort: z.enum(['asc', 'desc']).optional()
    .describe("Return notes sorted in ascending or descending order"),
  order_by: z.enum(['created_at', 'updated_at']).optional()
    .describe("Return notes ordered by created_at or updated_at fields"),
  page: z.number().optional()
    .describe("Page number"),
  per_page: z.number().optional()
    .describe("Number of items per page")
});

// Create a note
export const CreateNoteSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  body: z.union([z.string(), z.record(z.any())]).nullable()
    .describe("The content of the note - can be a string or a JSON object")
});

// Update a note
export const UpdateNoteSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  note_id: z.number().or(z.string())
    .describe("The ID of the note"),
  body: z.union([z.string(), z.record(z.any())]).nullable()
    .describe("The content of the note - can be a string or a JSON object")
});

// Delete a note
export const DeleteNoteSchema = ProjectParamsSchema.extend({
  issue_iid: z.number().or(z.string())
    .describe("The internal ID of the project issue"),
  note_id: z.number().or(z.string())
    .describe("The ID of the note")
});

// Export types
export type GitLabTimeStats = z.infer<typeof GitLabTimeStatsSchema>;
export type GitLabNote = z.infer<typeof GitLabNoteSchema>;
export type GitLabEnhancedIssue = z.infer<typeof GitLabEnhancedIssueSchema>;