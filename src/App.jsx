import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Methodology from './pages/Methodology.jsx'
import Certificate from './pages/Certificate.jsx'
import Verify from './pages/Verify.jsx'
import Legal from './pages/Legal.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/certificate" element={<Certificate />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/legal/:tab" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
