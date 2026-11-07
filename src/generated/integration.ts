export interface paths {
    "/integration/v1/requests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["requestPerformanceRun"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/integration/v1/requests/{requestId}": {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        get: operations["getPerformanceRequest"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/integration/v1/requests/{requestId}/cancellation": {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cancelPerformanceRequest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/integration/v1/requests/{requestId}/analysis": {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        /** @description Requires authenticated principal and existing request-read permission. Returns retained immutable analysis; never materializes, executes or fetches artifact bytes. Request identity is scoped by issuer and principal, never by native Run ID. */
        get: operations["getPerformanceAnalysis"];
        put?: never;
        post?: never;
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
        Request: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Request"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.requested.v1";
            data: {
                context: components["schemas"]["Request"]["$defs"]["IntegrationRequestContext"];
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Request"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Request"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Request"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Request"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Request"]["$defs"]["timestamp"];
                    service: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Request"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Request"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Request"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        Accepted: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Accepted"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.accepted.v1";
            data: {
                context: components["schemas"]["Accepted"]["$defs"]["IntegrationRequestContext"];
                run: components["schemas"]["Accepted"]["$defs"]["IntegrationIdentity"];
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Accepted"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Accepted"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Accepted"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Accepted"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Accepted"]["$defs"]["timestamp"];
                    service: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Accepted"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        Rejected: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Rejected"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.rejected.v1";
            data: {
                context: components["schemas"]["Rejected"]["$defs"]["IntegrationRequestContext"];
                error: components["schemas"]["Rejected"]["$defs"]["IntegrationError"];
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Rejected"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Rejected"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Rejected"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Rejected"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Rejected"]["$defs"]["timestamp"];
                    service: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Rejected"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
                IntegrationError: {
                    /** @enum {string} */
                    code: "invalid_request" | "unauthenticated" | "forbidden" | "conflict" | "unknown_request" | "expired" | "unsupported_version" | "unsupported_revision" | "unavailable_reference" | "rate_limited" | "unavailable";
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    message: string;
                };
            };
        };
        Lifecycle: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Lifecycle"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.lifecycle.v1";
            data: {
                context: components["schemas"]["Lifecycle"]["$defs"]["IntegrationRequestContext"];
                run: components["schemas"]["Lifecycle"]["$defs"]["IntegrationIdentity"];
                /**
                 * lessThanOrEqualTo(9007199254740991)
                 * @description a number less than or equal to 9007199254740991
                 */
                revision: number;
                /** @enum {string} */
                state: "ACCEPTED" | "RUNNING" | "CANCELLING" | "COMPLETED" | "FAILED" | "CANCELLED";
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Lifecycle"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Lifecycle"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Lifecycle"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Lifecycle"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Lifecycle"]["$defs"]["timestamp"];
                    service: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Lifecycle"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        Cancellation: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Cancellation"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.cancel-requested.v1";
            data: {
                context: components["schemas"]["Cancellation"]["$defs"]["IntegrationRequestContext"];
                /** @enum {string} */
                reason: "user" | "superseded" | "deadline";
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Cancellation"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Cancellation"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Cancellation"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Cancellation"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Cancellation"]["$defs"]["timestamp"];
                    service: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Cancellation"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        Error: {
            /** @enum {string} */
            code: "invalid_request" | "unauthenticated" | "forbidden" | "conflict" | "unknown_request" | "expired" | "unsupported_version" | "unsupported_revision" | "unavailable_reference" | "rate_limited" | "unavailable";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            message: string;
            $defs: {
                IntegrationError: {
                    /** @enum {string} */
                    code: "invalid_request" | "unauthenticated" | "forbidden" | "conflict" | "unknown_request" | "expired" | "unsupported_version" | "unsupported_revision" | "unavailable_reference" | "rate_limited" | "unavailable";
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    message: string;
                };
            };
        };
        Cancelling: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Cancelling"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.lifecycle.v1";
            data: {
                context: components["schemas"]["Cancelling"]["$defs"]["IntegrationRequestContext"];
                run: components["schemas"]["Cancelling"]["$defs"]["IntegrationIdentity"];
                /**
                 * lessThanOrEqualTo(9007199254740991)
                 * @description a number less than or equal to 9007199254740991
                 */
                revision: number;
                /** @enum {string} */
                state: "CANCELLING";
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Cancelling"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Cancelling"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Cancelling"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Cancelling"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Cancelling"]["$defs"]["timestamp"];
                    service: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Cancelling"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        Terminal: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string matching the pattern \S
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            time: components["schemas"]["Terminal"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-integration/v1/performance-integration.schema.json";
            /** @enum {string} */
            type: "dev.perfeng.integration.lifecycle.v1";
            data: {
                context: components["schemas"]["Terminal"]["$defs"]["IntegrationRequestContext"];
                run: components["schemas"]["Terminal"]["$defs"]["IntegrationIdentity"];
                /**
                 * lessThanOrEqualTo(9007199254740991)
                 * @description a number less than or equal to 9007199254740991
                 */
                revision: number;
                /** @enum {string} */
                state: "COMPLETED" | "FAILED" | "CANCELLED";
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["Terminal"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["Terminal"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["Terminal"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["Terminal"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["Terminal"]["$defs"]["timestamp"];
                    service: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["Terminal"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
            };
        };
        AnalysisPublication: {
            /** @enum {string} */
            specversion: "1.0";
            /**
             * maxLength(256)
             * @description a string at most 256 character(s) long
             */
            id: string;
            /**
             * maxLength(512)
             * Format: uri
             * @description a string at most 512 character(s) long
             */
            source: string;
            /** @enum {string} */
            type: "dev.perfeng.integration.analysis-published.v1";
            time: components["schemas"]["AnalysisPublication"]["$defs"]["timestamp"];
            /** @enum {string} */
            datacontenttype: "application/json";
            /** @enum {string} */
            dataschema: "https://perfeng.dev/schemas/performance-analysis/v1/performance-analysis.schema.json";
            data: {
                context: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationRequestContext"];
                run: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationIdentity"];
                native: {
                    /** @description Reference to the run metadata */
                    runId: string;
                    testId: components["schemas"]["AnalysisPublication"]["$defs"]["id"];
                    workload: {
                        id: components["schemas"]["AnalysisPublication"]["$defs"]["id"];
                        version: components["schemas"]["AnalysisPublication"]["$defs"]["version"];
                        sha256: components["schemas"]["AnalysisPublication"]["$defs"]["sha256"];
                    };
                    policy: {
                        id: components["schemas"]["AnalysisPublication"]["$defs"]["id"];
                        version: components["schemas"]["AnalysisPublication"]["$defs"]["version"];
                        sha256: components["schemas"]["AnalysisPublication"]["$defs"]["sha256"];
                    };
                    baseline: {
                        identity: {
                            id: components["schemas"]["AnalysisPublication"]["$defs"]["id"];
                            version: components["schemas"]["AnalysisPublication"]["$defs"]["version"];
                            sha256: components["schemas"]["AnalysisPublication"]["$defs"]["sha256"];
                        };
                        artifact: {
                            /** Format: uuid */
                            id: string;
                            /** @description Reference to the run metadata */
                            runId: string;
                            /** @enum {string} */
                            kind: "normalized";
                            /**
                             * Format: uri
                             * @description a string matching the pattern ^(s3|https):\/\/[^\s?#]+$
                             */
                            uri: string;
                            sha256: components["schemas"]["AnalysisPublication"]["$defs"]["sha256"];
                            /**
                             * greaterThanOrEqualTo(0)
                             * @description a non-negative number
                             */
                            sizeBytes: number;
                            /** @enum {string} */
                            mediaType: "application/json";
                            /** @enum {string} */
                            format: "normalized-result/v1";
                        };
                    } | null;
                };
                artifact: {
                    /** Format: uuid */
                    id: string;
                    /** @description Reference to the run metadata */
                    runId: string;
                    /** @enum {string} */
                    kind: "analysis";
                    /**
                     * Format: uri
                     * @description a string matching the pattern ^(s3|https):\/\/[^\s?#]+$
                     */
                    uri: string;
                    sha256: components["schemas"]["AnalysisPublication"]["$defs"]["sha256"];
                    /**
                     * between(1, 1048576)
                     * @description a number between 1 and 1048576
                     */
                    sizeBytes: number;
                    /** @enum {string} */
                    mediaType: "application/json";
                    /** @enum {string} */
                    format: "analysis-result/v1";
                };
            };
            $defs: {
                /**
                 * Format: date-time
                 * @description a string matching the pattern ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$
                 */
                timestamp: string;
                IntegrationRequestContext: {
                    request: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationIdentity"];
                    attempt: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationIdentity"];
                    principal: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationIdentity"];
                    requestedAt: components["schemas"]["AnalysisPublication"]["$defs"]["timestamp"];
                    deadline: components["schemas"]["AnalysisPublication"]["$defs"]["timestamp"];
                    service: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    capability: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    deployment: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    environment: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    workload: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    profile: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    policy: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"];
                    baseline: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"] | null;
                    /**
                     * maxItems(32)
                     * @description an array of at most 32 item(s)
                     */
                    evidence: components["schemas"]["AnalysisPublication"]["$defs"]["IntegrationReference"][];
                    candidate: {
                        source: {
                            /** @enum {string} */
                            algorithm: "git-sha1";
                            /** @description a string matching the pattern ^[0-9a-f]{40}$ */
                            digest: string;
                        } | {
                            /** @enum {string} */
                            algorithm: "git-sha256";
                            /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                            digest: string;
                        };
                        /** @description a string matching the pattern ^sha256:[0-9a-f]{64}$ */
                        imageDigest: string;
                    };
                };
                IntegrationIdentity: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                };
                IntegrationReference: {
                    /**
                     * maxLength(512)
                     * Format: uri
                     * @description a string at most 512 character(s) long
                     */
                    issuer: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    id: string;
                    /**
                     * maxLength(256)
                     * @description a string matching the pattern \S
                     */
                    revision: string;
                    /** @description a string matching the pattern ^[0-9a-f]{64}$ */
                    sha256: string;
                };
                /** @description a string matching the pattern ^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$ */
                id: string;
                /** @description a string matching the pattern ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ */
                version: string;
                /** @description a string matching the pattern ^[a-f0-9]{64}$ */
                sha256: string;
            };
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    requestPerformanceRun: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Request"];
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Accepted"];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rejected */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Rejected"];
                };
            };
            /** @description Error */
            429: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            503: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getPerformanceRequest: {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Lifecycle */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Lifecycle"];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Rejected */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Rejected"];
                };
            };
            /** @description Error */
            429: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            503: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    cancelPerformanceRequest: {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Cancellation"];
            };
        };
        responses: {
            /** @description Terminal */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Terminal"];
                };
            };
            /** @description Cancelling */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Cancelling"];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            429: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description Error */
            503: {
                headers: {
                    /** @description Seconds before retry; preserve request identity and immutable context. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    getPerformanceAnalysis: {
        parameters: {
            query: {
                issuer: string;
            };
            header?: never;
            path: {
                requestId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description AnalysisPublication */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AnalysisPublication"];
                };
            };
            /** @description Error */
            400: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "invalid_request";
                    };
                };
            };
            /** @description Error */
            401: {
                headers: {
                    "Cache-Control": "no-store";
                    "WWW-Authenticate": "Bearer";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "unauthenticated";
                    };
                };
            };
            /** @description Error */
            403: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "forbidden";
                    };
                };
            };
            /** @description Unknown, invisible or not yet published */
            404: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "unknown_request";
                        /** @constant */
                        message?: "Not Found";
                    };
                };
            };
            /** @description Error */
            429: {
                headers: {
                    /** @description Seconds before retrying the same scoped read. */
                    "Retry-After": number;
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "rate_limited";
                    };
                };
            };
            /** @description Error */
            503: {
                headers: {
                    /** @description Seconds before retrying the same scoped read. */
                    "Retry-After": number;
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"] & {
                        /** @constant */
                        code?: "unavailable";
                    };
                };
            };
        };
    };
}
