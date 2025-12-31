# Feature Specification: RTSP Camera Connection and Video Preview

**Feature Branch**: `001-rtsp-preview`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "Connection and video preview. The web app should provide a page, where the user can enter a rstp URL for the web camera. When hitting the connect button, the page should display a preview of the webcamera video stream."

## Clarifications

### Session 2025-12-31

- Q: How should RTSP credentials (username/password) be stored for saved camera configurations? → A: Store credentials only in browser memory (lost on page refresh) - no persistence
- Q: When RTSP stream disconnects unexpectedly, what automatic reconnection strategy should be used? → A: Exponential backoff - 3 attempts with 2s, 4s, 8s delays between retries
- Q: What is the maximum number of saved camera configurations allowed? → A: 5 saved cameras maximum - minimalist approach for personal use
- Q: Which video codecs should be supported for RTSP streams? → A: H.264/H.265 only - most common RTSP codecs, broad compatibility
- Q: How many cameras can be connected and viewed simultaneously? → A: Single concurrent camera connection only - user must disconnect before connecting to another

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect to RTSP Camera (Priority: P1)

User opens the web application, enters an RTSP URL for their webcam, and connects to view the live video stream. This is the core functionality that enables all timelapse features.

**Why this priority**: This is the foundational capability - without being able to connect and preview a camera stream, no other features (timelapse creation, scheduling) can function. This delivers immediate value by validating that the user's camera URL is correct and accessible.

**Independent Test**: Can be fully tested by entering a valid RTSP URL (e.g., `rtsp://192.168.1.100:554/stream`), clicking connect, and verifying that live video appears on screen. Delivers value by confirming camera connectivity.

**Acceptance Scenarios**:

1. **Given** user is on the camera connection page, **When** user enters a valid RTSP URL and clicks "Connect", **Then** live video preview displays within 5 seconds
2. **Given** user is on the camera connection page with empty URL field, **When** user clicks "Connect", **Then** validation error message appears indicating URL is required
3. **Given** user has active camera connection, **When** user attempts to connect to different camera, **Then** system automatically disconnects current camera and connects to new one
4. **Given** user has entered a valid RTSP URL format, **When** connection attempt is in progress, **Then** loading indicator displays and connect button is disabled
5. **Given** user is viewing a connected camera stream, **When** user clicks "Disconnect", **Then** video preview stops and connection form is reset
6. **Given** camera stream is displaying, **When** network interruption occurs, **Then** user sees connection lost message and system automatically attempts reconnection using exponential backoff (3 attempts with 2s, 4s, 8s delays)

---

### User Story 2 - Handle Connection Errors (Priority: P2)

User receives clear, actionable feedback when RTSP connection fails due to invalid URL, unreachable camera, authentication issues, or network problems.

**Why this priority**: Error handling is critical for usability but can be implemented after basic connectivity works. Users need to understand why connections fail to troubleshoot their camera setup.

**Independent Test**: Can be tested by attempting connections with various invalid scenarios (wrong URL format, non-existent IP, wrong credentials) and verifying appropriate error messages appear. Delivers value through improved user experience.

**Acceptance Scenarios**:

1. **Given** user enters an invalid RTSP URL format, **When** user clicks "Connect", **Then** validation error displays: "Invalid RTSP URL format. Expected: rtsp://hostname:port/path"
2. **Given** user enters a valid URL to unreachable camera, **When** connection times out after 10 seconds, **Then** error displays: "Cannot reach camera. Check IP address and network connection."
3. **Given** user enters URL requiring authentication without credentials, **When** connection is rejected, **Then** error displays: "Authentication required. Please provide username and password."
4. **Given** user is viewing error message, **When** user corrects the issue and retries, **Then** previous error clears and new connection attempt begins

---

### User Story 3 - Save Camera Connections (Priority: P3)

User can save RTSP camera configurations (URL, name) for quick reconnection. Credentials are kept in memory during the current browser session only and must be re-entered after page refresh for security.

**Why this priority**: This is a convenience feature that improves workflow for users with multiple cameras or frequent reconnections, but the core functionality works without it. Credentials are session-only to avoid security complexity of encrypted storage.

**Independent Test**: Can be tested by connecting to a camera, saving it with a friendly name, disconnecting, and then selecting the saved camera from a list to reconnect instantly. Delivers value through time savings.

**Acceptance Scenarios**:

1. **Given** user has successfully connected to camera, **When** user clicks "Save Camera" and enters friendly name, **Then** camera configuration (URL and name) is saved and appears in saved cameras list
2. **Given** user has saved cameras, **When** user opens connection page, **Then** saved cameras appear as selectable options with their friendly names
3. **Given** user has 5 saved cameras (maximum), **When** user attempts to save another camera, **Then** system displays error: "Maximum 5 saved cameras reached. Delete a camera to add a new one."
4. **Given** user selects a saved camera requiring authentication, **When** user clicks "Connect", **Then** system prompts for credentials before establishing connection
4. **Given** user has entered credentials during current session, **When** user reconnects to same camera, **Then** credentials are reused from memory without re-prompting
5. **Given** user refreshes browser page, **When** user connects to saved camera requiring auth, **Then** system prompts for credentials again (memory cleared)
7. **Given** user has saved camera, **When** user clicks "Delete" on saved camera, **Then** confirmation prompt appears and camera is removed from list upon confirmation

