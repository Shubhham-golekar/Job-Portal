import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MidnightProvider } from './context/MidnightContext'
import { ApplicationProvider } from './context/ApplicationContext'
import { ToastProvider } from './context/ToastContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MidnightProvider>
            <ApplicationProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </ApplicationProvider>
        </MidnightProvider>
    </React.StrictMode>,
)
