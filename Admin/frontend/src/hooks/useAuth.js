/**
 * Authentication Hook
 * Custom hook for authentication operations
 * @module hooks/useAuth
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { adminLogin } from '../services/api';
import { extractErrorMessage } from '../utils';
import { ROUTES } from '../constants';

/**
 * Custom hook for authentication
 * @returns {Object} Auth methods and state
 */
export const useAuth = () => {
  const { login: contextLogin, logout: contextLogout, isAuthenticated, admin } = useAdmin();
  const navigate = useNavigate();

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  const login = useCallback(async (email, password) => {
    try {
      console.log("logging in");
      const response = await adminLogin(email, password);
      const { admin: adminData, token } = response.data;
      
      contextLogin(adminData, token);
      console.log("navigating to dashboard");
      navigate(ROUTES.DASHBOARD);
      
      return { success: true };
    } catch (error) {
      const message = extractErrorMessage(error);
      return { success: false, error: message };
    }
  }, [contextLogin, navigate]);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    contextLogout();
    navigate(ROUTES.LOGIN);
  }, [contextLogout, navigate]);

  return {
    login,
    logout,
    isAuthenticated,
    admin,
  };
};

