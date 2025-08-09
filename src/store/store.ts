import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import nodesReducer from './nodesSlice'

// Create storage that's compatible with Next.js SSR
const createNoopStorage = () => {
  return {
    getItem() {
      return Promise.resolve(null)
    },
    setItem(_key: string, value: unknown) {
      return Promise.resolve(value)
    },
    removeItem() {
      return Promise.resolve()
    },
  }
}

const storage = typeof window !== 'undefined' 
  ? (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('redux-persist/lib/storage').default
    })()
  : createNoopStorage()

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['nodes'] // Only persist the nodes slice
}

const rootReducer = combineReducers({
  nodes: nodesReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

