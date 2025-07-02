# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-07-02

### Added
- Desktop Extension (DXT) support for easy installation and distribution
  - Complete DXT manifest with user configuration support
  - Enhanced error handling with retry logic for rate-limited requests
  - Comprehensive debug logging with DXT_DEBUG environment variable
  - Timeout management (30s default) for all API requests
  - Graceful shutdown handling on SIGINT/SIGTERM signals
- Production-ready logging system with configurable debug output
- Automatic retry mechanism for failed API requests (up to 3 attempts)
- Rate limit handling with automatic backoff
- Enhanced error messages using MCP error types
- DXT-specific documentation and setup instructions
- `.dxtignore` file for optimized packaging

### Changed
- Refactored server code to include comprehensive error handling
- Updated all tool handlers to use validated arguments consistently
- Enhanced API request handling with timeout and retry capabilities
- Improved startup sequence with proper error handling
- Updated documentation to include DXT-specific information

### Fixed
- Improved error handling for all GitLab API operations
- Better handling of network timeouts and connection issues

## [1.2.0] - 2025-04-17

### Added
- Issue management endpoints
  - `update_issue`: Update various issue attributes
  - `close_issue`: Dedicated method to close an issue
  - `reopen_issue`: Dedicated method to reopen a closed issue
- Label management functionality
  - `get_project_labels`: Retrieve all labels for a project
  - `create_project_label`: Create a new label for a project
  - `update_project_label`: Update an existing label
  - `delete_project_label`: Delete a label from a project
  - `add_labels_to_issue`: Add specific labels to an issue
  - `remove_labels_from_issue`: Remove specific labels from an issue
- Milestone management functionality
  - `get_project_milestones`: Retrieve all milestones for a project
  - `create_project_milestone`: Create a new milestone for a project
- User assignment endpoints
  - `assign_issue`: Assign users to an issue
  - `unassign_issue`: Remove all assignees from an issue
- Issue relationships endpoints
  - `create_issue_link`: Create a link between two issues
  - `delete_issue_link`: Remove a link between issues

### Changed
- Updated README with comprehensive documentation of new features
- Enhanced examples covering all new functionality
- Added new keywords to package.json

## [1.1.2] - 2025-04-16

### Fixed
- create_note was expeting a string but getting object


## [1.1.1] - 2025-04-16

### Fixed
- Schema validation issues when handling GitLab API responses:
  - Fixed handling of labels that can be strings or objects
  - Made description fields nullable to match actual API responses
  - Made time tracking fields nullable and optional
  - Improved note schema to handle various response formats
  - Fixed system note metadata handling for edge cases

## [1.1.0] - 2025-04-16

### Added
- Issues API support with filtering options
  - `get_issues`: Retrieve issues with various filters including time tracking stats
  - `get_issue`: Get detailed information about a specific issue
- Time tracking functionality 
  - `get_issue_time_stats`: Get time tracking statistics for an issue
  - `set_time_estimate`: Set time estimates for issues
  - `reset_time_estimate`: Reset time estimates
  - `add_spent_time`: Track time spent on issues
  - `reset_spent_time`: Reset time spent records
- Notes (Comments) API support
  - `get_notes`: Retrieve comments on issues
  - `create_note`: Create new comments
  - `update_note`: Edit existing comments
  - `delete_note`: Remove comments from issues
- Improved error handling for all new endpoints

### Changed
- Enhanced documentation with examples for time tracking and notes functionality
- Improved type definitions with new schemas for time tracking and notes

## [1.0.1] - Initial release

### Added
- Project management functionality (create, update, delete, fork, search)
- File operations (fetch contents, create/update files, commit multiple files)
- Repository management (create branches, issues, merge requests)
- Enhanced error handling for file paths and API responses
- Support for projects in group namespaces
