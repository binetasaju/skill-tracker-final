/**
 * A generic function to handle all requests to our Flask API.
 * This version can handle both JSON data and FormData for file uploads.
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT').
 * @param {string} url - The API endpoint URL (e.g., '/api/login').
 * @param {object|FormData} [data=null] - The data to send. Can be a JSON object or a FormData object.
 * @returns {Promise<object|null>} The JSON response from the server, or null if an error occurs.
 */
async function apiRequest(method, url, data = null) {
    try {
        const options = {
            method: method,
            headers: {}, // Headers will be set based on data type
        };

        // If data is a FormData object, let the browser set the Content-Type header automatically.
        // This is crucial for file uploads.
        if (data instanceof FormData) {
            options.body = data;
        } 
        // If data is a plain object, stringify it and set the Content-Type to application/json.
        else if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        // If the server response is not "OK" (e.g., status 401, 404, 500)
        if (!response.ok) {
            // Display the error message from the server and return null
            alert(responseData.error || `An unknown API error occurred. Status: ${response.status}`);
            return null;
        }

        return responseData;

    } catch (error) {
        // This catches network errors (e.g., server is down)
        console.error('API request failed:', error);
        alert('A network error occurred. Could not connect to the server. Please check the console for details.');
        return null;
    }
}

// Create a single API object with easy-to-use functions for our other JS files
const API = {
    // Authentication
    login: (email, password, role) => apiRequest('POST', '/api/login', { email, password, role }),
    register: (name, email, password, department, role) => apiRequest('POST', '/api/register', { name, email, password, department, role }),
    logout: () => apiRequest('POST', '/api/logout'),
    getCurrentUser: () => apiRequest('GET', '/api/current_user'),

    // Student functions
    // IMPORTANT: This now takes a FormData object
    addSkill: (formData) => apiRequest('POST', '/api/skills', formData),
    getMySkills: () => apiRequest('GET', '/api/skills'),

    // Faculty functions
    getAllSubmissions: () => apiRequest('GET', '/api/submissions'),
    updateSkillStatus: (skillId, status) => apiRequest('PUT', `/api/skills/${skillId}/status`, { status }),
    addFeedback: (skillId, feedback) => apiRequest('POST', `/api/skills/${skillId}/feedback`, { feedback }),
};

