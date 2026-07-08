import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UserAuthProvider } from './context/UserAuthContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import './styles/index.css';

// Every <input type="number"> defaults its display to "0" when its bound
// state is 0 — and since focusing a field doesn't select its content, typing
// inserts BEFORE that "0" instead of replacing it (e.g. typing "500" produces
// "0500"). Auto-selecting on focus makes the first keystroke replace the
// whole value instead, everywhere, including any future numeric field —
// this only changes what's pre-selected, not the value/validation behavior.
document.addEventListener('focusin', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
    e.target.select();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <UserAuthProvider>
            <WishlistProvider>
              <App />
              <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            </WishlistProvider>
          </UserAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
