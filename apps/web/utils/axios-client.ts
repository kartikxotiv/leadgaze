// import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
// const ApiClient: AxiosInstance = axios.create({
//   baseURL: `/api`,
//   withCredentials: true,
// });
// ApiClient.interceptors.request.use((request: InternalAxiosRequestConfig) => {
//   const accessToken = localStorage.getItem('accessToken');
//   if (accessToken) {
//     request.headers.AuthToken = accessToken;
//   }
//   return request;
// });
// export default ApiClient;
import axios from 'axios';

// import { getAccessToken } from '../../web/utils/local-storage';

const ApiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

ApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return request;
});

export default ApiClient;
