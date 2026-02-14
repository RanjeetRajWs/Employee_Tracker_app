/**
 * API Hook
 * Custom hook for API calls with loading and error states
 * @module hooks/useApi
 */

import { useState, useCallback } from 'react';
import { extractErrorMessage } from '../utils';

/**
 * Custom hook for API calls
 * @param {Function} apiFunction - API function to call
 * @returns {Object} API call function and state
 */
export const useApi = (apiFunction) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction(...args);
      setData(response.data);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
};

