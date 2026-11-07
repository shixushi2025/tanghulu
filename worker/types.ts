export type WorkerRoute = (context: { request: Request; url: URL; params: Record<string, string> }) => Response | Promise<Response>;
