export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export declare function apiRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown): Promise<ApiResponse<T>>;
export declare function testServiceEndpoint(url: string, params?: unknown): Promise<ApiResponse<unknown>>;
//# sourceMappingURL=api.d.ts.map