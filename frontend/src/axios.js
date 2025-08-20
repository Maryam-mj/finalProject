// src/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000", // Flask server
  withCredentials: true, // send cookies
});

export default api;
