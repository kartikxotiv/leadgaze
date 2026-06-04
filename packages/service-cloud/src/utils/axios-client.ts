import axios from 'axios';

const ServiceCloudApiClient = axios.create({
  baseURL: '/api/services',
  withCredentials: true,
});

ServiceCloudApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return request;
});

export default ServiceCloudApiClient;
