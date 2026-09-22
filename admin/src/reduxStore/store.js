import storage from "redux-persist/lib/storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import dynamicDataReducer from "./slice/dynamicDataSlice";
import settingReducer from "./slice/settingSlice";
import authReducer from "./slice/authSlice";
import usersReducer from "./slice/usersSlice";
import plansReducer from "./slice/plansSlice";
import rolesReducer from "./slice/rolesSlice";
import uiReducer from "./slice/uiSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage: storage,
};

const rootReducer = combineReducers({
  setting: settingReducer,
  data: dynamicDataReducer,
  auth: authReducer,
  users: usersReducer,
  plans: plansReducer,
  roles: rolesReducer,
  ui: uiReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const reduxStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export default reduxStore;
