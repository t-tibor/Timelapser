# Tasks: RTSP Camera Connection and Video Preview

**Input**: Design documents from `/specs/001-rtsp-preview/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓

**Organization**: Tasks grouped by user story to enable independent implementation and testing. Each story can be delivered as an MVP increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure with `backend/` and `frontend/` directories per plan.md
- [X] T002 [P] Initialize Python project in `backend/` with FastAPI, uvicorn, ffmpeg-python dependencies
- [X] T003 [P] Initialize Next.js 14 project in `frontend/` with TypeScript, hls.js, Video.js dependencies
- [X] T004 [P] Configure Python linting (ruff) and formatting in `backend/.ruff.toml`
- [X] T005 [P] Configure TypeScript/ESLint in `frontend/tsconfig.json` and `frontend/.eslintrc.json`
- [X] T006 [P] Create Docker configurations: `backend/Dockerfile` and `frontend/Dockerfile`
- [X] T007 [P] Create k8s manifests in `k8s/` directory (backend-deployment.yaml, frontend-deployment.yaml, services, ingress)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Create Pydantic models in `backend/src/models/camera.py` (CameraConfiguration)
- [X] T009 [P] Create Pydantic models in `backend/src/models/connection.py` (ConnectionSession, StreamMetadata)
- [X] T010 [P] Create TypeScript types in `frontend/src/types/camera.ts` (CameraConfiguration interface)
- [X] T011 [P] Create TypeScript types in `frontend/src/types/connection.ts` (ConnectionSession, StreamMetadata interfaces)
- [X] T012 Setup FastAPI application structure in `backend/src/main.py` with CORS configuration
- [X] T013 Create API routing structure in `backend/src/api/routes/__init__.py`
- [X] T014 [P] Create custom exceptions in `backend/src/core/exceptions.py` (RTSPConnectionError, ValidationError, etc.)
- [X] T015 [P] Setup configuration management in `backend/src/core/config.py` with environment variables
- [X] T016 [P] Create error handling middleware in `backend/src/api/dependencies.py`
- [X] T017 [P] Setup Next.js app structure in `frontend/src/app/layout.tsx` and `frontend/src/app/page.tsx`
- [X] T018 [P] Create API client base in `frontend/src/services/api.ts` with error handling

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Connect to RTSP Camera (Priority: P1) 🎯 MVP

**Goal**: User can enter RTSP URL, connect to camera, and see live video preview within 5 seconds

**Independent Test**: Enter `rtsp://192.168.1.100:554/stream`, click connect, verify live video appears

### Implementation for User Story 1

