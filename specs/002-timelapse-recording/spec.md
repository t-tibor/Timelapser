# Feature Specification: Timelapse Recording

**Feature Branch**: `002-timelapse-recording`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "After connecting to the camera, and checking the preview, the user can click on a record button to start a timelapse recording. Before that the user can tweak the recording parameters (most importantly: framerate, recording length, recording name). The recording parameters should contain a reasonable default value. After the recording has started, the config frame should be hidden, and the UI should display, that a recording is ongoing. The system should only support a single recording, multi-recording support is not needed. The recording should run until either the user stops it manually, or the configured length is achieved. While the recording is running, the camera preview should continue displaying the video stream, but the camera URL is fixed, and the user cannot modify as long as the recording is ongoing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Start Timelapse Recording (Priority: P1)

User connects to camera, configures recording parameters (name, duration, framerate), and starts timelapse recording. The system captures frames at specified intervals and provides visual feedback that recording is in progress.

**Why this priority**: This is the core timelapse functionality - the primary purpose of the application. Without the ability to record timelapses, the application delivers no value beyond simple camera preview.

**Independent Test**: Can be fully tested by connecting to camera, setting recording parameters (e.g., "Sunset", 1 hour, 1 fps), clicking record, and verifying recording status is displayed and frames are being captured. Delivers value by creating timelapse content.

**Acceptance Scenarios**:

1. **Given** user has connected camera and is viewing live preview, **When** user clicks "Record" button, **Then** recording configuration panel displays with default parameter values
2. **Given** recording configuration panel is displayed, **When** user views default values, **Then** recording name is auto-generated (e.g., "Timelapse_2025-12-31_14-30"), duration is 1 hour, and framerate is 1 frame per second
3. **Given** user has opened recording configuration, **When** user enters custom recording name "Sunset Timelapse", **Then** recording name field updates and preserves custom value
4. **Given** user has configured recording parameters, **When** user clicks "Start Recording", **Then** configuration panel hides, recording status indicator displays showing "Recording in Progress", and elapsed time counter begins
5. **Given** recording is in progress, **When** user views the UI, **Then** camera URL field is disabled and video preview continues displaying live stream
6. **Given** recording has been active for configured duration, **When** duration timer reaches zero, **Then** recording automatically stops, status indicator clears, and user receives completion notification

---

### User Story 2 - Stop Recording Manually (Priority: P2)

User can manually stop an in-progress timelapse recording before the configured duration is reached, preserving all captured frames up to that point.

**Why this priority**: Manual stop is essential for user control but is a secondary capability after starting recordings. Users may need to end recordings early due to changing conditions or mistakes.

**Independent Test**: Can be tested by starting a recording with long duration (e.g., 2 hours), waiting a short time (e.g., 30 seconds), clicking stop, and verifying recording ends immediately with frames preserved. Delivers value through recording flexibility.

**Acceptance Scenarios**:

1. **Given** recording is in progress, **When** user clicks "Stop Recording" button, **Then** system immediately stops capturing frames
2. **Given** user has clicked stop recording, **When** recording stops, **Then** recording status indicator updates to "Recording Stopped - [X] frames captured in [Y] elapsed time"
3. **Given** recording has stopped (manually or automatically), **When** recording ends, **Then** camera URL field is re-enabled and user can connect to different camera or adjust settings
4. **Given** user attempts to stop recording, **When** user clicks stop button, **Then** confirmation dialog appears asking "Stop recording? [X] frames captured so far will be saved."

---

### User Story 3 - Monitor Recording Progress (Priority: P3)

User can view real-time recording statistics including elapsed time, frames captured, estimated completion time, and storage usage while recording is in progress.

**Why this priority**: Progress monitoring enhances user experience but the core functionality works without detailed statistics. Users benefit from knowing recording status but can function with basic "recording active" indicator.

**Independent Test**: Can be tested by starting a recording and observing that elapsed time increments, frame count increases at expected intervals, and completion estimate is accurate. Delivers value through transparency and user confidence.

**Acceptance Scenarios**:

