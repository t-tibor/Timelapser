<!--
=============================================================================
SYNC IMPACT REPORT
=============================================================================
Constitution Version: 1.0.0 → 1.1.0

Change Type: MINOR (Tech stack guidance expansion)

Modified Principles: None

Modified Sections:
- Technical Stack Constraints → Technical Stack Guidance (opened up to flexible choices)
  - Changed from prescriptive requirements to open decision with preferences
  - Added .NET and Next.js as preferred options
  - Maintained deployment and platform constraints (k3s, ARM64)

Added Sections: None

Removed Sections: None

Templates Requiring Updates:
- ✅ .specify/templates/plan-template.md (Constitution Check already flexible)
- ✅ .specify/templates/spec-template.md (no changes needed)
- ✅ .specify/templates/tasks-template.md (no changes needed)

Previous Amendments:
- v1.0.0 (2025-12-31): Initial constitution ratification

Follow-up TODOs:
- Tech stack decision to be made during first feature planning

Commit Message:
docs: amend constitution to v1.1.0 (open tech stack with TypeScript/React/Next.js/Python/.NET preferences)
=============================================================================
-->

# Timelapser Constitution

## Core Principles

### I. Pragmatic Simplicity

**MUST** keep implementation simple and maintainable for a weekend hobby project. **MUST** follow YAGNI (You Aren't Gonna Need It) principles - implement only what is currently needed. **MUST NOT** add complexity or features speculatively. **MUST** prefer straightforward solutions over clever optimizations unless performance requirements demand otherwise.

**Rationale**: As a hobby side project with limited development time, complexity is the enemy. Simple, clear code is easier to maintain, debug, and extend during weekend sessions.

### II. Containerized Deployment

**MUST** design all components to run in Docker containers. **MUST** provide Kubernetes manifests for k3s deployment. **MUST** ensure containers are compatible with ARM64 architecture (Raspberry Pi 5). **MUST** include health checks and proper graceful shutdown handling. **SHOULD** use multi-stage builds to minimize image sizes.

**Rationale**: Target deployment is k3s on Raspberry Pi 5. Container-first design ensures portability, consistent environments, and simplified deployment/rollback procedures.

### III. Async Task Processing

**MUST** handle RTSP stream capture and video processing asynchronously. **MUST** implement proper job queuing for timelapse generation tasks. **MUST NOT** block web request handlers with long-running video operations. **MUST** provide task status visibility and cancellation capability. **MUST** handle stream connection failures gracefully with retry logic.

**Rationale**: RTSP stream processing and video encoding are long-running, resource-intensive operations. Asynchronous processing prevents UI blocking, enables concurrent operations, and improves user experience.

### IV. Resource Constraints

**MUST** optimize for Raspberry Pi 5 hardware limitations (8GB RAM maximum, ARM CPU). **MUST** include configurable limits for concurrent video processing tasks. **MUST** monitor and respect CPU/memory thresholds. **SHOULD** provide degraded-mode operation when resources are constrained. **MUST** clean up temporary files and completed timelapse videos according to retention policies.

**Rationale**: Raspberry Pi has limited resources. Unbounded resource usage will crash the system. Explicit constraints and monitoring ensure stable operation.

### V. Progressive Enhancement

**MUST** implement features incrementally using MVP (Minimum Viable Product) approach. **MUST** prioritize user stories by value (P1, P2, P3). **MUST** ensure each user story is independently testable and deployable. **SHOULD** validate each MVP iteration with real usage before adding features. **MUST NOT** proceed to next priority until current priority delivers value.

**Rationale**: Limited weekend development time demands focus. Progressive enhancement ensures working software at each iteration and prevents over-engineering.

## Technical Stack Guidance

**Stack Decision Status**: Open - to be determined during first feature planning phase.

**Preferred Technologies** (not mandatory - choose based on feature requirements):
- **Backend**: Python 3.11+ or .NET (C#) for REST API
- **Backend Framework**: FastAPI, Flask, or ASP.NET Core
- **Frontend**: TypeScript with React
- **Full-stack Option**: Next.js (React framework with backend capabilities)
- **Video Processing**: FFmpeg for video encoding (required for RTSP/timelapse)
- **Database**: PostgreSQL, SQLite, or SQL Server for configuration/metadata
- **Storage**: Local filesystem or NFS mount for video files

**Required Constraints** (non-negotiable):
- **Container Runtime**: Docker with docker-compose for local dev, k3s for production
- **Target Platform**: Raspberry Pi 5 (ARM64) running k3s Kubernetes
- **Video Handling**: Must support RTSP protocol and timelapse video generation
- **Architecture**: Async task processing for long-running operations
- **ARM64 Compatibility**: All chosen technologies must support ARM64 architecture

**Decision Criteria**: Choose technologies that best fit the feature requirements while respecting resource constraints and deployment platform. Justify deviations from preferred stack in implementation plan.

## Development Workflow

**Weekend Hobby Constraints**: Development occurs in limited time blocks. Each work session must leave the project in a stable, runnable state.

**Pre-Implementation Requirements**:
1. Feature specification in `.specify/specs/[###-feature-name]/spec.md`
2. Implementation plan in `plan.md` with constitution compliance check
3. Tasks breakdown in `tasks.md` organized by user story priority

**Implementation Cycle**:
1. Select highest priority user story (P1 first, then P2, etc.)
2. Implement story incrementally following tasks.md
3. Verify story works independently before moving to next
4. Commit stable working state before ending session

**Testing**: Tests are OPTIONAL unless explicitly required in feature specification. When included, follow contract testing for APIs and integration testing for critical user journeys.

**Complexity Justification**: Any violation of simplicity principles (adding frameworks, abstractions, or features beyond immediate requirements) MUST be justified in plan.md Complexity Tracking section with concrete reasoning.

## Governance

This constitution supersedes all other development practices and patterns.

**Amendment Process**:
- Amendments require explicit documentation of rationale and impact
- Version increments follow semantic versioning:
  - **MAJOR**: Backward incompatible governance changes, principle removal/redefinition
  - **MINOR**: New principle added, materially expanded guidance
  - **PATCH**: Clarifications, wording improvements, non-semantic refinements
- All amendment1 must include Sync Impact Report updating dependent templates

**Compliance Verification**:
- All implementation plans must include Constitution Check gate before research phase
- Complexity violations must be explicitly tracked and justified
- Feature specifications must align with progressive enhancement (prioritized user stories)

**Runtime Guidance**: Use `.github/agents/*.agent.md` and `.github/prompts/*.prompt.md` for agent-specific development guidance and command execution workflows.

**Version**: 1.0.0 | **Ratified**: 2025-12-31 | **Last Amended**: 2025-12-31