- [X] T019 [P] [US1] Create ffmpeg manager service in `backend/src/services/ffmpeg_manager.py` (spawn/kill processes, temp dir management)
- [X] T020 [P] [US1] Create HLS transcoding service in `backend/src/services/hls_service.py` (RTSP→HLS conversion, segment management)
- [X] T021 [P] [US1] Create RTSP connection service in `backend/src/services/rtsp_service.py` (URL validation, codec detection, connectivity test)
- [X] T022 [US1] Implement POST /camera/connect endpoint in `backend/src/api/routes/camera.py` (depends on T019-T021)
- [X] T023 [US1] Implement POST /camera/disconnect endpoint in `backend/src/api/routes/camera.py`
- [X] T024 [US1] Implement GET /camera/stream/{sessionId}/playlist.m3u8 endpoint for HLS playlist serving
- [X] T025 [US1] Implement GET /camera/stream/{sessionId}/{segmentFile} endpoint for HLS segment serving
- [X] T026 [P] [US1] Create camera URL input form component in `frontend/src/components/CameraForm.tsx`
- [X] T027 [P] [US1] Create video player component in `frontend/src/components/VideoPlayer.tsx` using hls.js
- [X] T028 [P] [US1] Create connection status component in `frontend/src/components/ConnectionStatus.tsx`
- [X] T029 [US1] Create camera connection hook in `frontend/src/hooks/useCamera.ts` (manages ConnectionSession state)
- [X] T030 [US1] Integrate components in `frontend/src/app/page.tsx` - connect form + video player + status
- [X] T031 [US1] Add URL format validation (rtsp:// pattern) to CameraForm component
- [X] T032 [US1] Add loading indicator and button disable during connection attempts
- [X] T033 [US1] Add disconnect functionality to video player component

**Checkpoint**: User Story 1 fully functional - can connect, view video, disconnect

---

## Phase 4: User Story 2 - Handle Connection Errors (Priority: P2)

**Goal**: User receives clear, actionable feedback when RTSP connections fail with specific error messages

**Independent Test**: Try invalid URL formats, unreachable IPs, wrong credentials - verify specific error messages appear

### Implementation for User Story 2

- [X] T034 [P] [US2] Add error handling to RTSP service in `backend/src/services/rtsp_service.py` (timeout, unreachable, auth detection)
- [X] T035 [P] [US2] Add codec validation to HLS service in `backend/src/services/hls_service.py` (H.264/H.265 only)
- [X] T036 [US2] Enhance POST /camera/connect with comprehensive error responses (400/401/408/415/503 per contracts/api.md)
- [X] T037 [P] [US2] Create error message component in `frontend/src/components/ErrorMessage.tsx`
- [X] T038 [US2] Add error state handling to useCamera hook in `frontend/src/hooks/useCamera.ts`
- [X] T039 [US2] Integrate error display in connection form - show errors below connect button
- [X] T040 [US2] Add error clearing on retry - clear previous errors when new connection attempt starts
- [X] T041 [US2] Add authentication prompt functionality when 401 error received
- [X] T042 [US2] Add connection timeout handling (10 second limit) with timeout error display

**Checkpoint**: Error handling complete - users get clear feedback for all failure scenarios

---

## Phase 5: User Story 3 - Save Camera Connections (Priority: P3)

**Goal**: User can save camera configurations for quick reconnection, with session-only credential storage

**Independent Test**: Connect to camera, save with name "Test Cam", disconnect, select from saved list, reconnect

### Implementation for User Story 3

- [X] T043 [P] [US3] Create localStorage service in `frontend/src/services/storage.ts` (save/load/delete camera configs)
- [X] T044 [P] [US3] Create saved cameras hook in `frontend/src/hooks/useSavedCameras.ts` (manage localStorage state)
- [X] T045 [P] [US3] Create saved cameras list component in `frontend/src/components/SavedCameras.tsx`
- [X] T046 [US3] Add save camera functionality to useCamera hook - save button when connected
- [X] T047 [US3] Add camera selection to CameraForm component - dropdown/list of saved cameras
- [X] T048 [US3] Add delete functionality to SavedCameras component with confirmation dialog
- [X] T049 [US3] Implement 5 camera limit validation with error message when limit reached
- [X] T050 [US3] Add credential prompting for saved cameras requiring authentication
- [X] T051 [US3] Add session credential storage in useCamera hook (Map<url, credentials>)
- [X] T052 [US3] Add credential reuse during session - skip prompt for same camera
- [X] T053 [US3] Integrate saved cameras UI in main page layout below connection form

**Checkpoint**: All user stories complete - full MVP with save/load functionality

---

## Phase 6: Resilience & Reconnection

**Purpose**: Automatic reconnection handling per FR-009 requirements

- [X] T054 [P] Add connection monitoring to video player component (detect playback stall/error)
- [X] T055 Add exponential backoff reconnection to useCamera hook (2s, 4s, 8s delays, 3 attempts max)
- [X] T056 [P] Add reconnection status display to ConnectionStatus component ("Reconnecting... Attempt 1 of 3")
- [X] T057 Add manual reconnect option after auto-reconnection attempts exhausted
- [X] T058 Add cancel reconnection functionality for user control
- [X] T059 Add connection status polling via GET /camera/status/{sessionId} endpoint

---

## Phase 7: Health & Monitoring

**Purpose**: System health checks and operational monitoring

- [X] T060 [P] Implement GET /health endpoint in `backend/src/api/routes/health.py` (ffmpeg availability check)
- [X] T061 [P] Add session management and cleanup in HLS service (1-hour timeout, temp file cleanup)
- [X] T062 [P] Add ffmpeg process monitoring and automatic cleanup on crashes
- [X] T063 [P] Add rate limiting middleware to camera connect/disconnect endpoints per contracts/api.md
- [X] T064 [P] Add connection limit enforcement (single concurrent connection per constitution)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T065 [P] Add comprehensive logging across all backend services (connection attempts, errors, cleanup)
- [X] T066 [P] Add performance monitoring (connection time tracking, ffmpeg resource usage)
- [X] T067 [P] Code cleanup and refactoring - extract common utilities
- [X] T068 [P] Update documentation in `backend/README.md` and `frontend/README.md`
- [X] T069 [P] Add ARM64 compatibility testing for Raspberry Pi 5 deployment
- [X] T070 Run quickstart.md validation - verify dev setup instructions work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially by priority (P1→P2→P3)
- **Resilience (Phase 6)**: Depends on User Story 1 (US1) completion
- **Health (Phase 7)**: Can start after Foundational, runs parallel to user stories
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Independence

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Enhances US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational - Uses US1 components but independently testable

### Parallel Execution Examples

**Within Phase 2 (Foundational)**:
```bash
# All model creation can run in parallel:
T008 (camera.py) || T009 (connection.py) || T010 (camera.ts) || T011 (connection.ts)

# All configuration can run in parallel:
T014 (exceptions.py) || T015 (config.py) || T016 (dependencies.py) || T017 (layout.tsx) || T018 (api.ts)
```

**Within User Story 1**:
```bash
# All services can run in parallel:
T019 (ffmpeg_manager.py) || T020 (hls_service.py) || T021 (rtsp_service.py)

# All frontend components can run in parallel:
T026 (CameraForm.tsx) || T027 (VideoPlayer.tsx) || T028 (ConnectionStatus.tsx)
```

**Across User Stories** (if team capacity allows):
```bash
# After Phase 2 completes, all stories can start in parallel:
Developer A: User Story 1 (T019-T033)
Developer B: User Story 2 (T034-T042) 
Developer C: User Story 3 (T043-T053)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Project structure ready
2. Complete Phase 2: Foundational → **CRITICAL GATE** - all stories can now begin
3. Complete Phase 3: User Story 1 → **MVP COMPLETE**
4. **STOP and VALIDATE**: Test US1 independently (connect camera, see video)
5. Deploy/demo minimal viable version

### Incremental Delivery

1. Foundation → MVP (US1) → Demo/Deploy ✅ 
2. Add US2 (error handling) → Test independently → Demo/Deploy
3. Add US3 (save cameras) → Test independently → Demo/Deploy
4. Add resilience features → Demo/Deploy
5. Each increment adds value without breaking previous functionality

### Quality Gates

- **After Phase 2**: Can connect to backend API, models defined, no compilation errors
- **After US1**: Can connect to real RTSP camera and see video preview
- **After US2**: Invalid URLs show specific error messages
- **After US3**: Can save camera and reconnect from list
- **Final**: All success criteria (SC-001 through SC-008) from spec.md verified

---

## Resource Estimates

**Phase 1-2 (Setup + Foundation)**: 8-12 hours
**User Story 1 (P1)**: 12-16 hours  
**User Story 2 (P2)**: 6-8 hours
**User Story 3 (P3)**: 8-10 hours
**Phases 6-8 (Polish)**: 6-10 hours

**Total**: 40-56 hours (aligns with research.md estimate of 25-35 hours core + polish)

---

## Notes

- [P] tasks target different files with no dependencies - safe for parallel execution
- [Story] labels enable independent user story tracking and delivery
- Each user story delivers testable value independently 
- Foundation phase is critical blocker - prioritize completion
- Verify against quickstart.md setup instructions during development
- Test with real RTSP cameras during US1 implementation
- Session-only credential storage per security requirements (no persistence)