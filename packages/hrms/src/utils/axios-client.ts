import axios from 'axios';

const HrmsApiClient = axios.create({
  baseURL: '/api/hrms',
  withCredentials: true,
});

HrmsApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return request;
});

export default HrmsApiClient;
