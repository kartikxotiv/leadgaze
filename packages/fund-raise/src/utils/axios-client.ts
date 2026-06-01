import axios from 'axios';

// import { getAccessToken } from '../../web/utils/local-storage';

const FundRaiseApiClient = axios.create({
  baseURL: '/api/funds',
  withCredentials: true,
});

FundRaiseApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return request;
});

export default FundRaiseApiClient;
