const getAuthToken = () => localStorage.getItem('adminAuthToken');

const BASE_URL = import.meta.env.VITE_ADMIN_API_URL 
    ? import.meta.env.VITE_ADMIN_API_URL.replace('/admin', '/api/leaves') // Adjust based on server config
    : 'http://localhost:5000/api/leaves';

// Helper to handle response
const handleResponse = async (res: Response) => {
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Request failed');
    }
    return data;
};

export const leaveService = {
    getLeaveBalance: async () => {
        const token = getAuthToken();
        const res = await fetch(`${BASE_URL}/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleResponse(res);
    },

    getMyLeaves: async (filter: 'week' | 'month' | 'year' = 'year') => {
        const token = getAuthToken();
        const res = await fetch(`${BASE_URL}/my-leaves?filter=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleResponse(res);
    },

    applyLeave: async (formData: FormData) => {
        const token = getAuthToken();
        const res = await fetch(`${BASE_URL}/apply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return handleResponse(res);
    }
};
