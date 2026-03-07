import { useState, useEffect } from 'react'
import './App.css';
import NewBasket from './components/NewBasket'
import MyBaskets from './components/MyBaskets'

function App() {

  const [userToken, setUserToken] = useState<string | null>(null)
  const [baskets, setUserBaskets] = useState([])

  useEffect(() => {
    let token = localStorage.getItem('userToken') || null
    setUserToken(token);

    fetch("/api/web/baskets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token }),
    })
      .then(response => response.json())
      .then((data: { token: string, baskets: any }) => {
        localStorage.setItem("userToken", data.token);
        setUserToken(data.token);
        setUserBaskets(data.baskets);
      })
      .catch(err => {
        console.error("An error occurred", err);
      });

  }, []);

  return (
    <div className="App">
      <div className="component-container">
        <div className="new-basket-panel">
          <NewBasket />
        </div>
        <div className="my-baskets-panel">
          <MyBaskets baskets={baskets}/>
        </div>
      </div>
    </div>
  );
}

export default App;
