import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { installSearchableSelects } from './lib/searchableSelect.js'

// Every dropdown gets a search box (see searchableSelect.js).
installSearchableSelects()

createRoot(document.getElementById('root')).render(<App />)
