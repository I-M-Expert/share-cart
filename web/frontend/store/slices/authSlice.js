// src/store/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuthenticated: false,
    user: null, // or { id: '', name: '', email: '' } depending on your needs
    token: null,
    subscription: null,
  },
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.subscription = action.payload.subscription;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.subscription = null;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
