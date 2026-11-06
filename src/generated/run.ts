export interface paths {
    "/v1/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a run idempotently
         * @description Select approved, versioned catalogue/environment/policy resources. No caller-supplied commands, target URLs or credentials. Idempotency is scoped to authenticated principal and this operation.
         */
        post: operations["createRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/runs/{runId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        /** Read the current run snapshot */
        get: operations["getRun"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/runs/{runId}/artifacts": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        /**
         * List immutable artifacts visible for a run
         * @description Returns the current principal-scoped artifact-reference snapshot in ascending artifact-ID order. The collection can be empty or partial while the run is active. References are evidence metadata, not object bytes, credentials, signed URLs, lifecycle completion, or analysis verdicts.
         */
        get: operations["listRunArtifacts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/runs/{runId}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request cancellation without deleting evidence
         * @description No request body. CREATED or VALIDATING is aborted synchronously before dispatch and returns 200. PROVISIONING or a later active state enters CANCELLING and returns 202. Repeated CANCELLING returns 202 without mutation; already ABORTED returns 200 without mutation; any other terminal state returns 409 RUN_TERMINAL. Stop/cleanup after dispatch is asynchronous, so 202 does not mean execution has stopped.
         */
        post: operations["cancelRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/baselines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a baseline candidate from completed evidence
         * @description Creates one immutable baseline version in CANDIDATE. The authenticated actor is recorded by the server; it is never accepted from the body. A repeated ID/version returns 409 even when the body is identical; after an uncertain response, read the exact resource.
         */
        post: operations["createBaseline"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/baselines/{baselineId}/versions/{version}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                baselineId: components["schemas"]["ResourceId"];
                version: components["schemas"]["Version"];
            };
            cookie?: never;
        };
        /** Read one exact baseline version */
        get: operations["getBaseline"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/baselines/{baselineId}/versions/{version}/transitions": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                baselineId: components["schemas"]["ResourceId"];
                version: components["schemas"]["Version"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Apply one revision-checked baseline lifecycle decision
         * @description The server records the authenticated actor. Clients provide the observed revision, target state, reason and qualification evidence only when the transition requires it. Retrying after an uncertain response starts with GET of this exact version.
         */
        post: operations["transitionBaseline"];
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
        RunId: string;
        ResourceId: string;
        Version: string;
        Sha256: string;
        /** Format: date-time */
        Timestamp: string;
        Artifact: {
            /** Format: uuid */
            id: string;
            runId: components["schemas"]["RunId"];
            /** @enum {string} */
            kind: "raw" | "normalized";
            /** Format: uri */
            uri: string;
            sha256: string;
            sizeBytes: number;
            mediaType: string;
            format: string;
        };
        ArtifactCollection: {
            artifacts: components["schemas"]["Artifact"][];
        };
        Reference: {
            id: string;
            version: string;
            sha256: string;
        };
        Candidate: {
            gitSha: string;
            image: string;
        };
        CreateRun: {
            testSuite: string;
            catalogue: components["schemas"]["Reference"];
            /** @enum {string} */
            profile: "smoke" | "average" | "regression" | "stress" | "capacity" | "soak";
            candidate: components["schemas"]["Candidate"];
            environment: components["schemas"]["Reference"];
            policy: components["schemas"]["Reference"];
        };
        /** @enum {string} */
        RunState: "CREATED" | "VALIDATING" | "PROVISIONING" | "WARMING_UP" | "RUNNING" | "COLLECTING" | "ANALYZING" | "REPORTING" | "CANCELLING" | "COMPLETED" | "INVALID" | "ABORTED" | "INFRASTRUCTURE_FAILURE" | "TEST_FAILURE";
        Failure: {
            /** @enum {string} */
            code: "VALIDATION_FAILED" | "INFRASTRUCTURE_ERROR" | "PIPELINE_TIMEOUT" | "TOOL_ERROR" | "ANALYSIS_ERROR";
            message: string;
        };
        Run: {
            id: components["schemas"]["RunId"];
            state: components["schemas"]["RunState"];
            revision: number;
            request: components["schemas"]["CreateRun"];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            /** Format: date-time */
            finishedAt?: string;
            toolExitCode?: number;
            failure?: components["schemas"]["Failure"];
        } & (unknown & unknown);
        BaselineIdentity: {
            id: components["schemas"]["ResourceId"];
            version: components["schemas"]["Version"];
            sha256: components["schemas"]["Sha256"];
        };
        BaselineSoftware: {
            gitSha: string;
            image: string;
            version?: string;
        };
        BaselineEnvironment: {
            id: components["schemas"]["ResourceId"];
            version: components["schemas"]["Version"];
            sha256: components["schemas"]["Sha256"];
            fingerprint: components["schemas"]["Sha256"];
        };
        BaselineDataset: {
            /** @constant */
            kind: "none";
        } | {
            /** @constant */
            kind: "versioned";
            id: components["schemas"]["ResourceId"];
            version: components["schemas"]["Version"];
            sha256: components["schemas"]["Sha256"];
            seed: number;
        };
        PendingQualification: {
            /** @constant */
            status: "PENDING";
            reasons: string[];
        };
        PassedQualification: {
            /** @constant */
            status: "PASSED";
            reasons: string[];
            sampleCount: number;
            maximumCv: number;
        };
        FailedQualification: {
            /** @constant */
            status: "FAILED";
            reasons: string[];
            sampleCount?: number;
            maximumCv?: number;
        };
        BaselineQualification: components["schemas"]["PendingQualification"] | components["schemas"]["PassedQualification"] | components["schemas"]["FailedQualification"];
        /** @enum {string} */
        BaselineState: "CANDIDATE" | "QUALIFIED" | "APPROVED" | "RETIRED";
        BaselineEvent: {
            state: components["schemas"]["BaselineState"];
            at: components["schemas"]["Timestamp"];
            actor: string;
            reason: string;
        };
        Baseline: {
            /** @constant */
            schemaVersion: 1;
            /** @constant */
            kind: "PerformanceBaseline";
            id: components["schemas"]["ResourceId"];
            version: components["schemas"]["Version"];
            revision: number;
            state: components["schemas"]["BaselineState"];
            testId: components["schemas"]["ResourceId"];
            sourceRunId: components["schemas"]["RunId"];
            artifact: components["schemas"]["Artifact"] & {
                /** @constant */
                kind?: "normalized";
                /** @constant */
                mediaType?: "application/json";
                /** @constant */
                format?: "normalized-result/v1";
            };
            software: components["schemas"]["BaselineSoftware"];
            workload: components["schemas"]["BaselineIdentity"];
            environment: components["schemas"]["BaselineEnvironment"];
            dataset: components["schemas"]["BaselineDataset"];
            qualification: components["schemas"]["BaselineQualification"];
            createdAt: components["schemas"]["Timestamp"];
            lifecycle: components["schemas"]["BaselineEvent"][];
        };
        CreateBaseline: {
            id: components["schemas"]["ResourceId"];
            version: components["schemas"]["Version"];
            testId: components["schemas"]["ResourceId"];
            sourceRunId: components["schemas"]["RunId"];
            artifact: components["schemas"]["Artifact"] & {
                /** @constant */
                kind?: "normalized";
                /** @constant */
                mediaType?: "application/json";
                /** @constant */
                format?: "normalized-result/v1";
            };
            software: components["schemas"]["BaselineSoftware"];
            workload: components["schemas"]["BaselineIdentity"];
            environment: components["schemas"]["BaselineEnvironment"];
            dataset: components["schemas"]["BaselineDataset"];
            reason: string;
        };
        BaselineTransition: {
            expectedRevision: number;
            /** @constant */
            state: "QUALIFIED";
            qualification: components["schemas"]["PassedQualification"];
            reason: string;
        } | {
            expectedRevision: number;
            /** @constant */
            state: "APPROVED";
            reason: string;
        } | {
            expectedRevision: number;
            /** @constant */
            state: "RETIRED";
            qualification?: components["schemas"]["FailedQualification"];
            reason: string;
        };
        Error: {
            /** @enum {string} */
            code: "BAD_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "IDEMPOTENCY_CONFLICT" | "REQUEST_IN_PROGRESS" | "RUN_TERMINAL" | "BASELINE_EXISTS" | "REVISION_CONFLICT" | "BASELINE_TRANSITION_CONFLICT" | "VALIDATION_FAILED" | "RATE_LIMITED" | "INTERNAL_ERROR" | "UNAVAILABLE";
            message: string;
            /** Format: uuid */
            requestId: string;
            details?: {
                path: string;
                message: string;
            }[];
        };
    };
    responses: {
        /** @description Malformed JSON, duplicate object keys, invalid headers/path, or unsupported request body. */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "BAD_REQUEST";
                };
            };
        };
        /** @description Missing or invalid credentials. */
        Unauthenticated: {
            headers: {
                /** @description Bearer authentication challenge. */
                "WWW-Authenticate": string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "UNAUTHENTICATED";
                };
            };
        };
        /** @description Caller lacks permission for the requested operation or selected resources. */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "FORBIDDEN";
                };
            };
        };
        /** @description Resource is absent or not visible to this caller. */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "NOT_FOUND";
                };
            };
        };
        /** @description Request schema or synchronous resource validation failed; no mutation was committed. */
        ValidationFailed: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "VALIDATION_FAILED";
                };
            };
        };
        /** @description Rate limited; retry after the indicated delay. */
        RateLimited: {
            headers: {
                /** @description Retry delay in seconds. */
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "RATE_LIMITED";
                };
            };
        };
        /** @description Unexpected server error; recover an outcome-uncertain mutation using its documented read operation. */
        InternalError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "INTERNAL_ERROR";
                };
            };
        };
        /** @description Temporarily unavailable; retry after the indicated delay. */
        Unavailable: {
            headers: {
                /** @description Retry delay in seconds. */
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "UNAVAILABLE";
                };
            };
        };
        /** @description Key conflicts with another request or the identical request is still in progress. */
        IdempotencyConflict: {
            headers: {
                /** @description Required for REQUEST_IN_PROGRESS, absent for a payload conflict. */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @enum {unknown} */
                    code?: "IDEMPOTENCY_CONFLICT" | "REQUEST_IN_PROGRESS";
                };
            };
        };
        /** @description Request exceeds the 64 KiB UTF-8 body limit; code BAD_REQUEST. */
        RequestTooLarge: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "BAD_REQUEST";
                };
            };
        };
        /** @description Only application/json is accepted; code BAD_REQUEST. */
        UnsupportedMediaType: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "BAD_REQUEST";
                };
            };
        };
        /** @description The principal already owns this immutable baseline ID and version. */
        BaselineExists: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "BASELINE_EXISTS";
                };
            };
        };
        /** @description The observed revision is stale or the requested lifecycle edge is not allowed. */
        BaselineTransitionConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @enum {unknown} */
                    code?: "REVISION_CONFLICT" | "BASELINE_TRANSITION_CONFLICT";
                };
            };
        };
        /** @description Cancellation lost the race to another terminal state. */
        RunTerminal: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"] & {
                    /** @constant */
                    code?: "RUN_TERMINAL";
                };
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    createRun: {
        parameters: {
            query?: never;
            header: {
                /** @description Opaque client-generated key. Reuse for retries of the same parsed JSON request; use a new key for a new run. */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRun"];
            };
        };
        responses: {
            /** @description Durably accepted run. An idempotent replay returns the original 201 snapshot and headers; GET returns current state. */
            201: {
                headers: {
                    /** @description Relative URI of the accepted run. */
                    Location: string;
                    /** @description UTC expiration, at least 24 hours after original acceptance; unchanged on replay. */
                    "Idempotency-Key-Expires-At": string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"] & {
                        /** @constant */
                        state?: "CREATED";
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["IdempotencyConflict"];
            /** @description Request exceeds the 64 KiB UTF-8 body limit; code BAD_REQUEST. */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "BAD_REQUEST";
                    };
                };
            };
            /** @description Only application/json is accepted; code BAD_REQUEST. */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "BAD_REQUEST";
                    };
                };
            };
            422: components["responses"]["ValidationFailed"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    getRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current consistent snapshot; revision increases on each persisted mutation. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    listRunArtifacts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current artifact-reference snapshot for the visible run. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtifactCollection"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    cancelRun: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Server-generated run identity. */
                runId: components["schemas"]["RunId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Cancellation completed before dispatch, or the Run was already ABORTED; response state ABORTED. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"] & {
                        /** @constant */
                        state?: "ABORTED";
                    };
                };
            };
            /** @description Cancellation durably requested; response state CANCELLING. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Run"] & {
                        /** @constant */
                        state?: "CANCELLING";
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["RunTerminal"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    createBaseline: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateBaseline"];
            };
        };
        responses: {
            /** @description Baseline candidate created with revision one. */
            201: {
                headers: {
                    /** @description Relative URI of the created baseline version. */
                    Location: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Baseline"] & {
                        /** @constant */
                        state?: "CANDIDATE";
                        /** @constant */
                        revision?: 1;
                    };
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["BaselineExists"];
            413: components["responses"]["RequestTooLarge"];
            415: components["responses"]["UnsupportedMediaType"];
            422: components["responses"]["ValidationFailed"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    getBaseline: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                baselineId: components["schemas"]["ResourceId"];
                version: components["schemas"]["Version"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current consistent baseline snapshot. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Baseline"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
    transitionBaseline: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                baselineId: components["schemas"]["ResourceId"];
                version: components["schemas"]["Version"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BaselineTransition"];
            };
        };
        responses: {
            /** @description Transition committed and lifecycle event appended. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Baseline"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthenticated"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["BaselineTransitionConflict"];
            413: components["responses"]["RequestTooLarge"];
            415: components["responses"]["UnsupportedMediaType"];
            422: components["responses"]["ValidationFailed"];
            429: components["responses"]["RateLimited"];
            500: components["responses"]["InternalError"];
            503: components["responses"]["Unavailable"];
        };
    };
}
