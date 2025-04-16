# Changelog

All notable changes to this project will be documented in this file.

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
