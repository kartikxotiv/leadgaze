import axios from 'axios';

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
