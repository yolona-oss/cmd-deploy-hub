import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import log from 'utils/logger'
import { IAPIClient } from 'api/types/client';

export class APIClient implements APIClient{
    private axiosInstance: AxiosInstance;

    constructor(
        private baseUrl: string,
        headers: { [key: string]: string }
    ) {
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        });

        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error) => {
                log.error(`API "${this.baseUrl}" Error:`, error.response?.data || error.message);
                return Promise.reject(error);
            }
        );
    }

    get BaseUrl() {
        return this.baseUrl
    }

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.axiosInstance.get<T>(url, config).then(response => response.data);
    }

    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.axiosInstance.post<T>(url, data, config).then(response => response.data);
    }

    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.axiosInstance.put<T>(url, data, config).then(response => response.data);
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.axiosInstance.delete<T>(url, config).then(response => response.data);
    }
}
