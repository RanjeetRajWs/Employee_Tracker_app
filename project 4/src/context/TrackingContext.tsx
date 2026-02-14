import { createContext, useEffect, useState, ReactNode } from 'react';
import { TrackingData } from '../types/electron';
import adminSyncService from '../services/adminSyncService';

type LocationData = {
  latitude: number;
  longitude: number;
  address?: string;
};

type TrackingContextType = {
  trackingData: TrackingData & { sessionStart: number };
  isClockedIn: boolean;
  isClocking: boolean;
  locationPermission: 'granted' | 'denied' | 'prompt';
  resetTracking: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  requestClockOut: (reason: string) => Promise<{ success: boolean; error?: string }>;
  openLocationSettings: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  clockInDetails: { time: number; address: string; location?: LocationData } | null;
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number; address?: string }>;
  isEarlyClockOutApproved: boolean;
  isClockOutRequestPending: boolean;
  lastSession: { 
    clockInTime: number; 
    clockInAddress: string; 
    clockOutTime: number; 
    clockOutAddress: string;
  } | null;
};

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [trackingData, setTrackingData] = useState<TrackingData & { sessionStart: number }>({
    workingTime: 0,
    idleTime: 0,
    isIdle: false,
    onBreak: false,
    sessionStart: Date.now(),
    isTrackingActive: true,
    breakInProgress: false,
    activityMetrics: {
      keyPresses: 0,
      mouseClicks: 0,
      mouseMovements: 0,
      mouseScrolls: 0,
    },
  });

  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    return localStorage.getItem('isClockedIn') === 'true';
  });
  const [isClocking, setIsClocking] = useState<boolean>(false);
  const [clockInDetails, setClockInDetails] = useState<{ time: number; address: string; location?: LocationData } | null>(() => {
    const saved = localStorage.getItem('clockInDetails');
    return saved ? JSON.parse(saved) : null;
  });
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isEarlyClockOutApproved, setIsEarlyClockOutApproved] = useState<boolean>(false);
  const [isClockOutRequestPending, setIsClockOutRequestPending] = useState<boolean>(false);
  const [lastSession, setLastSession] = useState<{ 
    clockInTime: number; 
    clockInAddress: string; 
    clockOutTime: number; 
    clockOutAddress: string;
  } | null>(() => {
    const saved = localStorage.getItem('last_shift');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Check initial permission status if supported
    console.log("🚀 ~ TrackingProvider ~ navigator:", navigator)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
        setLocationPermission(status.state as 'granted' | 'denied' | 'prompt');
        console.log('📍 Location Permission Status:', status.state);
        status.onchange = () => {
          console.log('📍 Location Permission Changed:', status.state);
          setLocationPermission(status.state as 'granted' | 'denied' | 'prompt');
        };
      }).catch(err => {
        console.warn('Permissions API not fully supported:', err);
      });
    }

    const checkAttendanceStatus = async () => {
      try {
        const result = await adminSyncService.getAttendanceStatus();
        if (result.success && result.data) {
          setIsClockedIn(result.data.isClockedIn);
          setIsEarlyClockOutApproved(!!result.data.isEarlyClockOutApproved);
          setIsClockOutRequestPending(!!result.data.isClockOutRequestPending);
          
          if (result.data.isClockedIn) {
            const serverClockInTime = result.data.clockInTime;
            if (serverClockInTime) {
              const details = {
                time: serverClockInTime,
                address: result.data.clockInLocation?.address || 'Location captured',
                location: result.data.clockInLocation
              };
              setClockInDetails(details);
              localStorage.setItem('clockInDetails', JSON.stringify(details));
            }
            localStorage.setItem('isClockedIn', 'true');
            if (window.electronAPI) {
              await window.electronAPI.setClockedIn(true);
            }
          }
          
          // If not clocked in, stop tracking and clear local session
          if (!result.data.isClockedIn) {
            if (window.electronAPI) {
              await window.electronAPI.setClockedIn(false);
              await window.electronAPI.stopTrackingOnly();
            }
            setTrackingData(prev => ({ ...prev, isTrackingActive: false }));
            setClockInDetails(null);
            setIsEarlyClockOutApproved(false);
            setIsClockOutRequestPending(false);
            localStorage.removeItem('isClockedIn');
            localStorage.removeItem('clockInDetails');
          }
        }
      } catch (error) {
        console.error('Failed to fetch attendance status:', error);
      }
    };

    checkAttendanceStatus();

    // Poll for status updates (approval) every 30 seconds if clocked in
    const intervalId = setInterval(() => {
      if (isClockedIn) {
        checkAttendanceStatus();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isClockedIn]);

  useEffect(() => {
    if (!window.electronAPI) return undefined;

    // Load initial tracking data from Electron
    const loadTrackingData = async () => {
      try {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.getTrackingData();
        if (data) {
          setTrackingData((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch (error) {
        console.error('Failed to load tracking data:', error);
      }
    };

    loadTrackingData();

    // Subscribe to tracking updates
    const unsubscribe = window.electronAPI.onTrackingUpdate?.((data: TrackingData) => {
      setTrackingData((prev) => ({
        ...prev,
        ...data,
      }));
    });

    // Fallback activity listeners removed - Main process handles global tracking
    // const handleKeyDown = () => window.electronAPI?.trackKeyPress?.();
    // const handleMouseDown = () => window.electronAPI?.trackMouseClick?.();
    // const handleWheel = () => window.electronAPI?.trackMouseScroll?.();

    // window.addEventListener('keydown', handleKeyDown);
    // window.addEventListener('mousedown', handleMouseDown);
    // window.addEventListener('wheel', handleWheel);

    const unsubscribeClockOut = window.electronAPI.onRemoteClockOut?.(() => {
      console.log('🕒 Remote clock-out triggered from Admin Dashboard');
      clockOut();
    });

    const unsubscribeClockIn = window.electronAPI.onRemoteClockIn?.(() => {
      console.log('🕒 Remote clock-in triggered from Admin Dashboard');
      clockIn();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeClockOut === 'function') unsubscribeClockOut();
      if (typeof unsubscribeClockIn === 'function') unsubscribeClockIn();
      // window.removeEventListener('keydown', handleKeyDown);
      // window.removeEventListener('mousedown', handleMouseDown);
      // window.removeEventListener('wheel', handleWheel);
    };
  }, [isClockedIn, clockInDetails]); // Added dependencies to ensure clockOut has access to latest state

  const resetTracking = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.resetTracking();
        // Reset local state
        setTrackingData({
          workingTime: 0,
          idleTime: 0,
          isIdle: false,
          onBreak: false,
          sessionStart: Date.now(),
          isTrackingActive: true,
          breakInProgress: false,
          activityMetrics: {
            keyPresses: 0,
            mouseClicks: 0,
            mouseMovements: 0,
            mouseScrolls: 0,
          },
        });
      }
    } catch (error) {
      console.error('Failed to reset tracking:', error);
    }
  };

  const startTracking = async () => {
    if (!isClockedIn) {
      alert('Please clock in before starting tracking.');
      return;
    }
    try {
      if (window.electronAPI) {
        await window.electronAPI.startTrackingOnly();
        setTrackingData((prev) => ({ ...prev, isTrackingActive: true }));
      }
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const stopTracking = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.stopTrackingOnly();
        setTrackingData((prev) => ({ ...prev, isTrackingActive: false }));
      }
    } catch (error) {
      console.error('Failed to stop tracking:', error);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation is not supported by this app.');
        alert(error.message);
        reject(error);
        return;
      }

      // If we are even attempting this, we should assume we might have permission
      // and let the actual OS prompt decide.
      if (locationPermission === 'denied') {
        console.log('🔄 Attempting location despite "denied" status check...');
      }



      console.log('🔄 Seeking location (One-Shot)...');
      
      console.log('🔄 Seeking location (One-Shot with detailed logging)...');
      
      console.log('🔄 Seeking location (One-Shot with detailed logging)...');
      
      let isResolved = false;

      // Success Handler
      const handleSuccess = (pos: GeolocationPosition, type: string) => {
        if (isResolved) return;
        isResolved = true;
        console.log(`✅ [Location] Success (${type})! Accuracy: ${pos.coords.accuracy.toFixed(1)}m`);
        setLocationPermission('granted');
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      };

      // Error Handler - Returns true if the error is fatal/handled and we should stop trying
      const handleError = (error: GeolocationPositionError, step: string): boolean => {
          console.error(`❌ [Location] ${step} Error:`, error.code, error.message);
          
          if (error.code === error.PERMISSION_DENIED) {
            if (!isResolved) {
              isResolved = true;
              
              const showPermissionDialog = async () => {
                if (window.electronAPI) {
                  const result = await window.electronAPI.showMessageBox({
                    type: 'warning',
                    title: 'Permission Required',
                    message: 'Location access is required.',
                    detail: "Please enable Location Services for 'Employee Tracker' in System Settings > Privacy & Security.",
                    buttons: ['Open Settings', 'Cancel'],
                    defaultId: 0,
                    cancelId: 1
                  });
                  if (result.response === 0) {
                    openLocationSettings();
                  }
                } else {
                  if (window.confirm("Location permission denied. Open System Settings?")) {
                    openLocationSettings();
                  }
                }
                reject(new Error('Location permission denied by user or system.'));
              };
              
              showPermissionDialog();
            }
            return true; // Stop chain
          }
           
           if (error.code === error.POSITION_UNAVAILABLE) {
               console.warn(`⚠️ [Location] Position Unavailable during ${step}. checking fallback...`);
           }

           if (error.code === error.TIMEOUT) {
               console.warn(`⚠️ [Location] Timeout during ${step}. checking fallback...`);
           }

           return false; // Continue to next step
      };

      // Step 1: Try High Accuracy (Short timeout)
      console.log('📍 Attempting High Accuracy (GPS/Wi-Fi)...');
      navigator.geolocation.getCurrentPosition(
        (pos) => handleSuccess(pos, 'High Accuracy'),
        (err) => {
          if (handleError(err, 'High Accuracy')) return;
          
          console.log('⚠️ High Accuracy failed. Falling back to Low Accuracy (OS Default)...');
          
          // Step 2: Try Low Accuracy (Longer timeout)
          navigator.geolocation.getCurrentPosition(
            (pos) => handleSuccess(pos, 'Low Accuracy'),
            (err2) => {
              if (handleError(err2, 'Low Accuracy')) return;
              
              console.log('⚠️ Low Accuracy failed. Trying one last time with cached data...');
              
              // Step 3: Last ditch effort - allow cached data (any age)
              navigator.geolocation.getCurrentPosition(
                (pos) => handleSuccess(pos, 'Cached'),
                (err3) => {
                  if (!isResolved) {
                    isResolved = true;
                    const finalErrorMsg = `Unable to retrieve location (Error: ${err3.message || err2.message}).`;
                    const finalDetail = "Please ensure:\n1. Wi-Fi is turned ON (required for location)\n2. Location Services are enabled for 'Employee Tracker' in System Settings > Privacy & Security";
                    
                    const showFailDialog = async () => {
                      if (window.electronAPI) {
                        await window.electronAPI.showMessageBox({
                          type: 'error',
                          title: 'Location Unavailable',
                          message: finalErrorMsg,
                          detail: finalDetail,
                          buttons: ['OK']
                        });
                      } else {
                        alert(finalErrorMsg + '\n\n' + finalDetail);
                      }
                      reject(new Error(finalErrorMsg));
                    };
                    
                    showFailDialog();
                  }
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: Infinity }
              );
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
          );

        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      console.log('🗣️ Explicitly requesting location permission...');
      
      // If we are currently in a denied state, try to reset overrides first 
      // in case the user wants to try again.
      if (locationPermission === 'denied' && window.electronAPI?.resetLocationPermissions) {
        console.log('📍 State is denied, attempting to reset permission overrides in main process...');
        await window.electronAPI.resetLocationPermissions();
      }

      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.error('❌ Geolocation not supported');
          resolve(false);
          return;
        }

        // We use a timeout to detect if the prompt is being ignored/blocked
        const timeoutId = window.setTimeout(() => {
          console.warn('⚠️ Location request timed out - the OS prompt might be blocked or ignored.');
        }, 10000);

        console.log('📍 Triggering navigator.geolocation.getCurrentPosition...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            window.clearTimeout(timeoutId);
            console.log('✅ Location permission granted!', pos.coords.accuracy);
            setLocationPermission('granted');
            resolve(true);
          },
          (error) => {
            window.clearTimeout(timeoutId);
            console.warn('⚠️ Location permission rejected or failed:', error.code, error.message);
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermission('denied');
              if (window.confirm('Location permission was denied. Please enable it in your system settings to continue.\n\nOpen System Settings now?')) {
                openLocationSettings();
              }
            }
            resolve(false);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 0 
          }
        );
      });
    } catch (err) {
      console.error('Error requesting permission:', err);
      return false;
    }
  };

  const getReverseGeocoding = async (lat: number, lon: number): Promise<string> => {
    try {
      // Using Nominatim (OpenStreetMap) for free reverse geocoding
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'EmployeeTracker/1.0' // Proper UA for Nominatim
        }
      });
      if (!response.ok) throw new Error('Geocoding service failed');
      const data = await response.json();
      return data.display_name || 'Address not found';
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return 'Location captured (address unavailable)';
    }
  };

  const clockIn = async () => {
    setIsClocking(true);
    try {
      console.log('🔄 Starting clock-in process...');
      const location = await getCurrentLocation();
      console.log('📍 Location captured:', location);
      
      // Get address for the location record
      const address = await getReverseGeocoding(location.latitude, location.longitude);
      console.log('🏠 Address resolved:', address);

      const result = await adminSyncService.clockIn({
        ...location,
        address
      });

      if (result.success) {
        setIsClockedIn(true);
        const now = Date.now();
        const details = {
          time: now,
          address: address,
          location: { ...location, address }
        };
        setClockInDetails(details);
        localStorage.setItem('isClockedIn', 'true');
        localStorage.setItem('clockInDetails', JSON.stringify(details));
        
        if (window.electronAPI) {
          await window.electronAPI.setClockedIn(true);
        }

        console.log('✅ Clocked in successfully');
        

        // Show delay notification if applicable, BUT ONLY IF it's a fresh clock-in
        // This prevents the alert from showing if the user was already effectively clocked in
        // or if we are just syncing state.
        if (!isClockedIn && 'delayInfo' in result && result.delayInfo) {
          if (result.delayInfo.isDelayed) {
            alert(`⚠️ ${result.delayInfo.message}`);
          } else {
            console.log('✅ On-time clock-in:', result.delayInfo.message);
          }
        }
        
        // Automatically start tracking when clocked in
        if (window.electronAPI) {
          await window.electronAPI.startTrackingOnly();
          setTrackingData(prev => ({ ...prev, isTrackingActive: true }));
        }
      } else {
        alert('Failed to clock in: ' + result.error);
      }
    } catch (error) {
      console.error('Error during clock in:', error);
      // Detailed error is already alerted in getCurrentLocation
    } finally {
      setIsClocking(false);
    }
  };

  const clockOut = async () => {
    setIsClocking(true);
    try {
      console.log('🔄 Starting clock-out process...');
      const location = await getCurrentLocation();
      
      // Get address for the location record
      const address = await getReverseGeocoding(location.latitude, location.longitude);

      const result = await adminSyncService.clockOut({
        ...location,
        address
      });
      if (result.success) {
        const now = Date.now();
        if (window.electronAPI) {
          await window.electronAPI.stopTrackingOnly();
          setTrackingData(prev => ({ ...prev, isTrackingActive: false }));
        }

        // Store last session
        const session = {
          clockInTime: clockInDetails!.time,
          clockInAddress: clockInDetails!.address,
          clockOutTime: now,
          clockOutAddress: address
        };
        setLastSession(session);
        localStorage.setItem('last_shift', JSON.stringify(session));
        
        setIsClockedIn(false);
        setClockInDetails(null);
        setIsEarlyClockOutApproved(false);
        setIsClockOutRequestPending(false);
        localStorage.removeItem('isClockedIn');
        localStorage.removeItem('clockInDetails');
        if (window.electronAPI) {
          await window.electronAPI.setClockedIn(false);
        }
      } else {
        alert('Failed to clock out: ' + result.error);
      }
    } catch (error) {
      console.error('Error during clock out:', error);
    } finally {
      setIsClocking(false);
    }
  };

  const requestClockOut = async (reason: string): Promise<{ success: boolean; error?: string }> => {
    setIsClocking(true);
    try {
      if (!clockInDetails) {
        throw new Error('No clock-in details found');
      }

      console.log('🔄 Requesting early clock-out...');
      const location = await getCurrentLocation();
      const address = await getReverseGeocoding(location.latitude, location.longitude);
      
      const result = await adminSyncService.requestClockOut({
        clockInTime: clockInDetails.time,
        clockInLocation: clockInDetails.location,
        requestTime: Date.now(),
        requestLocation: { ...location, address },
        reason
      });

      if (result.success) {
        setIsClockOutRequestPending(true);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error during clock out request:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      setIsClocking(false);
    }
  };

  const openLocationSettings = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openLocationSettings();
    }
  };

  return (
    <TrackingContext.Provider
      value={{
        trackingData,
        isClockedIn,
        isClocking,
        locationPermission,
        resetTracking,
        startTracking,
        stopTracking,
        clockIn,
        clockOut,
        requestClockOut,
        openLocationSettings,
        requestLocationPermission,
        clockInDetails,
        getCurrentLocation,
        isEarlyClockOutApproved,
        isClockOutRequestPending,
        lastSession
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}

export default TrackingContext;
