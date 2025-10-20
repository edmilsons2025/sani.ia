import axios from 'axios';

const API_URL = 'http://localhost:8001/api';

// Lote Service
export const getLotes = async () => {
    const response = await axios.get(`${API_URL}/lotes/`);
    return response.data;
};

export const createLote = async (loteName: string) => {
    const response = await axios.post(`${API_URL}/lotes/`, { name: loteName });
    return response.data;
};

export const updateLoteStatus = async (loteId: number, status: string) => {
    const response = await axios.put(`${API_URL}/lotes/${loteId}/status`, { status });
    return response.data;
};

// TestClass Service
export const getTestClasses = async () => {
    const response = await axios.get(`${API_URL}/test_classes/`);
    return response.data;
};

export const createTestClass = async (className: string) => {
    const response = await axios.post(`${API_URL}/test_classes/`, { name: className });
    return response.data;
};

export const createTestItem = async (testClassId: number, testItem: { name: string; description: string }) => {
    const response = await axios.post(`${API_URL}/test_classes/${testClassId}/test_items/`, testItem);
    return response.data;
};

export const deleteTestClass = async (testClassId: number) => {
    const response = await axios.delete(`${API_URL}/test_classes/${testClassId}`);
    return response.data;
};

export const deleteTestItem = async (testItemId: number) => {
    const response = await axios.delete(`${API_URL}/test_items/${testItemId}`);
    return response.data;
};

// TestResult Service
export const getTestResults = async () => {
    const response = await axios.get(`${API_URL}/test_results/`);
    return response.data;
};

export const createTestResult = async (loteId: number, testResult: any) => {
    const response = await axios.post(`${API_URL}/lotes/${loteId}/test_results/`, testResult);
    return response.data;
};
