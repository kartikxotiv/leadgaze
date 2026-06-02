import axios from 'axios';

const CoreApiClient = axios.create({
  baseURL: '/api/core',
  withCredentials: true,
});

CoreApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) request.headers.Authorization = `Bearer ${accessToken}`;
  }

  return request;
});

export default CoreApiClient;

