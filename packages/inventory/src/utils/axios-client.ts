import axios from 'axios';

const InventoryApiClient = axios.create({
  baseURL: '/api/inventory',
  withCredentials: true,
});

InventoryApiClient.interceptors.request.use((request) => {
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return request;
});

export default InventoryApiClient;
