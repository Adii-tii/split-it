import { configureStore, createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'userDetails',
  initialState: null,
  reducers: {
    setUser: (state, action) => action.payload,
    clearUser: () => null,
  }
});

export const { setUser, clearUser } = userSlice.actions;

export const store = configureStore({
  reducer: {
    userDetails: userSlice.reducer
  }
});