1. **Given** recording is in progress, **When** user views recording status panel, **Then** elapsed time displays in HH:MM:SS format and updates every second
2. **Given** recording is capturing frames, **When** each frame capture occurs, **Then** frames captured counter increments (e.g., "147 frames captured")
3. **Given** recording has configured duration, **When** user views status panel, **Then** estimated completion time displays (e.g., "Estimated completion: 3:45 PM")
4. **Given** recording is in progress, **When** user views status panel, **Then** progress bar displays percentage complete (elapsed time / total duration * 100)

---

### Edge Cases

- What happens if recording runs for very long duration (24+ hours) on Raspberry Pi with limited storage?
- How does system handle camera disconnect during active recording?
- What happens if user refreshes browser page while recording is active?
- How does system behave if framerate is set very high (e.g., 10 fps) leading to storage exhaustion?
- What happens if user tries to start new recording while one is already active?
- How does system handle invalid parameter values (negative duration, framerate of 0, empty recording name)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide "Record" button visible when camera is connected and no recording is active
- **FR-002**: System MUST display recording configuration panel when user clicks Record button
- **FR-003**: System MUST provide default recording parameter values: auto-generated name (Timelapse_YYYY-MM-DD_HH-MM), 1 hour duration, 1 fps framerate
- **FR-004**: System MUST allow user to customize recording name (text field, 50 character maximum)
- **FR-005**: System MUST allow user to configure recording duration (options: 30 minutes, 1 hour, 2 hours, 4 hours, 8 hours, 12 hours, 24 hours, or custom duration)
- **FR-006**: System MUST allow user to configure framerate (options: 1 fps, 2 fps, 5 fps, 10 fps, 30 fps)
- **FR-007**: System MUST validate recording parameters before starting (name not empty, duration > 0, framerate > 0)
- **FR-008**: System MUST start capturing frames at configured intervals when user clicks "Start Recording"
- **FR-009**: System MUST hide configuration panel and display recording status indicator when recording starts
- **FR-010**: System MUST disable camera URL field and connection controls while recording is active
- **FR-011**: System MUST continue displaying live camera preview during recording
- **FR-012**: System MUST capture individual frames from video stream at configured framerate intervals
- **FR-013**: System MUST enforce single recording limit - only one recording can be active at a time
- **FR-014**: System MUST automatically stop recording when configured duration is reached
- **FR-015**: System MUST provide "Stop Recording" button visible when recording is active
- **FR-016**: System MUST display confirmation dialog when user attempts to stop recording manually
- **FR-017**: System MUST preserve all captured frames when recording stops (manually or automatically)
- **FR-018**: System MUST display recording completion notification showing frames captured and elapsed time
- **FR-019**: System MUST re-enable camera URL field and connection controls after recording stops
- **FR-020**: System MUST display elapsed time counter during recording (HH:MM:SS format, updates every second)
- **FR-021**: System MUST display frames captured counter during recording
- **FR-022**: System MUST display progress bar showing percentage complete (elapsed / total duration)
- **FR-023**: System MUST display estimated completion time during recording

### Key Entities

- **Recording Configuration**: Represents user-defined recording parameters including recording name (auto-generated or custom), duration in seconds, framerate in frames per second, creation timestamp
- **Recording Session**: Represents an active or completed recording including configuration reference, start timestamp, end timestamp (if completed), status (recording/stopped/completed), frames captured count, elapsed time, captured frame references/storage paths
- **Captured Frame**: Represents a single frame extracted from video stream including frame number/sequence, capture timestamp, image data/file path, resolution, format

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure and start timelapse recording within 30 seconds of connecting to camera
- **SC-002**: System captures frames at configured framerate with ±5% timing accuracy
- **SC-003**: Recording automatically stops within 1 second of configured duration being reached
- **SC-004**: Users can manually stop recording and all captured frames are preserved (0% data loss)
- **SC-005**: Recording status indicators (elapsed time, frame count, progress) update in real-time with ≤1 second latency
- **SC-006**: System maintains smooth camera preview (no freezing or stuttering) during frame capture at up to 10 fps
- **SC-007**: Single recording limit is enforced - attempting to start second recording displays clear error message
- **SC-008**: 95% of recordings complete successfully without errors (camera disconnect, storage issues)
