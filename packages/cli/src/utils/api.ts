import axios, { AxiosError } from 'axios';
import { getRegistryApiUrl } from './config.js';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  const baseUrl = getRegistryApiUrl();
  const url = `${baseUrl}${path}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testServiceEndpoint(url: string, params?: unknown): Promise<ApiResponse<unknown>> {
  try {
    const response = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 402) {
        return {
          success: true,
          data: {
            status: 402,
            paymentRequired: true,
            paymentInfo: error.response.data,
          },
        };
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
