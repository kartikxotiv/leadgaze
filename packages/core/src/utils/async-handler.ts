/* eslint-disable @typescript-eslint/no-explicit-any */
export const asyncHandlerClient = (asyncFunction: any) => {
  return async (...args: any) => {
    try {
      return await asyncFunction(...args);
    } catch (err: any) {
      const errMessage =
        err?.response?.data?.message ||
        err.message ||
        'An unknown error occurred';

      throw {
        statusCode: err.statusCode || 500,
        status: false,
        success: false,
        message: errMessage,
      };
    }
  };
};

