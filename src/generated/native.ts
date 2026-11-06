export interface paths {
    "/native-worker/v2/presence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Report availability, capabilities, and qualification evidence
         * @description The authenticated principal selects the worker identity. Capabilities and evidence are untrusted scheduling inputs; the response reports the server's separate qualification and authorization decisions.
         */
        post: operations["reportWorkerPresence"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Acquire one compatible native execution lease
         * @description Returns work only when presence, qualification, capability, availability, authorization, and policy all permit acquisition. A 204 response means no compatible work is currently available.
         */
        post: operations["acquireNativeLease"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases/{leaseId}/renew": {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Renew a current lease and observe cancellation */
        post: operations["renewNativeLease"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases/{leaseId}/release": {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Release a current lease without reporting ordinary completion */
        post: operations["releaseNativeLease"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases/{leaseId}/upload-grants": {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a short-lived exact-object upload grant
         * @description The server selects the object key from the assigned artifact slot. The response contains a short-lived S3 Signature Version 4 presigned PUT URL and the exact headers the worker must reproduce. The grant authorizes an identical retry until expiry and no listing, reading, deletion, or arbitrary key selection.
         */
        post: operations["createNativeUploadGrant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases/{leaseId}/artifacts": {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register a verified immutable uploaded artifact
         * @description Registration is conditional on the current lease, attempt, and run revision. The server verifies bytes at the server-selected object key before accepting the reference.
         */
        post: operations["registerNativeArtifact"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/leases/{leaseId}/terminal": {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Report completed or failed execution for the current attempt
         * @description Completion names the manifest registered last. Duplicate identical reports are acknowledged; conflicting or stale reports are rejected.
         */
        post: operations["reportNativeTerminal"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/attempts/discover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Discover this worker's current measurement slot after an uncertain acquisition
         * @description Read-only, worker-scoped observation serialized with acquisition and presence replacement. Report stored availability and at most one unexpired, unreleased v2 lease at serverTime, including a terminal report if that lease still occupies capacity. NONE means no current slot, not that an acquisition never succeeded. No historical enumeration, lease capability, execution recipe or upload authority is returned. Stop the old process and withdraw availability before manual recovery; this snapshot never authorizes execution, deletion or acquisition. Fail closed rather than choosing one if multiple current slots exist.
         */
        post: operations["discoverNativeAttempt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/native-worker/v2/attempts/inspect": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Inspect one retained attempt without recovering lease authority
         * @description The bearer principal selects the worker. A terminal report takes precedence over a matching lease row. ACTIVE is a point-in-time lease observation, INACTIVE means the matching retained lease row is released or expired, and 404 does not distinguish an unknown attempt from one owned by another worker. No response supplies a lease capability or authorizes cleanup, resumption, or another acquisition.
         */
        post: operations["inspectNativeAttempt"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Format: uuid */
        Uuid: string;
        /** Format: date-time */
        Timestamp: string;
        Sha256: string;
        Identifier: string;
        ArtifactFormat: string;
        SemanticVersion: string;
        RunId: string;
        LeaseCapability: string;
        AttemptFence: {
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
        };
        ExecutionArtifact: {
            /** @constant */
            kind: "source-checkout";
            /** Format: uri */
            repository: string;
            revision: string;
            lockfile: string;
            lockfileSha256: components["schemas"]["Sha256"];
        };
        WorkerCapabilities: {
            /**
             * @description Native Worker API v2 permits one active browser measurement lease.
             * @constant
             */
            capacity: 1;
            /** @constant */
            tool: "playwright";
            /** @enum {unknown} */
            operatingSystem: "windows" | "linux";
            /** @enum {unknown} */
            architecture: "x64" | "arm64";
            browsers: "chromium"[];
            /** @constant */
            runnerContract: 2;
            executionArtifacts: "source-checkout"[];
            artifactKinds: components["schemas"]["Identifier"][];
            diagnosticModes: "baseline"[];
        };
        /** @description Immutable evidence claimed by the worker. It does not let the worker declare itself qualified. */
        QualificationEvidence: {
            environmentId: components["schemas"]["Identifier"];
            environmentSha256: components["schemas"]["Sha256"];
            runner: components["schemas"]["ExecutionArtifact"];
        };
        WorkerPresence: {
            /** @constant */
            protocolVersion: 2;
            agentVersion: components["schemas"]["SemanticVersion"];
            /** @enum {unknown} */
            availability: "AVAILABLE" | "DRAINING" | "UNAVAILABLE";
            capabilities: components["schemas"]["WorkerCapabilities"];
            qualificationEvidence: components["schemas"]["QualificationEvidence"];
        };
        QualificationDecision: {
            /** @enum {unknown} */
            status: "QUALIFIED" | "UNQUALIFIED" | "STALE";
            reasons: string[];
            validUntil?: components["schemas"]["Timestamp"];
        } & (unknown & unknown);
        PresenceStatus: {
            workerId: components["schemas"]["Identifier"];
            serverTime: components["schemas"]["Timestamp"];
            nextHeartbeatSeconds: number;
            /** @enum {unknown} */
            availability: "AVAILABLE" | "DRAINING" | "UNAVAILABLE";
            qualification: components["schemas"]["QualificationDecision"];
            authorizedToAcquire: boolean;
        };
        AcquireLease: {
            /** @constant */
            protocolVersion: 2;
            maxWaitSeconds: number;
        };
        ArtifactPlan: {
            slot: components["schemas"]["Identifier"];
            kind: components["schemas"]["Identifier"];
            mediaType: string;
            format: components["schemas"]["ArtifactFormat"];
            maximumBytes: number;
            required: boolean;
        };
        /** @description Immutable, server-reviewed inputs for the baseline Chromium runner. The enclosing lease supplies runId and catalogueTestId; the assignment supplies workloadId, profile, target URL, browser family, diagnostic mode and execution artifact. The worker must not substitute local defaults. */
        ExecutionRecipe: {
            /**
             * @description Repository-owned search journey; other journeys require an explicit contract revision.
             * @constant
             */
            journeyId: "search";
            workloadVersion: components["schemas"]["SemanticVersion"];
            workloadSha256: components["schemas"]["Sha256"];
            scenario: {
                /** @enum {unknown} */
                cacheProfile: "cold" | "warm";
                /** @enum {unknown} */
                pageReuse: "per-iteration" | "per-run";
                warmupIterations: number;
                measurementIterations: number;
            } & unknown;
            environment: {
                profileId: components["schemas"]["Identifier"];
                profileVersion: components["schemas"]["SemanticVersion"];
                fingerprint: components["schemas"]["Sha256"];
                evidenceSha256: components["schemas"]["Sha256"];
            };
            browserSettings: {
                headless: boolean;
                viewport: {
                    width: number;
                    height: number;
                };
                deviceScaleFactor: number;
            };
        };
        Lease: {
            leaseId: components["schemas"]["Uuid"];
            attemptId: components["schemas"]["Uuid"];
            runId: components["schemas"]["RunId"];
            runRevision: number;
            issuedAt: components["schemas"]["Timestamp"];
            expiresAt: components["schemas"]["Timestamp"];
            renewAfterSeconds: number;
            assignment: {
                catalogueTestId: components["schemas"]["Identifier"];
                workloadId: components["schemas"]["Identifier"];
                /** @enum {unknown} */
                profile: "smoke" | "average" | "regression" | "stress" | "capacity" | "soak";
                /** @description Server-resolved reviewed target. It is not supplied by the Run caller or selected by the worker. */
                target: {
                    environmentId: components["schemas"]["Identifier"];
                    /** Format: uri */
                    baseUrl: string;
                };
                /** @constant */
                browser: "chromium";
                /** @constant */
                diagnosticMode: "baseline";
                executionArtifact: components["schemas"]["ExecutionArtifact"];
                recipe: components["schemas"]["ExecutionRecipe"];
            };
            artifactPlan: [
                components["schemas"]["ArtifactPlan"] & {
                    /** @constant */
                    slot?: "measurements";
                    /** @constant */
                    kind?: "measurements";
                    /** @constant */
                    mediaType?: "application/json";
                    /** @constant */
                    format?: "playwright-measurements/v2";
                    /** @constant */
                    required?: true;
                },
                components["schemas"]["ArtifactPlan"] & {
                    /** @constant */
                    slot?: "manifest";
                    /** @constant */
                    kind?: "manifest";
                    /** @constant */
                    mediaType?: "application/json";
                    /** @constant */
                    format?: "raw-result/v2";
                    /** @constant */
                    required?: true;
                }
            ];
        };
        RenewLease: {
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            /** @enum {unknown} */
            phase: "PREPARING" | "RUNNING" | "UPLOADING" | "FINALIZING";
        };
        LeaseRenewal: {
            leaseId: components["schemas"]["Uuid"];
            attemptId: components["schemas"]["Uuid"];
            runRevision: number;
            serverTime: components["schemas"]["Timestamp"];
            expiresAt: components["schemas"]["Timestamp"];
            renewAfterSeconds: number;
            cancellationRequested: boolean;
            stopBy?: components["schemas"]["Timestamp"];
        };
        ReleaseLease: {
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            /** @enum {unknown} */
            reason: "CANCELLATION_REQUESTED" | "LEASE_LOST" | "WORKER_SHUTDOWN" | "PREPARATION_FAILED";
            message?: string;
        };
        UploadGrantRequest: {
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            slot: components["schemas"]["Identifier"];
            size: number;
            sha256: components["schemas"]["Sha256"];
            mediaType: string;
        };
        UploadGrant: {
            grantId: components["schemas"]["Uuid"];
            leaseId: components["schemas"]["Uuid"];
            attemptId: components["schemas"]["Uuid"];
            runId: components["schemas"]["RunId"];
            slot: components["schemas"]["Identifier"];
            objectKey: string;
            /**
             * Format: uri
             * @description Short-lived S3 Signature Version 4 presigned PUT URL for the exact server-selected object. The URL query is secret bearer material and must not be logged or persisted.
             */
            uploadUrl: string;
            uploadHeaders: components["schemas"]["PresignedUploadHeaders"];
            /** @constant */
            method: "PUT";
            expiresAt: components["schemas"]["Timestamp"];
            maximumBytes: number;
            sha256: components["schemas"]["Sha256"];
        };
        /** @description Closed set of request headers that the worker must reproduce exactly. Header names are lowercase canonical names; values and the presigned URL are sensitive delivery material. */
        PresignedUploadHeaders: {
            /** @description Exact media type signed into the upload request. */
            "content-type": string;
            /** @description Base64 encoding of the full-object SHA-256 digest signed into the upload request. */
            "x-amz-checksum-sha256": string;
        };
        RegisterArtifact: {
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            grantId: components["schemas"]["Uuid"];
            slot: components["schemas"]["Identifier"];
            size: number;
            sha256: components["schemas"]["Sha256"];
        };
        ArtifactReference: {
            artifactId: components["schemas"]["Uuid"];
            runId: components["schemas"]["RunId"];
            attemptId: components["schemas"]["Uuid"];
            slot: components["schemas"]["Identifier"];
            kind: components["schemas"]["Identifier"];
            /** Format: uri */
            uri: string;
            size: number;
            sha256: components["schemas"]["Sha256"];
            mediaType: string;
            registeredAt: components["schemas"]["Timestamp"];
        };
        TerminalReport: {
            /** @constant */
            kind: "COMPLETED";
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            manifestArtifactId: components["schemas"]["Uuid"];
        } | {
            /** @constant */
            kind: "FAILED";
            attemptId: components["schemas"]["Uuid"];
            expectedRunRevision: number;
            failure: {
                /** @enum {unknown} */
                code: "PREPARATION_FAILED" | "TOOL_FAILED" | "CAPTURE_FAILED" | "UPLOAD_FAILED" | "HOST_BECAME_UNQUALIFIED";
                message: string;
                retryable: boolean;
            };
        };
        DiscoverAttempt: {
            /** @constant */
            protocolVersion: 2;
        };
        /**
         * @description Stored worker availability at serverTime, irrespective of freshness, qualification or authorization. UNREPORTED means no presence record exists. This field is not permission to acquire.
         * @enum {string}
         */
        DiscoveryAvailability: "UNREPORTED" | "AVAILABLE" | "DRAINING" | "UNAVAILABLE";
        /** @description At most one current measurement slot owned by the bearer principal. Read serverTime after serialization with acquisition and presence; use it consistently for availability, slot expiry and attempt inspection. Expiry is exclusive. NONE includes expired, released or absent leases and is not a historical or idempotency result. */
        AttemptDiscovery: {
            /** @constant */
            state: "NONE";
            serverTime: components["schemas"]["Timestamp"];
            availability: components["schemas"]["DiscoveryAvailability"];
        } | {
            /** @constant */
            state: "FOUND";
            serverTime: components["schemas"]["Timestamp"];
            availability: components["schemas"]["DiscoveryAvailability"] & unknown;
            /** @description Expiry of the unreleased occupying lease, strictly later than serverTime. For ACTIVE, it equals attempt.expiresAt. Retained terminal acceptance does not itself release capacity. */
            slotExpiresAt: components["schemas"]["Timestamp"];
            /** @description ACTIVE or TERMINAL at the envelope's serverTime. Terminal acceptance takes precedence over the retained lease. This is identity and state, never authority. */
            attempt: components["schemas"]["AttemptInspection"] & unknown;
        };
        InspectAttempt: {
            /** @constant */
            protocolVersion: 2;
            runId: components["schemas"]["RunId"];
            attemptId: components["schemas"]["Uuid"];
        };
        AttemptInspection: {
            runId: components["schemas"]["RunId"];
            attemptId: components["schemas"]["Uuid"];
            /** @constant */
            state: "ACTIVE";
            serverTime: components["schemas"]["Timestamp"];
            leaseId: components["schemas"]["Uuid"];
            expiresAt: components["schemas"]["Timestamp"];
            runRevision: number;
        } | {
            runId: components["schemas"]["RunId"];
            attemptId: components["schemas"]["Uuid"];
            /** @constant */
            state: "INACTIVE";
            serverTime: components["schemas"]["Timestamp"];
        } | {
            runId: components["schemas"]["RunId"];
            attemptId: components["schemas"]["Uuid"];
            /** @constant */
            state: "TERMINAL";
            serverTime: components["schemas"]["Timestamp"];
            /** @enum {unknown} */
            terminalKind: "COMPLETED" | "FAILED";
            runRevision: number;
            acceptedAt: components["schemas"]["Timestamp"];
        };
        TerminalAck: {
            attemptId: components["schemas"]["Uuid"];
            runRevision: number;
            /** @enum {unknown} */
            disposition: "ACCEPTED" | "ALREADY_ACCEPTED";
        };
        Error: {
            /** @enum {unknown} */
            code: "INVALID_REQUEST" | "UNAUTHENTICATED" | "NOT_AUTHORIZED" | "NOT_QUALIFIED" | "NOT_AVAILABLE" | "CAPABILITY_MISMATCH" | "STALE_ATTEMPT" | "REVISION_CONFLICT" | "LEASE_EXPIRED" | "LEASE_RELEASED" | "ARTIFACT_MISMATCH" | "DUPLICATE_CONFLICT" | "ATTEMPT_NOT_FOUND" | "RATE_LIMITED" | "INTERNAL_ERROR" | "DEPENDENCY_UNAVAILABLE";
            message: string;
            requestId?: components["schemas"]["Uuid"];
        };
    };
    responses: {
        /** @description Malformed or structurally invalid request */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Missing or invalid worker credential */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Authenticated worker is not authorized for the operation */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Expected attempt or Run revision is stale, or the report conflicts with an accepted mutation */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Lease expired, was released, or no longer belongs to the current attempt */
        LeaseGone: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Attempt is unknown or not owned by the authenticated worker; the server does not distinguish these cases */
        AttemptNotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "ATTEMPT_NOT_FOUND";
                };
            };
        };
        /** @description Polling or mutation rate exceeded */
        RateLimited: {
            headers: {
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Unexpected control-plane failure */
        InternalError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Control-plane dependency unavailable */
        Unavailable: {
            headers: {
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        LeaseId: components["schemas"]["Uuid"];
        /** @description Opaque capability bound to the authenticated worker and this lease. */
        LeaseCapability: components["schemas"]["LeaseCapability"];
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    reportWorkerPresence: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkerPresence"];
            };
        };
        responses: {
            /** @description Current server interpretation of worker state */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PresenceStatus"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    acquireNativeLease: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcquireLease"];
            };
        };
        responses: {
            /** @description Lease acquired */
            200: {
                headers: {
                    /** @description Opaque capability for this lease. Never include it in JSON, logs, or evidence. */
                    "X-Perfeng-Lease": components["schemas"]["LeaseCapability"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Lease"];
                };
            };
            /** @description No compatible work */
            204: {
                headers: {
                    "Retry-After": number;
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    renewNativeLease: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RenewLease"];
            };
        };
        responses: {
            /** @description Renewed lease and current cancellation state */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LeaseRenewal"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
            410: components["responses"]["LeaseGone"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    releaseNativeLease: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReleaseLease"];
            };
        };
        responses: {
            /** @description Lease released; duplicate release is idempotent */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
            410: components["responses"]["LeaseGone"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    createNativeUploadGrant: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UploadGrantRequest"];
            };
        };
        responses: {
            /** @description Upload grant created. The response body contains sensitive bearer material and must not be logged or persisted. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UploadGrant"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
            410: components["responses"]["LeaseGone"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    registerNativeArtifact: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterArtifact"];
            };
        };
        responses: {
            /** @description Artifact verified and registered */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtifactReference"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
            410: components["responses"]["LeaseGone"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    reportNativeTerminal: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque capability bound to the authenticated worker and this lease. */
                "X-Perfeng-Lease": components["parameters"]["LeaseCapability"];
            };
            path: {
                leaseId: components["parameters"]["LeaseId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TerminalReport"];
            };
        };
        responses: {
            /** @description Terminal report accepted or previously accepted */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TerminalAck"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["Conflict"];
            410: components["responses"]["LeaseGone"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    discoverNativeAttempt: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DiscoverAttempt"];
            };
        };
        responses: {
            /** @description One consistent server observation, never recovered authority */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttemptDiscovery"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    inspectNativeAttempt: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InspectAttempt"];
            };
        };
        responses: {
            /** @description Read-only server snapshot for an attempt owned by the authenticated worker */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttemptInspection"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["AttemptNotFound"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
}