---

### Edge Cases

- What happens when RTSP stream suddenly disconnects mid-viewing? System displays "Connection Lost" message and automatically retries 3 times with exponential backoff (2s, 4s, 8s delays). After 3 failed attempts, user must manually reconnect.
- How does system handle RTSP URLs with special characters or authentication tokens?
- What happens if camera stream format is unsupported (codec, resolution)? System supports H.264 and H.265 codecs only. Streams with other codecs (MJPEG, VP8, etc.) display error: "Unsupported video format. Camera must use H.264 or H.265 codec."
- How does system behave with very high resolution streams (4K) that may overwhelm browser?
- What happens when user tries to connect to the same camera multiple times simultaneously? System allows only single concurrent connection. Attempting new connection automatically disconnects current stream.
- How does system handle RTSP URLs using non-standard ports?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a web page with RTSP URL input field and connect button
- **FR-002**: System MUST validate RTSP URL format before attempting connection (protocol, hostname, optional port/path)
- **FR-003**: System MUST establish connection to RTSP stream when user clicks connect with valid URL
- **FR-004**: System MUST display live video preview from RTSP stream within 5 seconds of successful connection
- **FR-005**: System MUST provide disconnect functionality to stop video stream
- **FR-005a**: System MUST support only single concurrent camera connection at a time
- **FR-005b**: System MUST automatically disconnect current camera when user connects to different camera
- **FR-006**: System MUST display loading indicator during connection attempts
- **FR-007**: System MUST provide clear error messages for connection failures (invalid URL, unreachable host, authentication failure, timeout, unsupported codec)
- **FR-007a**: System MUST support H.264 and H.265 video codecs only
- **FR-007b**: System MUST display specific error message when stream uses unsupported codec: "Unsupported video format. Camera must use H.264 or H.265 codec."
- **FR-008**: System MUST handle connection timeouts (10 second maximum wait for initial connection)
- **FR-009**: System MUST detect and notify user when active stream disconnects unexpectedly
- **FR-009a**: System MUST automatically attempt reconnection when stream disconnects using exponential backoff strategy
- **FR-009b**: System MUST retry connection 3 times with delays of 2 seconds, 4 seconds, and 8 seconds between attempts
- **FR-009c**: System MUST display reconnection attempt status to user (e.g., "Reconnecting... Attempt 1 of 3")
- **FR-009d**: System MUST allow user to cancel automatic reconnection attempts
- **FR-009e**: System MUST offer manual reconnect option after all automatic attempts exhausted
- **FR-010**: System MUST support optional username/password authentication for RTSP streams
- **FR-011**: System MUST allow users to save camera configurations (URL and friendly name only - credentials NOT persisted)
- **FR-011a**: System MUST enforce maximum limit of 5 saved camera configurations
- **FR-011b**: System MUST prevent saving additional cameras when limit is reached and display clear error message
- **FR-012**: System MUST persist saved camera configurations (URL, name) between browser sessions using browser localStorage
- **FR-012a**: System MUST store RTSP credentials (username/password) only in browser memory for current session
- **FR-012b**: System MUST clear credentials from memory on page refresh or browser close
- **FR-012c**: System MUST prompt user for credentials when connecting to saved camera requiring authentication after page refresh
- **FR-013**: System MUST allow users to select and connect to previously saved cameras
- **FR-014**: System MUST allow users to delete saved camera configurations
- **FR-015**: System MUST prevent UI interactions (multiple connect clicks) during active connection attempts

### Key Entities *(include if feature involves data)*

- **Camera Configuration**: Represents a saved RTSP camera setup including friendly name, RTSP URL (persisted in localStorage), creation timestamp, and last used timestamp. Credentials are NOT included in persisted configuration. Maximum 5 configurations can be saved per user.
- **Connection Session**: Represents an active RTSP connection including camera URL, connection status (connecting/connected/disconnected/error), connection timestamp, optional session-only credentials (stored in memory), error messages if any, and stream metadata (resolution, codec - H.264 or H.265 only)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully connect to RTSP camera and see live preview within 5 seconds for valid URLs on local network
- **SC-002**: System provides specific error feedback within 10 seconds for failed connection attempts
- **SC-003**: 95% of users successfully connect to their camera on first attempt with a valid RTSP URL
- **SC-004**: Users can reconnect to saved cameras in under 2 seconds (bypassing URL entry)
- **SC-005**: Video preview displays smoothly without buffering for streams up to 1080p at 30fps on target hardware
- **SC-006**: Connection state (connecting/connected/error) is always clearly visible to user
- **SC-007**: System handles unexpected disconnections and notifies user within 3 seconds of detection
- **SC-008**: System successfully reconnects within 14 seconds (3 retry attempts) for 90% of transient network failures
