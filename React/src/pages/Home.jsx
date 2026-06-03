import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div>
      <h1>hi whiteboard</h1>
      <button onClick={() => navigate('/test')}>test</button>
      <button onClick={() => navigate('/w52')}>w52</button>
      <button onClick={() => navigate('/icu')}>icu</button>
      <button onClick={() => navigate('/or')}>or</button>
      <button onClick={() => navigate('/er')}>er</button>
      <button onClick={() => navigate('/admin')}>管理後台</button>
    </div>
  )
}

export default Home
