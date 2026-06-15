export type InventoryApiResponse = {
  message?: string | null;
  error?: string | null;
  status?: number | string | boolean;
  statusCode?: number | string;
  success?: boolean;
};

export function isSuccessfulInventoryApiResponse(
  response: InventoryApiResponse,
) {
  return Boolean(
    response.success ||
      response.status === true ||
      response.statusCode === 200 ||
      response.status === 200,
  );
}

export function getInventoryApiResponseMessage(
  response: InventoryApiResponse,
) {
  return response.message || response.error || 'Request completed';
}
